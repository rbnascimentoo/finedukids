// src/services/session.ts
export type Role = "parent" | "child";

const ACTIVE_UID_KEY = "finedu_active_uid";
const ACTIVE_ROLE_KEY = "finedu_active_role";

/** Liste aqui apenas chaves de cache que devem ser escopadas por usuário. */
const SCOPED_KEYS = [
  "finedu_kids",              // seus registros locais de crianças
  "finedu_kid_user_emails",   // mapa userId -> email (fallback)
  "finedu_tx",                // se tiver histórico local de transações
  // ...adicione outras se existir
];

/** Ao detectar troca de usuário, limpa caches para evitar “vazamento”. */
export function setActiveUser(uid: string, role: Role) {
  const prevUid = localStorage.getItem(ACTIVE_UID_KEY);
  if (prevUid && prevUid !== uid) {
    // limpando caches que não são por-usuário
    for (const k of SCOPED_KEYS) localStorage.removeItem(k);
  }
  localStorage.setItem(ACTIVE_UID_KEY, uid);
  localStorage.setItem(ACTIVE_ROLE_KEY, role);
}

export function clearActiveUser() {
  localStorage.removeItem(ACTIVE_UID_KEY);
  localStorage.removeItem(ACTIVE_ROLE_KEY);
}

/** Opcional: expõe para debug */
export function getActiveUser() {
  return {
    uid: localStorage.getItem(ACTIVE_UID_KEY),
    role: (localStorage.getItem(ACTIVE_ROLE_KEY) as Role | null),
  };
}
