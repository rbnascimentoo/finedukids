const LS_TX = "finedu_tx";
export const TXS_UPDATED_EVENT = "txs-updated";

export type TxType =
  | "mesada"
  | "gasto"
  | "meta"
  | "outro"
  | "redeem"
  | "extra"
  | "guardar"
  | "investir"
  | "recompensa";

export type Tx = {
  id: string;
  type: TxType;
  amount: number;
  description?: string;
  date: string;
  createdAt?: string;
};

function notifyTxs(detail?: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(TXS_UPDATED_EVENT, { detail }));
}

function readAll(): Record<string, Tx[]> {
  try {
    const raw = localStorage.getItem(LS_TX);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeAll(map: Record<string, Tx[]>, detail?: Record<string, unknown>) {
  localStorage.setItem(LS_TX, JSON.stringify(map));
  notifyTxs(detail);
}

function genId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function addTx(
  kidId: string,
  tx: Omit<Tx, "id" | "date"> & { date?: string },
): Tx {
  const all = readAll();
  const list = Array.isArray(all[kidId]) ? all[kidId] : [];

  const timestamp = tx.date || new Date().toISOString();
  const entry: Tx = {
    id: genId(),
    type: tx.type,
    amount: Number(tx.amount || 0),
    description: tx.description?.trim() || undefined,
    date: timestamp,
    createdAt: timestamp,
  };

  list.unshift(entry);
  all[kidId] = list;
  writeAll(all, { kidId });
  return entry;
}

export function getTxByKid(kidId: string): Tx[] {
  const all = readAll();
  const list = Array.isArray(all[kidId]) ? all[kidId] : [];
  return [...list].sort((a, b) =>
    b.date > a.date ? 1 : b.date < a.date ? -1 : 0,
  ).map((tx) => ({
    ...tx,
    createdAt: tx.createdAt ?? tx.date ?? new Date().toISOString(),
  }));
}

export function clearTxByKid(kidId: string): void {
  const all = readAll();
  if (kidId in all) {
    delete all[kidId];
    writeAll(all, { kidId });
  }
}

export function getTxInRange(kidId: string, days: number): Tx[] {
  const since = Date.now() - days * 24 * 60 * 60 * 1000;
  return getTxByKid(kidId).filter((t) => {
    const ts = Date.parse(t.date);
    return !Number.isNaN(ts) && ts >= since;
  });
}

export function getTotalsInRange(
  kidId: string,
  days: number,
): { total: number; byType: Record<TxType, number> } {
  const list = getTxInRange(kidId, days);
  const byType: Record<TxType, number> = {
    mesada: 0,
    gasto: 0,
    meta: 0,
    outro: 0,
    redeem: 0,
    extra: 0,
    guardar: 0,
    investir: 0,
    recompensa: 0,
  };
  let total = 0;
  for (const t of list) {
    const value = Number(t.amount || 0);
    total += value;
    if (t.type in byType) byType[t.type] += value;
    else byType.outro += value;
  }
  return { total, byType };
}
