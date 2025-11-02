// src/pages/parent/KidDetail.tsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import BottomNavParent from "../../components/BottomNavParent";
import Modal from "../../components/Modal";
import { supabase } from "../../services/supabase";

import {
  getKidById,
  creditMesada as creditMesadaLocal,
  KIDS_UPDATED_EVENT,
  type Kid,
} from "../../services/storage";

import {
  getChildEmailForKid
} from "../../services/kids";

import { addTx, getTxByKid, type Tx, TXS_UPDATED_EVENT } from "../../services/tx";
import { AiOutlineArrowLeft, AiOutlineDollarCircle } from "react-icons/ai";

/** Converte linha do Supabase para modelo local */
function mapRowToKid(row: any): Kid {
  return {
    id: row.id,
    nome: row.name,
    avatar: row.avatar || undefined,
    saldo: Number(row.balance ?? 0),
    mesadaSemanal: Number(row.weekly_allowance ?? 20),
    parentId: row.parent_id ?? null,
    userId: row.user_id ?? null,
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString(),
  };
}

export default function KidDetail() {
  const nav = useNavigate();
  const { id } = useParams<{ id: string }>();

  useEffect(() => {
    document.body.setAttribute("data-role", "parent");
    return () => document.body.removeAttribute("data-role");
  }, []);

  const [parentId, setParentId] = useState<string>("");
  const [kid, setKid] = useState<Kid | null>(null);
  const [linkedEmail, setLinkedEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [txs, setTxs] = useState<Tx[]>([]);
  const saldoFmt = useMemo(() => (kid ? `R$ ${kid.saldo.toFixed(2)}` : "R$ 0,00"), [kid]);

  // Modal: extra
  const [openExtra, setOpenExtra] = useState(false);
  const [extraAmount, setExtraAmount] = useState<string>("10.00");
  const [extraDesc, setExtraDesc] = useState<string>("Crédito extra");
  const [extraSaving, setExtraSaving] = useState(false);
  const [extraError, setExtraError] = useState<string | null>(null);

  // Destaque no saldo ao creditar
  const [highlight, setHighlight] = useState(false);

  useEffect(() => {
    if (!id || id === "new") {
      setKid(null);
      setTxs([]);
      setLinkedEmail(null);
      setLoading(false);
      return;
    }
    let mounted = true;
    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const uid = data.session?.user?.id || "";
        if (!mounted) return;
        setParentId(uid);
        await fetchKid(id || "");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [id]);

  // Atualiza quando kids ou transações mudam
  useEffect(() => {
    const refresh = () => { if (parentId && id) void fetchKid(id); };
    window.addEventListener(KIDS_UPDATED_EVENT, refresh as EventListener);
    window.addEventListener(TXS_UPDATED_EVENT, refresh as EventListener);
    return () => {
      window.removeEventListener(KIDS_UPDATED_EVENT, refresh as EventListener);
      window.removeEventListener(TXS_UPDATED_EVENT, refresh as EventListener);
    };
  }, [parentId, id]);

  async function fetchKid(kidId: string) {
    if (!kidId) { setKid(null); setTxs([]); setLinkedEmail(null); return; }
    try {
      const { data, error } = await supabase.from("kids").select("*").eq("id", kidId).maybeSingle();
      if (error) throw error;
      setKid(data ? mapRowToKid(data) : getKidById(kidId));
    } catch {
      setKid(getKidById(kidId));
    }
    setTxs(getTxByKid(kidId));
    setLinkedEmail(await getChildEmailForKid(kidId));
  }

  async function onCreditMesada() {
    if (!kid) return;
    const valor = kid.mesadaSemanal || 0;
    creditMesadaLocal(kid.id);
    addTx(kid.id, { type: "mesada", amount: valor, description: "Crédito de mesada semanal" });
    setKid(prev => prev ? { ...prev, saldo: (prev.saldo || 0) + valor } : prev);
    setTxs(getTxByKid(kid.id));
    setHighlight(true); setTimeout(() => setHighlight(false), 900);

    try {
      await supabase.from("kids")
        .update({ balance: (kid.saldo + valor) })
        .eq("id", kid.id)
        .eq("parent_id", parentId);
    } catch { }
  }

  function openExtraModal() {
    setExtraAmount("10.00");
    setExtraDesc("Crédito extra");
    setExtraError(null);
    setOpenExtra(true);
  }

  async function onSaveExtra() {
    if (!kid) return;
    setExtraError(null);
    const num = parseFloat(String(extraAmount).replace(",", "."));
    if (isNaN(num) || num <= 0) return setExtraError("Informe um valor válido (maior que zero).");

    setExtraSaving(true);
    try {
      addTx(kid.id, { type: "mesada", amount: num, description: extraDesc?.trim() || "Crédito extra" });
      setKid((prev) => (prev ? { ...prev, saldo: prev.saldo + num } : prev));
      setTxs(getTxByKid(kid.id));
      setHighlight(true); setTimeout(() => setHighlight(false), 900);

      try {
        await supabase.from("kids")
          .update({ balance: (kid.saldo + num).toFixed(2) })
          .eq("id", kid.id).eq("parent_id", parentId);
      } catch { }

      setOpenExtra(false);
    } catch (e: any) {
      setExtraError(e?.message || "Falha inesperada ao creditar.");
    } finally {
      setExtraSaving(false);
    }
  }

  if (loading) {
    return skeleton("Carregando…", () => nav(-1));
  }
  if (!kid) {
    return skeleton("Criança não encontrada", () => nav(-1));
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] pb-24">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 shadow-sm sticky top-0">
        <div className="px-4 py-3 max-w-full md:max-w-[640px] mx-auto flex items-center gap-2">
          <button onClick={() => nav(-1)} className="p-1 rounded-lg hover:bg-gray-50">
            <AiOutlineArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-[17px] font-semibold text-gray-900">{kid.nome}</h1>
        </div>
      </header>

      {/* Conteúdo */}
      <main className="px-4 py-4 max-w-full md:max-w-[640px] mx-auto space-y-4">
        {/* Card principal */}
        <section className="bg-white border border-gray-100 rounded-2xl p-4">
          <div className="flex items-center gap-4">
            <img src={kid.avatar || "https://i.pravatar.cc/80"} alt={kid.nome} className="w-14 h-14 rounded-full object-cover" />
            <div className="flex-1">
              <p className="text-sm text-gray-500">Saldo</p>
              <p className={`text-2xl font-extrabold tabular-nums ${highlight ? "text-green-600 scale-[1.03]" : "text-blue-700"} transition-all`}>
                {saldoFmt}
              </p>
              <p className="text-xs text-gray-500">Mesada semanal: <b>R$ {kid.mesadaSemanal.toFixed(2)}</b></p>
              <p className="text-xs text-gray-500">
                {linkedEmail ? <>Conta vinculada: <b>{linkedEmail}</b></> : <span className="text-gray-400">Sem conta vinculada</span>}
              </p>
            </div>
          </div>

          {/* Ações rápidas */}
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button onClick={onCreditMesada} className="rounded-xl bg-white text-blue-700 font-semibold py-2 border border-blue-200 hover:bg-blue-50 flex items-center justify-center gap-2">
              <AiOutlineDollarCircle className="w-5 h-5" /> Mesada
            </button>
            <button onClick={openExtraModal} className="rounded-xl bg-white text-green-700 font-semibold py-2 border border-green-200 hover:bg-green-50 flex items-center justify-center gap-2">
              <AiOutlineDollarCircle className="w-5 h-5" /> Creditar extra
            </button>
          </div>
        </section>

        {/* Histórico */}
        <section>
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Histórico</h3>
          {txs.length === 0 ? (
            <div className="bg-white border border-gray-100 rounded-2xl p-5 text-center text-gray-600">
              Nenhuma movimentação registrada ainda.
            </div>
          ) : (
            <div className="space-y-2">
              {txs.slice().reverse().map((t) => (
                <div key={t.id} className="bg-white border border-gray-100 rounded-2xl p-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{labelTx(t.type)}</p>
                    {t.description && <p className="text-xs text-gray-500">{t.description}</p>}
                    {t.createdAt && <p className="text-xs text-gray-400 mt-0.5">{formatDateTime(t.createdAt)}</p>}
                  </div>
                  <div className="text-right">
                    <p className={`font-bold tabular-nums ${t.amount >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {t.amount >= 0 ? `+ R$ ${t.amount.toFixed(2)}` : `- R$ ${Math.abs(t.amount).toFixed(2)}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      <BottomNavParent />

      {/* Modal: Creditar extra */}
      <Modal
        open={openExtra}
        title={`Creditar extra • ${kid.nome}`}
        onClose={() => setOpenExtra(false)}
        footer={
          <div className="flex justify-end gap-2">
            <button onClick={() => setOpenExtra(false)} className="rounded-xl bg-white text-gray-700 font-semibold px-4 py-2 border border-gray-200 hover:bg-gray-50">
              Cancelar
            </button>
            <button onClick={onSaveExtra} disabled={extraSaving} className="rounded-xl bg-green-600 text-white font-semibold px-4 py-2 border border-green-600 hover:brightness-105 disabled:opacity-60">
              {extraSaving ? "Creditando…" : "Creditar"}
            </button>
          </div>
        }
      >
        <div className="space-y-3">
          {extraError && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{extraError}</div>}
          <div>
            <label className="block text-sm text-gray-700 mb-1">Valor (R$)</label>
            <input
              inputMode="decimal"
              pattern="[0-9]*[.,]?[0-9]*"
              placeholder="Ex.: 10,00"
              value={extraAmount}
              onChange={(e) => setExtraAmount(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-3 py-3 bg-white focus:outline-none focus:ring-2 focus:ring-green-200"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">Descrição (opcional)</label>
            <input
              placeholder="Ex.: bônus, presente, tarefa concluída…"
              value={extraDesc}
              onChange={(e) => setExtraDesc(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-3 py-3 bg-white focus:outline-none focus:ring-2 focus:ring-green-200"
            />
          </div>
          <p className="text-xs text-gray-500">O crédito será registrado imediatamente e sincronizado com a nuvem quando possível.</p>
        </div>
      </Modal>
    </div>
  );
}

/* -------- helpers -------- */
function skeleton(titulo: string, back: () => void) {
  return (
    <div className="min-h-screen bg-[var(--bg)] pb-24">
      <header className="bg-white border-b border-gray-100 shadow-sm sticky top-0">
        <div className="px-4 py-3 max-w-full md:max-w-[640px] mx-auto flex items-center gap-2">
          <button onClick={back} className="p-1 rounded-lg hover:bg-gray-50">
            <AiOutlineArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-[17px] font-semibold text-gray-900">{titulo}</h1>
        </div>
      </header>
      <BottomNavParent />
    </div>
  );
}

function labelTx(t: Tx["type"]) {
  switch (t) {
    case "mesada": return "Crédito de mesada";
    case "gasto": return "Gasto";
    case "guardar": return "Guardado";
    case "investir": return "Investimento";
    case "recompensa": return "Recompensa";
    default: return "Movimentação";
  }
}

function formatDateTime(iso?: string) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch { return iso; }
}
