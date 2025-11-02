// src/repos/supabase/TxRepoSupabase.ts
import type { TxRepo } from "../TxRepo";
import type { Tx } from "../../domain/models";
import { supabase } from "../../services/supabase";

/**
 * Implementação Supabase para TxRepo
 * Requer tabela `transactions` com colunas:
 * id (uuid), kid_id (uuid), type (text), amount (numeric), description (text), created_at (timestamptz)
 */
export class TxRepoSupabase implements TxRepo {
  private mapRow(r: any): Tx {
    return {
      id: r.id,
      kidId: r.kid_id,
      type: r.type,
      amount: Number(r.amount),
      description: r.description ?? undefined,
      createdAt: r.created_at,
    };
  }

  async listByKid(kidId: string): Promise<Tx[]> {
    if (!supabase) throw new Error("Supabase não configurado.");
    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .eq("kid_id", kidId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data || []).map((r) => this.mapRow(r));
  }

  async add(t: Omit<Tx, "id" | "createdAt">): Promise<Tx> {
    if (!supabase) throw new Error("Supabase não configurado.");
    const payload = {
      kid_id: t.kidId,
      type: t.type,
      amount: t.amount,
      description: t.description ?? null,
    };
    const { data, error } = await supabase.from("transactions").insert(payload).select("*").single();
    if (error) throw new Error(error.message);
    return this.mapRow(data);
  }
}
