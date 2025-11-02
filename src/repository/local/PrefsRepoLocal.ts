// src/repos/local/PrefsRepoLocal.ts
import type { PrefsRepo, Prefs } from "../PrefsRepo";

const DEFAULT_PREFS: Prefs = {
  sound: true,
  notifications: true,
};

const KEY = (ownerId: string) => `finedu_prefs_${ownerId}`;

export class PrefsRepoLocal implements PrefsRepo {
  async get(ownerId: string): Promise<Prefs> {
    try {
      const raw = localStorage.getItem(KEY(ownerId));
      if (!raw) return DEFAULT_PREFS;
      const obj = JSON.parse(raw);
      return {
        sound: typeof obj.sound === "boolean" ? obj.sound : DEFAULT_PREFS.sound,
        notifications:
          typeof obj.notifications === "boolean"
            ? obj.notifications
            : DEFAULT_PREFS.notifications,
      };
    } catch {
      return DEFAULT_PREFS;
    }
  }

  async set(ownerId: string, prefs: Prefs): Promise<void> {
    localStorage.setItem(KEY(ownerId), JSON.stringify(prefs));
    window.dispatchEvent(new CustomEvent("prefs-changed", { detail: { ownerId, prefs } }));
  }
}
