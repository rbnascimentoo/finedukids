import type { AuthRepo } from "../AuthRepo";
import type { User, Role } from "../../domain/models";

/**
 * Persistência Local (MVP/Dev)
 * ---------------------------
 * - Usuários ficam em localStorage (com senha apenas para DEV)
 * - Sessão atual armazenada em localStorage
 *
 * ATENÇÃO: Senhas não são seguras no localStorage. Este adapter é
 * SOMENTE para desenvolvimento/offline. Em produção, use o adapter Supabase.
 */

/* ========================== Keys & Helpers ========================== */

const USERS_KEY = "finedu_users";           // armazena UserRow[]
const SESSION_KEY = "finedu_session";       // { userId: string }

type UserRow = User & {
  password?: string; // dev-only
};

type SessionRow = {
  userId: string;
};

function uuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return "usr_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function nowISO(): string {
  return new Date().toISOString();
}

function readUsers(): UserRow[] {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeUsers(list: UserRow[]) {
  localStorage.setItem(USERS_KEY, JSON.stringify(list));
  // notifica ouvintes (opcional)
  window.dispatchEvent(new CustomEvent("users-updated"));
}

function getSession(): SessionRow | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.userId === "string") return parsed;
    return null;
  } catch {
    return null;
  }
}

function setSession(userId: string) {
  const row: SessionRow = { userId };
  localStorage.setItem(SESSION_KEY, JSON.stringify(row));
  window.dispatchEvent(new CustomEvent("session-changed", { detail: { userId } }));
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY);
  window.dispatchEvent(new CustomEvent("session-changed", { detail: { userId: null } }));
}

function toPublicUser(u: UserRow | null): User | null {
  if (!u) return null;
  const { password, ...rest } = u;
  return rest;
}

function getUserByIdLocal(id: string): UserRow | null {
  const users = readUsers();
  return users.find((u) => u.id === id) || null;
}

function getUserByEmailLocal(email: string): UserRow | null {
  const users = readUsers();
  return users.find((u) => u.email.toLowerCase() === email.toLowerCase()) || null;
}

/* ========================== Implementação ========================== */

export class AuthRepoLocal implements AuthRepo {
  /** Retorna o usuário logado (ou null) */
  async getCurrentUser(): Promise<User | null> {
    const session = getSession();
    if (!session) return null;
    const user = getUserByIdLocal(session.userId);
    return toPublicUser(user);
  }

  /**
   * Login (email/senha) — DEV ONLY
   * - valida email/senha
   * - cria sessão local
   */
  async signIn(email: string, password: string): Promise<{ ok: boolean; error?: string; role?: Role }> {
    if (!email || !password) {
      return { ok: false, error: "Informe e-mail e senha." };
    }
    const user = getUserByEmailLocal(email);
    if (!user) return { ok: false, error: "Usuário não encontrado." };

    // DEV ONLY: senha em plain-text (não faça isso em produção)
    if ((user.password || "") !== password) {
      return { ok: false, error: "Senha inválida." };
    }

    setSession(user.id);
    return { ok: true, role: user.role };
  }

  /**
   * Cadastro (DEV)
   * - Garante e-mail único
   * - Cria usuário com senha (apenas para ambiente local)
   * - Já cria sessão ativa
   */
  async signUp(params: {
    name: string;
    email: string;
    password: string;
    role: Role;
    birthdate?: string;
  }): Promise<{ ok: boolean; error?: string; role?: Role }> {
    const { name, email, password, role, birthdate } = params;

    if (!name?.trim()) return { ok: false, error: "Informe seu nome." };
    if (!email?.trim()) return { ok: false, error: "Informe seu e-mail." };
    if (!password) return { ok: false, error: "Informe uma senha." };
    if (role !== "parent" && role !== "child") return { ok: false, error: "Papel inválido." };

    const exists = getUserByEmailLocal(email);
    if (exists) return { ok: false, error: "Já existe uma conta com este e-mail." };

    const users = readUsers();
    const user: UserRow = {
      id: uuid(),
      name: name.trim(),
      email: email.trim(),
      role,
      birthdate: birthdate || undefined, // ISO yyyy-mm-dd
      avatarUrl: null,
      createdAt: nowISO(),
      password, // DEV ONLY
    };

    writeUsers([user, ...users]);
    setSession(user.id);

    return { ok: true, role: user.role };
  }

  /** Logout — limpa sessão local */
  async signOut(): Promise<void> {
    clearSession();
  }

  /**
   * Atualiza dados do usuário logado (ou de um ID específico)
   * - Valida e-mail único se alterado
   */
  async updateUser(params: {
    id: string;
    name?: string;
    email?: string;
    birthdate?: string;
    avatarUrl?: string | null;
  }): Promise<{ ok: boolean; error?: string; user?: User }> {
    const { id, name, email, birthdate, avatarUrl } = params;
    const users = readUsers();
    const idx = users.findIndex((u) => u.id === id);
    if (idx < 0) return { ok: false, error: "Usuário não encontrado." };

    // Se e-mail mudou, validar unicidade
    if (email && email.trim().toLowerCase() !== users[idx].email.toLowerCase()) {
      const conflict = getUserByEmailLocal(email);
      if (conflict && conflict.id !== id) {
        return { ok: false, error: "Este e-mail já está em uso por outra conta." };
      }
    }

    const current = users[idx];
    const updated: UserRow = {
      ...current,
      name: name !== undefined ? name : current.name,
      email: email !== undefined ? email.trim() : current.email,
      birthdate: birthdate !== undefined ? (birthdate || undefined) : current.birthdate,
      avatarUrl: avatarUrl !== undefined ? avatarUrl : current.avatarUrl,
      // password permanece o mesmo (não há fluxo de troca de senha aqui)
    };
    users[idx] = updated;
    writeUsers(users);

    return { ok: true, user: toPublicUser(updated)! };
  }
}

/* ========================== (Opcional) Seeds ==========================
   criar contas de teste automaticamente em dev

(function seedDev() {
  const users = readUsers();
  if (users.length > 0) return;
  const demoParent: UserRow = {
    id: uuid(),
    name: "Responsável Demo",
    email: "pai@demo.com",
    role: "parent",
    birthdate: "1990-01-01",
    avatarUrl: null,
    createdAt: nowISO(),
    password: "123456",
  };
  const demoChild: UserRow = {
    id: uuid(),
    name: "Criança Demo",
    email: "kid@demo.com",
    role: "child",
    birthdate: "2014-06-15",
    avatarUrl: null,
    createdAt: nowISO(),
    password: "123456",
  };
  writeUsers([demoChild, demoParent]);
})();
*/
