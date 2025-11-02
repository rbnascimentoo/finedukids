// services/autoAllowance.ts
import { getKidsByParent, creditMesada, enqueue, markLastAllowanceLocal, type Kid } from "./storage";
import { addTx } from "./tx";

/**
 * Regra: se passaram 7 dias desde lastAllowanceAt (ou nunca houve),
 * credita a mesadaSemanal localmente e enfileira atualização remota.
 */
export async function runWeeklyAutoAllowance(parentId: string): Promise<number> {
  const kids: Kid[] = await getKidsByParent(parentId);
  const now = new Date();
  let applied = 0;

  for (const k of kids) {
    const weekly = Number(k.mesadaSemanal || 0);
    if (weekly <= 0) continue;

    const last = k.lastAllowanceAt ? new Date(k.lastAllowanceAt) : null;
    const due =
      !last ||
      (now.getTime() - last.getTime()) >= 7 * 24 * 60 * 60 * 1000; // 7 dias

    if (!due) continue;

    // 1) credita (local + fila p/ balance)
    await creditMesada(k.id, (k.parent_id || k.parentId) as string);

    // 2) registra histórico local p/ relatórios
    addTx(k.id, {
      type: "mesada",
      amount: weekly,
      description: "Mesada automática semanal",
    });

    // 3) marca 'lastAllowanceAt' local e enfileira update remoto
    const whenISO = now.toISOString();
    markLastAllowanceLocal(k.id, whenISO);

    enqueue({
      kind: "kids.mark_allowance",
      kidId: k.id,
      whenISO,
      ts: Date.now(),
    });
    applied += 1;
  }
  return applied;
}

/**
 * Mant�m compatibilidade com chamada antiga usada no App.
 * Executa a verificação de mesada semanal e retorna a quantidade de crianças atualizada.
 */
export async function autoCreditOnAppOpen(parentId: string): Promise<number> {
  try {
    return await runWeeklyAutoAllowance(parentId);
  } catch {
    return 0;
  }
}
