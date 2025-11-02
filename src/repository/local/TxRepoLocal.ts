// src/repos/local/TxRepoLocal.ts
import type { TxRepo } from "../TxRepo";
import type { Tx } from "../../domain/models";

/**
 * Persistência local em localStorage por criança:
 * Key: `finedu_tx_${kidId}` -> Tx[]
 */
const KEY = (kidId: string) => `finedu_tx_${kidId}`;

function readList(kidId: string): Tx[] {
  try {
    const raw = localStorage.getItem(KEY(kidId));
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr;
  } catch {
    return [];
  }
}

function writeList(kidId: string, list: Tx[]) {
  localStorage.setItem(KEY(kidId), JSON.stringify(list));
}

function uuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return "tx_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export class TxRepoLocal implements TxRepo {
  async listByKid(kidId: string): Promise<Tx[]> {
    const list = readList(kidId);
    // Ordena desc por createdAt (string ISO)
    return list.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }

  async add(t: Omit<Tx, "id" | "createdAt">): Promise<Tx> {
    const tx: Tx = {
      id: uuid(),
      kidId: t.kidId,
      type: t.type,
      amount: Number(t.amount),
      description: t.description,
      createdAt: new Date().toISOString(),
    };
    const list = readList(t.kidId);
    writeList(t.kidId, [tx, ...list]);
    // Dispara evento para quem quiser ouvir
    window.dispatchEvent(new CustomEvent("tx-added", { detail: { kidId: t.kidId, tx } }));
    return tx;
  }
}
