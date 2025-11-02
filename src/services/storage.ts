import { supabase } from "./supabase";

export type Kid = {
  id: string;
  nome: string;
  avatar?: string | null;
  saldo: number;
  mesadaSemanal: number;
  parentId?: string | null;
  parent_id?: string | null;
  userId?: string | null;
  user_id?: string | null;
  lastAllowanceAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

const LS_KIDS = "finedu_kids";
const LS_QUEUE = "finedu_queue";

export const KIDS_UPDATED_EVENT = "kids-updated";

type QueueItem =
  | {
      kind: "kids.update_balance";
      kidId: string;
      parentId: string;
      newBalance: number;
      ts: number;
    }
  | { kind: "kids.mark_allowance"; kidId: string; whenISO: string; ts: number };

function readQueue(): QueueItem[] {
  try {
    return JSON.parse(localStorage.getItem(LS_QUEUE) || "[]");
  } catch {
    return [];
  }
}

export function enqueue(op: QueueItem) {
  const q = readQueue();
  q.push(op);
  localStorage.setItem(LS_QUEUE, JSON.stringify(q));
}

export function replaceQueue(q: QueueItem[]) {
  localStorage.setItem(LS_QUEUE, JSON.stringify(q));
}

function notifyKidsUpdated(detail?: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(KIDS_UPDATED_EVENT, { detail }));
}

function readKidsStore(): any[] {
  try {
    const raw = localStorage.getItem(LS_KIDS);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function serializeKid(kid: Kid): Record<string, unknown> {
  const parentId = kid.parentId ?? kid.parent_id ?? null;
  const userId = kid.userId ?? kid.user_id ?? null;
  return {
    id: kid.id,
    nome: kid.nome,
    name: kid.nome, // compat
    avatar: kid.avatar ?? null,
    saldo: Number(kid.saldo ?? 0),
    balance: Number(kid.saldo ?? 0),
    mesadaSemanal: Number(kid.mesadaSemanal ?? 0),
    weekly_allowance: Number(kid.mesadaSemanal ?? 0),
    parentId,
    parent_id: parentId,
    userId,
    user_id: userId,
    lastAllowanceAt: kid.lastAllowanceAt ?? null,
    last_allowance_at: kid.lastAllowanceAt ?? null,
    createdAt: kid.createdAt ?? null,
    created_at: kid.createdAt ?? null,
    updatedAt: kid.updatedAt ?? null,
    updated_at: kid.updatedAt ?? null,
  };
}

function writeKidsStore(list: Kid[]) {
  localStorage.setItem(
    LS_KIDS,
    JSON.stringify(list.map((k) => serializeKid(k))),
  );
  notifyKidsUpdated();
}

function mapToKid(raw: any): Kid {
  const parentId = raw?.parentId ?? raw?.parent_id ?? null;
  const userId = raw?.userId ?? raw?.user_id ?? null;
  return {
    id: String(raw?.id ?? ""),
    nome: raw?.nome ?? raw?.name ?? "",
    avatar: raw?.avatar ?? null,
    saldo: Number(raw?.saldo ?? raw?.balance ?? 0) || 0,
    mesadaSemanal:
      Number(raw?.mesadaSemanal ?? raw?.weekly_allowance ?? 0) || 0,
    parentId,
    parent_id: parentId,
    userId,
    user_id: userId,
    lastAllowanceAt: raw?.lastAllowanceAt ?? raw?.last_allowance_at ?? null,
    createdAt: raw?.createdAt ?? raw?.created_at ?? null,
    updatedAt: raw?.updatedAt ?? raw?.updated_at ?? null,
  };
}

function getAllLocalKids(): Kid[] {
  return readKidsStore().map(mapToKid);
}

function mergeKids(prefer: Kid[], fallback: Kid[]): Kid[] {
  const map = new Map<string, Kid>();
  fallback.forEach((k) => map.set(k.id, k));
  prefer.forEach((k) => map.set(k.id, k));
  return Array.from(map.values());
}

export async function getKidsByParent(parentId: string): Promise<Kid[]> {
  const local = getAllLocalKids().filter(
    (k) => (k.parentId ?? k.parent_id ?? null) === parentId,
  );

  try {
    const { data, error } = await supabase
      .from("kids")
      .select(
        "id,name,avatar,balance,weekly_allowance,parent_id,user_id,last_allowance_at,created_at,updated_at,deleted_at",
      )
      .eq("parent_id", parentId)
      .is("deleted_at", null);

    if (error) throw error;
    const remote =
      data
        ?.filter((row: any) => !row?.deleted_at)
        .map((row: any) => mapToKid(row)) ?? [];

    if (remote.length) {
      const others = getAllLocalKids().filter(
        (kid) => (kid.parentId ?? kid.parent_id ?? null) !== parentId,
      );
      writeKidsStore([...others, ...remote]);
    }

    return mergeKids(remote, local);
  } catch {
    return local;
  }
}

export function getKidsByUser(userId: string): Kid[] {
  if (!userId) return [];
  return getAllLocalKids().filter(
    (k) => (k.userId ?? k.user_id ?? null) === userId,
  );
}

export function getKidByUser(userId: string): Kid | null {
  return getKidsByUser(userId)[0] ?? null;
}

export function getKidById(kidId: string): Kid | null {
  if (!kidId) return null;
  return getAllLocalKids().find((k) => k.id === kidId) ?? null;
}

export function updateKid(id: string, patch: Partial<Kid>) {
  if (!id) return;
  const list = getAllLocalKids();
  const idx = list.findIndex((k) => k.id === id);
  if (idx === -1) return;

  const current = list[idx];
  const next: Kid = {
    ...current,
    ...patch,
    saldo:
      patch.saldo !== undefined
        ? Number(patch.saldo)
        : Number(current.saldo ?? 0),
    mesadaSemanal:
      patch.mesadaSemanal !== undefined
        ? Number(patch.mesadaSemanal)
        : Number(current.mesadaSemanal ?? 0),
    updatedAt: patch.updatedAt ?? new Date().toISOString(),
  };

  list[idx] = next;
  writeKidsStore(list);
}

export function creditMesadaLocal(kidId: string, value?: number) {
  if (!kidId) return;
  const list = getAllLocalKids();
  const idx = list.findIndex((k) => k.id === kidId);
  if (idx < 0) return;

  const kid = list[idx];
  const amount =
    value !== undefined ? Number(value) : Number(kid.mesadaSemanal ?? 0);
  if (!Number.isFinite(amount) || amount === 0) return;
  const newBalance = Number(kid.saldo ?? 0) + amount;
  list[idx] = { ...kid, saldo: Number(newBalance.toFixed(2)) };
  writeKidsStore(list);
}

export function markLastAllowanceLocal(kidId: string, whenISO: string) {
  if (!kidId) return;
  const list = getAllLocalKids();
  const idx = list.findIndex((k) => k.id === kidId);
  if (idx < 0) return;
  list[idx] = { ...list[idx], lastAllowanceAt: whenISO };
  writeKidsStore(list);
}

export async function creditMesada(kidId: string, parentId?: string) {
  const kid = getKidById(kidId);
  if (!kid) return;

  const weekly = Number(kid.mesadaSemanal ?? 0);
  if (!Number.isFinite(weekly) || weekly === 0) return;

  creditMesadaLocal(kidId, weekly);
  const newBalance = Number(getKidById(kidId)?.saldo ?? 0);

  if (parentId) {
    enqueue({
      kind: "kids.update_balance",
      kidId,
      parentId,
      newBalance: Number(newBalance.toFixed(2)),
      ts: Date.now(),
    });
  }
}

export async function deleteKid(id: string, parentId: string) {
  const remaining = getAllLocalKids().filter((k) => k.id !== id);
  writeKidsStore(remaining);

  try {
    await supabase
      .from("kids")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id)
      .eq("parent_id", parentId);
  } catch {
    // silent offline fallback
  }
}
