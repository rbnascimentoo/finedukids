import { clearActiveUser } from "./session";
import { supabase } from "./supabase";

export type Role = "parent" | "child";

export type User = {
  id: string;
  name: string;
  email: string;
  password: string;     // MVP: plaintext (trocaremos no Supabase depois)
  role: Role;
  birthdate?: string;   // ISO "YYYY-MM-DD"
};

export type Session = { userId: string };

const USERS_KEY = "finedu_users";
const SESSION_KEY = "finedu_session";

/** ---------- storage helpers internos ---------- */
function readUsers(): User[] {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
function writeUsers(list: User[]) {
  localStorage.setItem(USERS_KEY, JSON.stringify(list));
}
function setSession(session: Session | null) {
  if (!session) localStorage.removeItem(SESSION_KEY);
  else localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  window.dispatchEvent(new CustomEvent("auth-updated"));
}

/** ---------- API de sessão ---------- */
export function getSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}
export function getCurrentUser(): User | null {
  const s = getSession();
  if (!s) return null;
  const u = readUsers().find((u) => u.id === s.userId) || null;
  return u;
}

/** ---------- API pública de usuários ---------- */
export function getAllUsers(): User[] {
  return [...readUsers()];
}
export function getUserById(id: string): User | null {
  return readUsers().find((u) => u.id === id) || null;
}

/** Atualiza nome, e-mail e/ou data de nascimento */
export function updateUser(params: {
  id: string;
  name?: string;
  email?: string;
  birthdate?: string; // ISO
}): { ok: boolean; error?: string; user?: User } {
  const users = readUsers();
  const idx = users.findIndex((u) => u.id === params.id);
  if (idx < 0) return { ok: false, error: "Usuário não encontrado." };

  // valida duplicidade de e-mail
  if (params.email) {
    const normalized = params.email.trim().toLowerCase();
    const exists = users.some(
      (u, i) => i !== idx && u.email.toLowerCase() === normalized
    );
    if (exists) return { ok: false, error: "Já existe uma conta com este e-mail." };
    users[idx].email = normalized;
  }

  if (typeof params.name === "string") {
    users[idx].name = params.name.trim();
  }
  if (typeof params.birthdate === "string" || params.birthdate === undefined) {
    users[idx].birthdate = params.birthdate;
  }

  writeUsers(users);
  // dispara evento para telas ouvirem
  window.dispatchEvent(new CustomEvent("auth-updated"));
  return { ok: true, user: users[idx] };
}

/** Opcional: troca de senha básica (para usar depois) */
export function changePassword(params: {
  id: string;
  oldPassword: string;
  newPassword: string;
}): { ok: boolean; error?: string } {
  const users = readUsers();
  const idx = users.findIndex((u) => u.id === params.id);
  if (idx < 0) return { ok: false, error: "Usuário não encontrado." };
  if (users[idx].password !== params.oldPassword) {
    return { ok: false, error: "Senha atual incorreta." };
  }
  if (params.newPassword.length < 6) {
    return { ok: false, error: "A nova senha deve ter pelo menos 6 caracteres." };
  }
  users[idx].password = params.newPassword;
  writeUsers(users);
  window.dispatchEvent(new CustomEvent("auth-updated"));
  return { ok: true };
}

/** ---------- Auth básica (MVP local) ---------- */
export function signUp(params: {
  name: string;
  email: string;
  password: string;
  role: Role;
  birthdate?: string; // ISO
}): { ok: boolean; error?: string; role?: Role } {
  const users = readUsers();
  const exists = users.some((u) => u.email.toLowerCase() === params.email.trim().toLowerCase());
  if (exists) return { ok: false, error: "Já existe uma conta com este e-mail." };

  const user: User = {
    id: crypto.randomUUID(),
    name: params.name.trim(),
    email: params.email.trim().toLowerCase(),
    password: params.password,
    role: params.role,
    birthdate: params.birthdate,
  };

  users.push(user);
  writeUsers(users);

  setSession({ userId: user.id });
  return { ok: true, role: user.role };
}

export function signIn(email: string, password: string): { ok: boolean; error?: string; role?: Role } {
  const users = readUsers();
  const user = users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
  if (!user) return { ok: false, error: "Usuário não encontrado." };
  if (user.password !== password) return { ok: false, error: "Senha inválida." };
  setSession({ userId: user.id });
  return { ok: true, role: user.role };
}

export async function signOut() {
  setSession(null);
  await supabase.auth.signOut();
  clearActiveUser();

}

export function onAuthChange(cb: () => void) {
  const h = () => cb();
  window.addEventListener("auth-updated", h as EventListener);
  window.addEventListener("storage", h as EventListener);
  return () => {
    window.removeEventListener("auth-updated", h as EventListener);
    window.removeEventListener("storage", h as EventListener);
  };
}
