export type Prefs = {
  sound: boolean;
  notifications: boolean;
};

export interface PrefsRepo {
  /** Lê preferências de um "owner" (kidId ou parentId) */
  get(ownerId: string): Promise<Prefs>;
  /** Salva preferências de um "owner" (kidId ou parentId) */
  set(ownerId: string, prefs: Prefs): Promise<void>;
}
