import { supabase } from "./supabase";

/**
 * Retorna o e-mail da criança vinculado a um registro de kid.
 * Prioriza o e-mail do usuário (quando a criança já tem conta),
 * caso contrário retorna o último e-mail convidado.
 */
export async function getChildEmailForKid(kidId: string): Promise<string | null> {
  if (!kidId) return null;

  try {
    const { data: kidRow, error } = await supabase
      .from("kids")
      .select("user_id")
      .eq("id", kidId)
      .maybeSingle();

    if (error) throw error;

    const userId = kidRow?.user_id ?? null;
    if (userId) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("email")
        .eq("id", userId)
        .maybeSingle();
      if (profile?.email) return profile.email as string;
    }

    const { data: invite } = await supabase
      .from("kid_invitations")
      .select("child_email,status")
      .eq("kid_id", kidId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    return (invite?.child_email as string) ?? null;
  } catch {
    return null;
  }
}
