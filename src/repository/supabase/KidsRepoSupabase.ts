// src/repos/supabase/KidsRepoSupabase.ts
import type { KidsRepo } from "../KidsRepo";
import type { Kid } from "../../domain/models";
import { supabase } from "../../services/supabase";

/**
 * Implementação Supabase para KidsRepo
 * Requer tabela `kids` com colunas:
 * id (uuid), parent_id (uuid), user_id (uuid?),
 * nome (text), avatar (text), saldo (numeric), mesada_semanal (numeric), created_at (timestamptz)
 */
export class KidsRepoSupabase implements KidsRepo {
  private mapRow(row: any): Kid {
    return {
      id: row.id,
      parentId: row.parent_id,
      userId: row.user_id ?? null,
      nome: row.nome,
      avatar: row.avatar ?? null,
      saldo: Number(row.saldo ?? 0),
      mesadaSemanal: Number(row.mesada_semanal ?? 0),
      createdAt: row.created_at ?? undefined,
    };
  }

  async listByParent(parentId: string): Promise<Kid[]> {
    if (!supabase) throw new Error("Supabase não configurado.");
    const { data, error } = await supabase
      .from("kids")
      .select("*")
      .eq("parent_id", parentId)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    return (data || []).map((r) => this.mapRow(r));
  }

  async getById(id: string): Promise<Kid | null> {
    if (!supabase) throw new Error("Supabase não configurado.");
    const { data, error } = await supabase.from("kids").select("*").eq("id", id).single();
    if (error) {
      // se não achar, error.code pode vir como "PGRST116"
      if (error.details?.includes("Results contain 0 rows")) return null;
      return null;
    }
    return data ? this.mapRow(data) : null;
  }

  async getByUser(userId: string): Promise<Kid | null> {
    if (!supabase) throw new Error("Supabase não configurado.");
    const { data, error } = await supabase.from("kids").select("*").eq("user_id", userId).single();
    if (error) return null;
    return data ? this.mapRow(data) : null;
  }

  async create(k: Omit<Kid, "id" | "createdAt">): Promise<Kid> {
    if (!supabase) throw new Error("Supabase não configurado.");
    const payload = {
      parent_id: k.parentId,
      user_id: k.userId ?? null,
      nome: k.nome,
      avatar: k.avatar ?? null,
      saldo: k.saldo ?? 0,
      mesada_semanal: k.mesadaSemanal ?? 0,
    };

    const { data, error } = await supabase.from("kids").insert(payload).select("*").single();
    if (error) throw new Error(error.message);
    return this.mapRow(data);
  }

  async update(id: string, patch: Partial<Kid>): Promise<void> {
    if (!supabase) throw new Error("Supabase não configurado.");
    const payload: any = {};
    if (patch.parentId !== undefined) payload.parent_id = patch.parentId;
    if (patch.userId !== undefined) payload.user_id = patch.userId;
    if (patch.nome !== undefined) payload.nome = patch.nome;
    if (patch.avatar !== undefined) payload.avatar = patch.avatar ?? null;
    if (patch.saldo !== undefined) payload.saldo = patch.saldo;
    if (patch.mesadaSemanal !== undefined) payload.mesada_semanal = patch.mesadaSemanal;

    const { error } = await supabase.from("kids").update(payload).eq("id", id);
    if (error) throw new Error(error.message);
  }

  async remove(id: string): Promise<void> {
    if (!supabase) throw new Error("Supabase não configurado.");
    const { error } = await supabase.from("kids").delete().eq("id", id);
    if (error) throw new Error(error.message);
  }

  /**
   * Credita a mesada semanal no saldo da criança e registra em `transactions` (type=mesada).
   * Dica: em produção, prefira uma RPC atômica para evitar condições de corrida.
   */
  async creditMesada(id: string): Promise<void> {
    if (!supabase) throw new Error("Supabase não configurado.");

    // 1) Buscar kid atual
    const { data: kid, error: eKid } = await supabase
      .from("kids")
      .select("id, saldo, mesada_semanal")
      .eq("id", id)
      .single();
    if (eKid) throw new Error(eKid.message);
    const saldo = Number(kid.saldo ?? 0);
    const mesada = Number(kid.mesada_semanal ?? 0);

    // 2) Atualizar saldo
    const newSaldo = Number((saldo + mesada).toFixed(2));
    const { error: eUpd } = await supabase
      .from("kids")
      .update({ saldo: newSaldo })
      .eq("id", id);
    if (eUpd) throw new Error(eUpd.message);

    // 3) Registrar transação
    const { error: eTx } = await supabase.from("transactions").insert({
      kid_id: id,
      type: "mesada",
      amount: mesada,
      description: "Crédito de mesada semanal",
    });
    if (eTx) throw new Error(eTx.message);
  }
}
