// src/services/invitations.ts
import { supabase } from "./supabase";

export type KidInvitation = {
  id: string;
  parent_id: string;
  kid_id: string;
  child_email: string;
  token: string;
  status: "pending" | "accepted" | "revoked" | "expired";
  created_at: string;
};

export async function createInvitation(
  parentId: string,
  kidId: string,
  childEmail: string
): Promise<{ ok: true; inviteId: string; token: string; url: string } | { ok: false; error: string }> {
  const email = (childEmail || "").trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return { ok: false, error: "E-mail inválido." };
  }

  const { data, error } = await supabase
    .from("kid_invitations")
    .insert({
      parent_id: parentId,
      kid_id: kidId,
      child_email: email,
    })
    .select("id, token")
    .single();

  if (error || !data) {
    return { ok: false, error: error?.message || "Falha ao criar convite." };
  }

  const token = data.token as string;
  const url = `${window.location.origin}/invite?token=${encodeURIComponent(token)}`;

  return { ok: true, inviteId: data.id as string, token, url };
}

export async function acceptInvitation(token: string) {
  const { data, error } = await supabase.rpc("accept_kid_invitation", { p_token: token });
  if (error) return { ok: false, error: error.message };
  if (!data?.ok) return { ok: false, error: data?.error || "Convite inválido." };
  return { ok: true };
}
