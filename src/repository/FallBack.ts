import { BACKEND, HAS_SUPABASE } from "./../config/backend";
import { isOnline } from "./../utils/net";

export type Source = "supabase" | "local";
export type FallbackResult<T> = { value: T; source: Source; error?: any };

/**
 * Executa preferindo Supabase e cai para Local se:
 * - modo = "local"
 * - modo = "auto" e está offline
 * - supabase indisponível (sem credenciais) ou erro na execução
 */
export async function withFallback<T>(
  supabaseFn: (() => Promise<T>) | null,
  localFn: () => Promise<T>,
  label: string
): Promise<FallbackResult<T>> {
  const wantSupabase =
    BACKEND === "supabase" || (BACKEND === "auto" && isOnline() && HAS_SUPABASE && !!supabaseFn);

  if (wantSupabase && supabaseFn) {
    try {
      const value = await supabaseFn();
      return { value, source: "supabase" };
    } catch (err) {
      console.warn(`[fallback:${label}] supabase falhou, usando local.`, err);
      const value = await localFn();
      return { value, source: "local", error: err };
    }
  }

  // Local direto
  const value = await localFn();
  return { value, source: "local" };
}
