import { BACKEND } from "../config/backend";
import { withFallback } from "./FallBack";

/** ---------- Interfaces ---------- */
import type { RewardsRepo } from "./RewardsRepo";
import type { KidsRepo } from "./KidsRepo";
import type { TxRepo } from "./TxRepo";
import type { AuthRepo } from "./AuthRepo";

/** ---------- Adapters Local ---------- */
import { RewardsRepoLocal } from "./local/RewardsRepoLocal";
// (crie estes quando quiser)
import { KidsRepoLocal } from "./local/KidsRepoLocal";
import { TxRepoLocal } from "./local/TxRepoLocal";
import { AuthRepoLocal } from "./local/AuthRepoLocal";

/** ---------- Adapters Supabase ---------- */
import { RewardsRepoSupabase } from "./supabase/RewardsRepoSupabase";
// (crie estes quando quiser)
import { KidsRepoSupabase } from "./supabase/KidsRepoSupabase";
import { TxRepoSupabase } from "./supabase/TxRepoSupabase";
import { AuthRepoSupabase } from "./supabase/AuthRepoSupabase";

import type { PrefsRepo, Prefs } from "./PrefsRepo";
import { PrefsRepoLocal } from "./local/PrefsRepoLocal";
import { PrefsRepoSupabase } from "./supabase/PrefsRepoSupabase";

/** ================================================
 *  Repos híbridos (métodos usam Fallback)
 *  ================================================*/

/** Rewards (exemplo completo já funcional) */
export const makeRewardsRepo = (): RewardsRepo => {
  const remote = new RewardsRepoSupabase();
  const local = new RewardsRepoLocal();

  return {
    async catalogForParent(parentId) {
      const { value } = await withFallback(
        () => remote.catalogForParent(parentId),
        () => local.catalogForParent(parentId),
        "rewards.catalogForParent"
      );
      return value;
    },

    async upsertCatalog(parentId, list) {
      const { source } = await withFallback(
        () => remote.upsertCatalog(parentId, list),
        () => local.upsertCatalog(parentId, list),
        "rewards.upsertCatalog"
      );
      // opcional: sync local após supabase salvar
      if (source === "supabase") await local.upsertCatalog(parentId, list).catch(() => {});
    },

    async redeem(kidId, reward) {
      const { value } = await withFallback(
        () => remote.redeem(kidId, reward),
        () => local.redeem(kidId, reward),
        "rewards.redeem"
      );
      return value;
    },

    async listRedemptions(kidId) {
      const { value } = await withFallback(
        () => remote.listRedemptions(kidId),
        () => local.listRedemptions(kidId),
        "rewards.listRedemptions"
      );
      return value;
    },
  };
};

/** Kids (ficará híbrido assim que você criar os adapters Supabase/Local) */
export const makeKidsRepo = (): KidsRepo => {
  if (BACKEND === "local") return new KidsRepoLocal();
  try {
    // versão híbrida
    const remote = new KidsRepoSupabase();
    const local = new KidsRepoLocal();
    return {
      listByParent: (parentId) =>
        withFallback(() => remote.listByParent(parentId), () => local.listByParent(parentId), "kids.listByParent").then(r => r.value),
      getById: (id) =>
        withFallback(() => remote.getById(id), () => local.getById(id), "kids.getById").then(r => r.value),
      getByUser: (userId) =>
        withFallback(() => remote.getByUser(userId), () => local.getByUser(userId), "kids.getByUser").then(r => r.value),
      create: (k) =>
        withFallback(() => remote.create(k), () => local.create(k), "kids.create").then(r => r.value),
      update: (id, patch) =>
        withFallback(() => remote.update(id, patch), () => local.update(id, patch), "kids.update").then(r => r.value),
      remove: (id) =>
        withFallback(() => remote.remove(id), () => local.remove(id), "kids.remove").then(r => r.value),
      creditMesada: (id) =>
        withFallback(() => remote.creditMesada(id), () => local.creditMesada(id), "kids.creditMesada").then(r => r.value),
    } as KidsRepo;
  } catch {
    // se não existirem ainda, fica no local
    return new KidsRepoLocal();
  }
};

/** Transações */
export const makeTxRepo = (): TxRepo => {
  if (BACKEND === "local") return new TxRepoLocal();
  try {
    const remote = new TxRepoSupabase();
    const local = new TxRepoLocal();
    return {
      listByKid: (kidId) =>
        withFallback(() => remote.listByKid(kidId), () => local.listByKid(kidId), "tx.listByKid").then(r => r.value),
      add: (t) =>
        withFallback(() => remote.add(t), () => local.add(t), "tx.add").then(r => r.value),
    } as TxRepo;
  } catch {
    return new TxRepoLocal();
  }
};

/** Auth (atenção: “fallback” em Auth é mais sensível) */
export const makeAuthRepo = (): AuthRepo => {
  // Estratégia: se supabase falhar/offline, usamos sessão local-only (para dev)
  try {
    const remote = new AuthRepoSupabase();
    const local = new AuthRepoLocal();
    return {
      getCurrentUser: () =>
        withFallback(() => remote.getCurrentUser(), () => local.getCurrentUser(), "auth.getCurrentUser").then(r => r.value),
      signIn: (email, password) =>
        withFallback(() => remote.signIn(email, password), () => local.signIn(email, password), "auth.signIn").then(r => r.value),
      signUp: (p) =>
        withFallback(() => remote.signUp(p), () => local.signUp(p), "auth.signUp").then(r => r.value),
      signOut: () =>
        withFallback(() => remote.signOut(), () => local.signOut(), "auth.signOut").then(r => r.value),
      updateUser: (p) =>
        withFallback(() => remote.updateUser(p), () => local.updateUser(p), "auth.updateUser").then(r => r.value),
    } as AuthRepo;
  } catch {
    return new AuthRepoLocal();
  }
};

export const makePrefsRepo = (): PrefsRepo => {
  const local = new PrefsRepoLocal();
  try {
    const remote = new PrefsRepoSupabase();
    return {
      get: (ownerId: string) =>
        withFallback(() => remote.get(ownerId), () => local.get(ownerId), "prefs.get").then(
          (r) => r.value
        ),
      set: (ownerId: string, prefs: Prefs) =>
        withFallback(() => remote.set(ownerId, prefs), () => local.set(ownerId, prefs), "prefs.set").then(
          (r) => r.value as any
        ),
    } as PrefsRepo;
  } catch {
    // se não houver adapter supabase por algum motivo, usa local
    return local;
  }
};