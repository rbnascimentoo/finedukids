import type { RewardsRepo } from "../RewardsRepo";
import type { Reward, Redemption } from "../../domain/models";
import { supabase } from "../../services/supabase";

/** Requer tabelas: rewards, redemptions, kids (schema que te passei). */
export class RewardsRepoSupabase implements RewardsRepo {
  async catalogForParent(parentId: string): Promise<Reward[]> {
    if (!supabase) throw new Error("Supabase não configurado.");
    const { data, error } = await supabase
      .from("rewards")
      .select("*")
      .eq("parent_id", parentId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data || []).map(r => ({
      id: r.id,
      parentId: r.parent_id,
      title: r.title,
      desc: r.desc,
      price: Number(r.price),
      tag: r.tag,
      createdAt: r.created_at,
    }));
  }

  async upsertCatalog(parentId: string, list: Reward[]): Promise<void> {
    if (!supabase) throw new Error("Supabase não configurado.");
    const payload = list.map(r => ({
      id: r.id,
      parent_id: parentId,
      title: r.title,
      desc: r.desc ?? null,
      price: r.price,
      tag: r.tag ?? null,
    }));
    const { error } = await supabase.from("rewards").upsert(payload);
    if (error) throw error;
  }

  async redeem(kidId: string, reward: Reward) {
    if (!supabase) throw new Error("Supabase não configurado.");

    // Debita saldo (ideal via RPC; aqui, simplificado)
    const { error: e1 } = await supabase
      .from("kids")
      .update({ saldo: (await this._currentSaldo(kidId)) - reward.price })
      .eq("id", kidId)
      .select("id")
      .single();
    if (e1) return { ok: false, error: e1.message };

    const { data, error } = await supabase
      .from("redemptions")
      .insert({
        kid_id: kidId,
        reward_id: reward.id,
        title: reward.title,
        price: reward.price,
        status: "approved",
      })
      .select()
      .single();
    if (error) return { ok: false, error: error.message };

    const redemption: Redemption = {
      id: data.id,
      kidId,
      rewardId: reward.id,
      title: reward.title,
      price: reward.price,
      status: "approved",
      createdAt: data.created_at,
    };
    return { ok: true, redemption };
  }

  async listRedemptions(kidId: string): Promise<Redemption[]> {
    if (!supabase) throw new Error("Supabase não configurado.");
    const { data, error } = await supabase
      .from("redemptions")
      .select("*")
      .eq("kid_id", kidId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data || []).map(d => ({
      id: d.id,
      kidId: d.kid_id,
      rewardId: d.reward_id,
      title: d.title,
      price: Number(d.price),
      status: d.status,
      createdAt: d.created_at,
    }));
  }

  private async _currentSaldo(kidId: string): Promise<number> {
    const { data, error } = await supabase!.from("kids").select("saldo").eq("id", kidId).single();
    if (error) throw error;
    return Number(data.saldo);
    // Dica: substitua tudo isso por uma RPC atômica
  }
}
