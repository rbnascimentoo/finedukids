// src/repos/local/KidsRepoLocal.ts
import type { KidsRepo } from "../KidsRepo";
import type { Kid } from "../../domain/models";

/**
 * Persistência local em localStorage:
 * Key: `finedu_kids` -> Kid[]
 * 
 * OBS: Se você já tem `services/storage.ts` com funções utilitárias,
 * pode trocá-las aqui. Mantive self-contained para não gerar dependência circular.
 */

const KIDS_KEY = "finedu_kids";

function readKids(): Kid[] {
  try {
    const raw = localStorage.getItem(KIDS_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function writeKids(list: Kid[]) {
  localStorage.setItem(KIDS_KEY, JSON.stringify(list));
}

function uuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return "kid_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/** Helpers de transações locais (para registrar mesada) */
const TX_KEY = (kidId: string) => `finedu_tx_${kidId}`;
function addLocalTx(kidId: string, amount: number, description: string, type: "mesada" | "extra" | "redeem" = "mesada") {
  try {
    const raw = localStorage.getItem(TX_KEY(kidId));
    const list = raw ? JSON.parse(raw) : [];
    const tx = {
      id: uuid(),
      kidId,
      type,
      amount: Number(amount),
      description,
      createdAt: new Date().toISOString(),
    };
    const next = [tx, ...(Array.isArray(list) ? list : [])];
    localStorage.setItem(TX_KEY(kidId), JSON.stringify(next));
    window.dispatchEvent(new CustomEvent("tx-added", { detail: { kidId, tx } }));
  } catch {
    // ignore
  }
}

export class KidsRepoLocal implements KidsRepo {
  async listByParent(parentId: string): Promise<Kid[]> {
    return readKids().filter((k) => k.parentId === parentId);
  }

  async getById(id: string): Promise<Kid | null> {
    const k = readKids().find((x) => x.id === id);
    return k || null;
  }

  async getByUser(userId: string): Promise<Kid | null> {
    const k = readKids().find((x) => x.userId === userId);
    return k || null;
  }

  async create(k: Omit<Kid, "id" | "createdAt">): Promise<Kid> {
    const list = readKids();
    const kid: Kid = {
      id: uuid(),
      parentId: k.parentId,
      userId: k.userId ?? null,
      nome: k.nome,
      avatar: k.avatar ?? null,
      saldo: Number(k.saldo ?? 0),
      mesadaSemanal: Number(k.mesadaSemanal ?? 0),
      createdAt: new Date().toISOString(),
    };
    writeKids([kid, ...list]);
    window.dispatchEvent(new CustomEvent("kid-updated", { detail: { kidId: kid.id } }));
    return kid;
  }

  async update(id: string, patch: Partial<Kid>): Promise<void> {
    const list = readKids();
    const idx = list.findIndex((k) => k.id === id);
    if (idx < 0) return;
    const current = list[idx];
    const next: Kid = {
      ...current,
      parentId: patch.parentId !== undefined ? patch.parentId : current.parentId,
      userId: patch.userId !== undefined ? patch.userId : current.userId,
      nome: patch.nome !== undefined ? patch.nome : current.nome,
      avatar: patch.avatar !== undefined ? patch.avatar : current.avatar,
      saldo: patch.saldo !== undefined ? Number(patch.saldo) : current.saldo,
      mesadaSemanal:
        patch.mesadaSemanal !== undefined ? Number(patch.mesadaSemanal) : current.mesadaSemanal,
      createdAt: current.createdAt,
    };
    list[idx] = next;
    writeKids(list);
    window.dispatchEvent(new CustomEvent("kid-updated", { detail: { kidId: id } }));
  }

  async remove(id: string): Promise<void> {
    const list = readKids().filter((k) => k.id !== id);
    writeKids(list);
    window.dispatchEvent(new CustomEvent("kid-updated", { detail: { kidId: id } }));
  }

  /**
   * Credita a mesada semanal no saldo e registra uma transação local (type=mesada)
   */
  async creditMesada(id: string): Promise<void> {
    const list = readKids();
    const idx = list.findIndex((k) => k.id === id);
    if (idx < 0) throw new Error("Criança não encontrada.");
    const kid = list[idx];
    const novoSaldo = Number((Number(kid.saldo) + Number(kid.mesadaSemanal)).toFixed(2));
    list[idx] = { ...kid, saldo: novoSaldo };
    writeKids(list);

    // registra transação local
    if (kid.mesadaSemanal > 0) {
      addLocalTx(id, kid.mesadaSemanal, "Crédito de mesada semanal", "mesada");
    }

    window.dispatchEvent(new CustomEvent("kid-updated", { detail: { kidId: id } }));
  }
}
