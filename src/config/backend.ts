export type BackendMode = "local" | "supabase" | "auto";

/** 
 * VITE_BACKEND:
 * - "local": força storage local
 * - "supabase": força remoto
 * - "auto" (default): tenta supabase se online e credenciais ok; cai pra local se falhar
 */
export const BACKEND: BackendMode = (import.meta.env.VITE_BACKEND as BackendMode) || "auto";

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

/** supabase credenciais presentes? */
export const HAS_SUPABASE = !!(SUPABASE_URL && SUPABASE_ANON_KEY);
