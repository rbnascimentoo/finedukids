// src/pages/parent/Progress.tsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import BottomNavParent from "../../components/BottomNavParent";
import { supabase } from "../../services/supabase";

import { type Kid, getKidsByParent } from "../../services/storage";
import { getTxByKid, type Tx, type TxType } from "../../services/tx";

/* ------------------ helpers de mapeamento/formatos ------------------ */

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

type Totais = {
  mesada: number;
  gasto: number;
  guardar: number;
  investir: number;
  recompensa: number;
};


function somaPorTipo(txs: Tx[]): Totais {
  const base: Totais = { mesada: 0, gasto: 0, guardar: 0, investir: 0, recompensa: 0 };
  for (const t of txs) {
    if (t.type === "gasto") base.gasto += Math.abs(t.amount);
    else if (t.type in base) (base as any)[t.type] += Math.abs(t.amount);
  }
  return base;
}

function currency(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmt(iso?: string | null) {
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

/* ------------------ filtro de período ------------------ */

type PeriodKey = "7d" | "1m" | "3m";

function startDateForPeriod(p: PeriodKey): Date {
  const now = new Date();
  const d = new Date(now);
  if (p === "7d") d.setDate(now.getDate() - 7);
  else if (p === "1m") d.setMonth(now.getMonth() - 1);
  else if (p === "3m") d.setMonth(now.getMonth() - 3);
  return d;
}

function isInRange(iso: string | undefined, start: Date, end: Date) {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  return t >= start.getTime() && t <= end.getTime();
}

/* ------------------ UI auxiliares ------------------ */

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-4">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-xl font-extrabold text-blue-700 mt-1">{value}</p>
    </div>
  );
}

function Pill({
  active,
  children,
  onClick,
}: {
  active?: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-sm border transition ${
        active
          ? "bg-blue-600 text-white border-blue-600"
          : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
      }`}
    >
      {children}
    </button>
  );
}

/**
 * Placeholder de gráfico de distribuição (barras horizontais).
 * Podemos trocar por donut/linha depois.
 */
function DistBar({
  label,
  value,
  max,
}: {
  label: string;
  value: number;
  max: number;
}) {
  const pct = max <= 0 ? 0 : Math.round((value / max) * 100);
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-gray-600">
        <span>{label}</span>
        <span>{pct}%</span>
      </div>
      <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-2 bg-blue-500 rounded-full transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/* =================================================================== */

export default function ParentProgress() {
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const selectedKidId = sp.get("kid") || "";

  // tema
  useEffect(() => {
    document.body.setAttribute("data-role", "parent");
    return () => document.body.removeAttribute("data-role");
  }, []);


  const [kids, setKids] = useState<Kid[]>([]);
  const [loading, setLoading] = useState(true);

  // período
  const [period, setPeriod] = useState<PeriodKey>("7d");
  const periodStart = useMemo(() => startDateForPeriod(period), [period]);
  const periodEnd = useMemo(() => new Date(), [period]);

  // sessão + crianças
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const uid = data.session?.user?.id || "";
        if (!mounted) return;

        await fetchKids(uid);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  async function fetchKids(uid: string) {
    if (!uid) {
      setKids([]);
      return;
    }
    try {
      const { data, error } = await supabase
        .from("kids")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      setKids((data || []).map(mapRowToKid));
    } catch {
      const fallback = await getKidsByParent(uid);
      setKids(fallback);
    }
  }

  // mapa de transações (filtradas por período)
  const txMap = useMemo(() => {
    const map: Record<string, Tx[]> = {};
    for (const k of kids) {
      const all = getTxByKid(k.id);
      map[k.id] = all.filter((t) =>
        isInRange(t.createdAt ?? t.date, periodStart, periodEnd),
      );
    }
    return map;
  }, [kids, periodStart, periodEnd]);

  // foco por ?kid=
  const focusedKid = selectedKidId ? kids.find((k) => k.id === selectedKidId) || null : null;

  // totais (geral ou da criança) dentro do período
  const gerais = useMemo(() => {
    const totals: Totais = { mesada: 0, gasto: 0, guardar: 0, investir: 0, recompensa: 0 };
    for (const k of kids) {
      const t = somaPorTipo(txMap[k.id] || []);
      totals.mesada += t.mesada;
      totals.gasto += t.gasto;
      totals.guardar += t.guardar;
      totals.investir += t.investir;
      totals.recompensa += t.recompensa;
    }
    return totals;
  }, [kids, txMap]);

  const doKid = useMemo(() => {
    if (!focusedKid) return null;
    return somaPorTipo(txMap[focusedKid.id] || []);
  }, [focusedKid, txMap]);

  const totalGeral =
    gerais.mesada + gerais.recompensa + gerais.guardar + gerais.investir + gerais.gasto;
  const totalDoKid = doKid
    ? doKid.mesada + doKid.recompensa + doKid.guardar + doKid.investir + doKid.gasto
    : 0;

  return (
    <div className="min-h-screen bg-[var(--bg)] pb-24">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 shadow-sm sticky top-0">
        <div className="px-4 py-3 max-w-full md:max-w-[640px] mx-auto flex items-center justify-between">
          <h1 className="text-[17px] font-semibold text-gray-900">
            {focusedKid ? `Progresso • ${focusedKid.nome}` : "Progresso"}
          </h1>
        </div>
      </header>

      <main className="px-4 py-4 max-w-full md:max-w-[640px] mx-auto space-y-6">
        {/* Filtro de período */}
        <section className="bg-white border border-gray-100 rounded-2xl p-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-700">Período:</span>
            <Pill active={period === "7d"} onClick={() => setPeriod("7d")}>
              Últimos 7 dias
            </Pill>
            <Pill active={period === "1m"} onClick={() => setPeriod("1m")}>
              Último mês
            </Pill>
            <Pill active={period === "3m"} onClick={() => setPeriod("3m")}>
              Últimos 3 meses
            </Pill>
          </div>
        </section>

        {/* Filtro rápido por criança */}
        {!loading && kids.length > 0 && (
          <section className="bg-white border border-gray-100 rounded-2xl p-3">
            <label className="block text-sm text-gray-700 mb-1">
              Filtrar por criança
            </label>
            <select
              value={focusedKid ? focusedKid.id : ""}
              onChange={(e) =>
                e.target.value
                  ? nav(`/parent/progress?kid=${e.target.value}`)
                  : nav("/parent/progress")
              }
              className="w-full rounded-xl border border-gray-200 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-200"
            >
              <option value="">Geral (todas)</option>
              {kids.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.nome}
                </option>
              ))}
            </select>
          </section>
        )}

        {/* Cards de totais */}
        <section className="grid grid-cols-2 gap-3">
          <StatCard
            label={focusedKid ? "Total (registrado no período)" : "Total (registrado no período)"}
            value={currency(focusedKid ? totalDoKid : totalGeral)}
          />
          <StatCard
            label={focusedKid ? "Saldo atual" : "Saldo total"}
            value={currency(
              focusedKid
                ? focusedKid.saldo
                : kids.reduce((acc, k) => acc + (k.saldo || 0), 0)
            )}
          />
        </section>

        {/* Distribuição */}
        <section className="bg-white border border-gray-100 rounded-2xl p-4 space-y-3">
          <h3 className="text-sm font-semibold text-gray-700">
            Distribuição {focusedKid ? `• ${focusedKid.nome}` : "geral"}
          </h3>
          {(() => {
            const base = focusedKid ? (doKid || { mesada:0,gasto:0,guardar:0,investir:0,recompensa:0 }) : gerais;
            const valores = [base.mesada, base.gasto, base.guardar, base.investir, base.recompensa];
            const max = Math.max(...valores, 0);
            const soma = valores.reduce((a, b) => a + b, 0);
            if (soma <= 0) {
              return <p className="text-sm text-gray-500">Sem movimentações no período.</p>;
            }
            return (
              <div className="space-y-2">
                <DistBar label="Mesada" value={base.mesada} max={max} />
                <DistBar label="Gastos" value={base.gasto} max={max} />
                <DistBar label="Guardar" value={base.guardar} max={max} />
                <DistBar label="Investir" value={base.investir} max={max} />
                <DistBar label="Recompensas" value={base.recompensa} max={max} />
              </div>
            );
          })()}
        </section>

        {/* Lista por criança (quando visão geral) */}
        {!focusedKid && (
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-700">Por criança</h3>
            {kids.length === 0 && !loading && (
              <div className="bg-white border border-gray-100 rounded-2xl p-5 text-center text-gray-600">
                Nenhuma criança cadastrada.{" "}
                <Link to="/parent/kids" className="text-blue-600 font-semibold hover:underline">
                  Adicionar agora
                </Link>
              </div>
            )}
            {kids.map((k) => {
              const list = txMap[k.id] || [];
              const t = somaPorTipo(list);
              const ttl = t.mesada + t.gasto + t.guardar + t.investir + t.recompensa;
              const max = Math.max(t.mesada, t.gasto, t.guardar, t.investir, t.recompensa, 0);
              return (
                <div key={k.id} className="bg-white border border-gray-100 rounded-2xl p-4">
                  <div className="flex items-center gap-3">
                    <img
                      src={k.avatar || "https://i.pravatar.cc/80"}
                      alt={k.nome}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900 leading-tight">{k.nome}</p>
                      <p className="text-xs text-gray-500">Saldo: <b>{currency(k.saldo)}</b></p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => nav(`/parent/progress?kid=${k.id}`)}
                        className="text-sm text-blue-600 font-semibold"
                      >
                        Ver
                      </button>
                    </div>
                  </div>

                  {ttl <= 0 ? (
                    <p className="text-sm text-gray-500 mt-3">Sem movimentações no período.</p>
                  ) : (
                    <div className="mt-3 space-y-2">
                      <DistBar label="Mesada" value={t.mesada} max={max} />
                      <DistBar label="Gastos" value={t.gasto} max={max} />
                      <DistBar label="Guardar" value={t.guardar} max={max} />
                      <DistBar label="Investir" value={t.investir} max={max} />
                      <DistBar label="Recompensas" value={t.recompensa} max={max} />
                    </div>
                  )}
                </div>
              );
            })}
          </section>
        )}

        {/* Últimas movimentações (quando focado em 1 criança) */}
        {focusedKid && (
          <section>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Últimas movimentações</h3>
            {(txMap[focusedKid.id]?.length ?? 0) > 0 ? (
              <div className="space-y-2">
                {[...(txMap[focusedKid.id] || [])]
                  .sort((a, b) => {
                    const tb = b.createdAt ?? b.date;
                    const ta = a.createdAt ?? a.date;
                    const nb = tb ? new Date(tb).getTime() : 0;
                    const na = ta ? new Date(ta).getTime() : 0;
                    return nb - na;
                  })
                  .slice(0, 15)
                  .map((t) => (
                    <div
                      key={t.id}
                      className="bg-white border border-gray-100 rounded-2xl p-3 flex items-center justify-between"
                    >
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{labelTx(t.type)}</p>
                        {t.description && (
                          <p className="text-xs text-gray-500">{t.description}</p>
                        )}
                        <p className="text-xs text-gray-400 mt-0.5">
                          {fmt(t.createdAt ?? t.date)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p
                          className={`font-bold tabular-nums ${
                            t.amount >= 0 ? "text-green-600" : "text-red-600"
                          }`}
                        >
                          {t.amount >= 0
                            ? `+ ${currency(t.amount)}`
                            : `- ${currency(Math.abs(t.amount))}`}
                        </p>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="bg-white border border-gray-100 rounded-2xl p-5 text-center text-gray-600">
                Sem movimentações no período.
              </div>
            )}
          </section>
        )}
      </main>

      <BottomNavParent />
    </div>
  );
}

/* ---------- helpers ---------- */

function labelTx(t: TxType) {
  switch (t) {
    case "mesada":
      return "Crédito de mesada";
    case "gasto":
      return "Gasto";
    case "guardar":
      return "Guardado";
    case "investir":
      return "Investimento";
    case "recompensa":
      return "Recompensa";
    default:
      return "Movimentação";
  }
}
