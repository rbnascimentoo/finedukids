import type { Reward, Redemption } from "../domain/models";

export interface RewardsRepo {
  catalogForParent(parentId: string): Promise<Reward[]>;
  upsertCatalog(parentId: string, list: Reward[]): Promise<void>;
  redeem(kidId: string, reward: Reward): Promise<{ ok: boolean; error?: string; redemption?: Redemption }>;
  listRedemptions(kidId: string): Promise<Redemption[]>;
}
