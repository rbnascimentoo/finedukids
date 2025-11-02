import type { RewardsRepo } from "../RewardsRepo";
import type { Redemption, Reward } from "../../domain/models";
import {
  getCatalog as getLocalCatalog,
  readRedemptions as readLocalRedemptions,
  redeemReward as redeemLocalReward,
  writeCatalog as writeLocalCatalog,
} from "../../services/rewards";
import { getKidsByParent, type Kid } from "../../services/storage";

export class RewardsRepoLocal implements RewardsRepo {
  async catalogForParent(parentId: string): Promise<Reward[]> {
    return getLocalCatalog().map((reward) => ({ ...reward, parentId }));
  }

  async upsertCatalog(_parentId: string, list: Reward[]): Promise<void> {
    writeLocalCatalog(list);
  }

  async redeem(kidId: string, reward: Reward) {
    const familyKids: Kid[] = await getKidsByParent(reward.parentId);
    const kid = familyKids.find((k) => k.id === kidId);
    if (!kid) return { ok: false, error: "Criança não encontrada (local)." };
    return redeemLocalReward(kid, reward) as any;
  }

  async listRedemptions(kidId: string): Promise<Redemption[]> {
    return readLocalRedemptions(kidId) as any;
  }
}
