import { type Kid, updateKid } from "./storage";

/** Recompensas base (podem ser carregadas do backend depois) */
export type Reward = {
  id: string;
  title: string;
  desc?: string | null;
  price: number; // em R$
  tag?: "diversao" | "educacao" | "saude" | "custom" | null;
};

const DEFAULT_REWARDS: Reward[] = [
  { id: "rw1", title: "Tempo extra no videogame", desc: "30 minutos", price: 5, tag: "diversao" },
  { id: "rw2", title: "Escolher o filme da noite", desc: "Sessão em família", price: 8, tag: "diversao" },
  { id: "rw3", title: "Figurinha/skin no app", desc: "Colecionável digital", price: 3, tag: "diversao" },
  { id: "rw4", title: "Vale passeio no parque", desc: "Fim de semana", price: 12, tag: "saude" },
  { id: "rw5", title: "Livro novo", desc: "Escolha com um adulto", price: 20, tag: "educacao" },
  { id: "rw6", title: "Escolher a sobremesa", desc: "No jantar", price: 6, tag: "diversao" },
];

const REWARDS_KEY = "finedu_rewards_catalog";
const REDEEM_KEY = (kidId: string) => `finedu_rewards_redeemed_${kidId}`;

function readCatalog(): Reward[] {
  try {
    const raw = localStorage.getItem(REWARDS_KEY);
    if (!raw) return [...DEFAULT_REWARDS];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [...DEFAULT_REWARDS];
  } catch {
    return [...DEFAULT_REWARDS];
  }
}

export function writeCatalog(list: Reward[]) {
  localStorage.setItem(REWARDS_KEY, JSON.stringify(list));
}

export function getCatalog(): Reward[] {
  return readCatalog();
}

export type Redemption = {
  id: string;
  rewardId: string;
  title: string;
  price: number;
  at: string; // ISO
};

export function readRedemptions(kidId: string): Redemption[] {
  try {
    const raw = localStorage.getItem(REDEEM_KEY(kidId));
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function writeRedemptions(kidId: string, list: Redemption[]) {
  localStorage.setItem(REDEEM_KEY(kidId), JSON.stringify(list));
}

/** Tenta resgatar uma recompensa; debita do saldo do Kid */
export function redeemReward(
  kid: Kid,
  reward: Reward,
): { ok: boolean; error?: string; redemption?: Redemption } {
  if (kid.saldo < reward.price) {
    return { ok: false, error: "Saldo insuficiente para esta recompensa." };
  }
  const newSaldo = Number((kid.saldo - reward.price).toFixed(2));
  updateKid(kid.id, { saldo: newSaldo });

  const redemption: Redemption = {
    id: crypto.randomUUID(),
    rewardId: reward.id,
    title: reward.title,
    price: reward.price,
    at: new Date().toISOString(),
  };

  const list = readRedemptions(kid.id);
  writeRedemptions(kid.id, [redemption, ...list]);

  // evento para telas ouvirem
  window.dispatchEvent(
    new CustomEvent("kid-redeemed", { detail: { kidId: kid.id, redemption } }),
  );
  return { ok: true, redemption };
}
