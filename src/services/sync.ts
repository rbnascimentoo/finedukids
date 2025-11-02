// services/sync.ts
import { supabase } from "./supabase";

const LS_QUEUE = "finedu_queue";

type QueueItem =
  | { kind: "kids.update_balance"; kidId: string; parentId: string; newBalance: number; ts: number }
  | { kind: "kids.mark_allowance"; kidId: string; whenISO: string; ts: number };

function readQueue(): QueueItem[] {
  try { return JSON.parse(localStorage.getItem(LS_QUEUE) || "[]"); } catch { return []; }
}
function writeQueue(q: QueueItem[]) {
  localStorage.setItem(LS_QUEUE, JSON.stringify(q));
}

export async function processQueue() {
  const q = readQueue();
  if (!q.length) return;

  const remaining: QueueItem[] = [];
  for (const item of q) {
    try {
      if (item.kind === "kids.update_balance") {
        const { error } = await supabase
          .from("kids")
          .update({ balance: item.newBalance })
          .eq("id", item.kidId)
          .eq("parent_id", item.parentId);
        if (error) throw error;
      } else if (item.kind === "kids.mark_allowance") {
        const { error } = await supabase
          .from("kids")
          .update({ last_allowance_at: item.whenISO })
          .eq("id", item.kidId);
        if (error) throw error;
      }
      // sucesso → não volta p/ fila
    } catch {
      // falhou → mantém na fila para próxima tentativa
      remaining.push(item);
    }
  }
  writeQueue(remaining);
}

export function installOnlineSync() {
  // sincroniza quando ficar online
  window.addEventListener("online", () => {
    processQueue();
  });
}
