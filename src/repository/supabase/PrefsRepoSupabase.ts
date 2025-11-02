// src/repos/supabase/PrefsRepoSupabase.ts
import type { PrefsRepo, Prefs } from "../PrefsRepo";
import { supabase } from "../../services/supabase";

const DEFAULT_PREFS: Prefs = { sound: true, notifications: true };

export class PrefsRepoSupabase implements PrefsRepo {
  async get(ownerId: string): Promise<Prefs> {
    if (!supabase) throw new Error("Supabase não configurado.");
    const { data, error } = await supabase
      .from("prefs")
      .select("sound, notifications")
      .eq("owner_id", ownerId)
      .single();

    if (error) {
      // Se não existir registro, devolve default (não lança)
      return DEFAULT_PREFS;
    }
    return {
      sound: typeof data?.sound === "boolean" ? data.sound : DEFAULT_PREFS.sound,
      notifications:
        typeof data?.notifications === "boolean"
          ? data.notifications
          : DEFAULT_PREFS.notifications,
    };
  }

  async set(ownerId: string, prefs: Prefs): Promise<void> {
    if (!supabase) throw new Error("Supabase não configurado.");
    const payload = {
      owner_id: ownerId,
      sound: !!prefs.sound,
      notifications: !!prefs.notifications,
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase.from("prefs").upsert(payload); // upsert por PK
    if (error) throw new Error(error.message);
  }
}
