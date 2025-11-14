import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import BottomNavParent from "../../components/BottomNavParent";
import { supabase } from "../../services/supabase";
import { creditMesada, type Kid } from "../../services/storage";
import { addTx } from "../../services/tx";

import {
  AiOutlinePlusCircle,
  AiOutlineBarChart,
  AiOutlineDollarCircle,
} from "react-icons/ai";

/** Converte linha do Supabase para o modelo local Kid-like (para exibir) */
function mapRowToKid(row: any): Kid {
  return {
    id: row.id,
    nome: row.name,
    avatar: row.avatar || undefined,
    saldo: Number(row.balance ?? 0),
    mesadaSemanal: Number(row.weekly_allowance ?? 20),
    parentId: row.parent_id ?? null,
    userId: row.user_id ?? null,
    //createdAt: row.created_at || new Date().toISOString(),
    //updatedAt: row.updated_at || new Date().toISOString(),
  };
}

export default function ParentDashboard() {
  const nav = useNavigate();

  const [parentId, setParentId] = useState<string>("");
  const [userName, setUserName] = useState<string>("Responsável");
  const [kids, setKids] = useState<Kid[]>([]);
  const [loading, setLoading] = useState(true);
  const [highlightId, setHighlightId] = useState<string | null>(null);

  // Carrega sessão e busca crianças
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const uid = data.session?.user?.id || "";
        const name =
          (data.session?.user?.user_metadata as any)?.name ||
          data.session?.user?.email ||
          "Responsável";

        if (!mounted) return;
        setParentId(uid);
        setUserName(name);

        await fetchKids(uid);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Eventos de atualização (outros tabs/telas)
  useEffect(() => {
    const refresh = () => {
      if (parentId) void fetchKids(parentId);
    };
    //window.addEventListener(KIDS_UPDATED_EVENT, refresh as EventListener);
    window.addEventListener("storage", refresh as EventListener);
    return () => {
      //window.removeEventListener(KIDS_UPDATED_EVENT, refresh as EventListener);
      window.removeEventListener("storage", refresh as EventListener);
    };
  }, [parentId]);

  async function fetchKids(uid: string) {
    if (!uid) {
      setKids([]);
      return;
    }
    // Tenta Supabase
    try {
      const { data, error } = await supabase
        .from("kids")
        .select("*")
        .order("created_at", { ascending: true });

      if (error) throw error;
      const mapped = (data || []).map(mapRowToKid);
      setKids(mapped);
      return;
    } catch {
      // Fallback local

    }
  }

  const totalSaldo = useMemo(
    () => kids.reduce((acc, k) => acc + (k.saldo || 0), 0),
    [kids]
  );

  return (
    <div className="min-h-screen pb-24 bg-gradient-to-br from-[#FFD1D9] via-[#FFE9C3] via-[#C9FF5A] to-[#60E2FF]">
      {/* Header */}
      <header className="sticky top-0 bg-white/80 backdrop-blur border-b border-white/40 shadow-sm">
        <div className="px-4 py-3 max-w-full md:max-w-[640px] mx-auto">
          <h1 className="text-[17px] font-semibold text-[#3D3A35]">
            Olá, {userName}
          </h1>
        </div>
      </header>


      {/* Conteúdo */}
      <main className="px-4 py-4 max-w-full md:max-w-[640px] mx-auto">
        {/* Ações Rápidas */}
        <section className="mb-6">
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => nav("/parent/kids")}
              className="flex items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white py-3 hover:bg-gray-50 transition"
            >
              <AiOutlinePlusCircle className="w-6 h-6 text-blue-600" />
              <span className="text-sm font-semibold text-gray-900">
                Adicionar criança
              </span>
            </button>

            <button
              onClick={() => nav("/parent/progress")}
              className="flex items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white py-3 hover:bg-gray-50 transition"
            >
              <AiOutlineBarChart className="w-6 h-6 text-blue-600" />
              <span className="text-sm font-semibold text-gray-900">
                Progresso
              </span>
            </button>
          </div>
        </section>

        {/* Resumo */}
        <section className="mb-4">
          <div className="bg-white border border-gray-100 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Saldo total das crianças</p>
              <p className="text-2xl font-extrabold text-blue-700 tabular-nums">
                R$ {totalSaldo.toFixed(2)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Crianças</p>
              <p className="text-xl font-bold text-gray-900">{kids.length}</p>
            </div>
          </div>
        </section>

        {/* Lista de crianças */}
        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-700">Suas crianças</h3>

          {loading ? (
            <div className="bg-white border border-gray-100 rounded-2xl p-5 text-center text-gray-600">
              Carregando…
            </div>
          ) : kids.length === 0 ? (
            <div className="bg-white border border-gray-100 rounded-2xl p-5 text-center text-gray-600">
              Nenhuma criança cadastrada ainda.{" "}
              <button
                className="text-blue-600 font-semibold hover:underline"
                onClick={() => nav("/parent/kids")}
              >
                Adicionar agora
              </button>
            </div>
          ) : (
            kids.map((k) => (
              <div
                key={k.id}
                className="bg-white border border-gray-100 rounded-2xl p-4 shadow-card"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={k.avatar || "https://i.pravatar.cc/80"}
                    alt={k.nome}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900 leading-tight">
                      {k.nome}
                    </p>
                    <p className="text-xs text-gray-500">
                      Mesada semanal:{" "}
                      <b>R$ {k.mesadaSemanal.toFixed(2)}</b>
                    </p>
                  </div>

                  <div className="text-right">
                    <p
                      className={`font-extrabold tabular-nums transition-all duration-500 ${highlightId === k.id
                          ? "text-green-600 scale-110"
                          : "text-blue-700"
                        }`}
                    >
                      R$ {k.saldo.toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-500">Saldo</p>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2">
                  {/* Mesada no card (local/Fallback imediato) */}
                  <button
                    onClick={() => {
                      // 1) Ajusta localmente para feedback imediato
                      creditMesada(k.id);

                      // 2) Registra no histórico local (para progress, etc.)
                      addTx(k.id, {
                        type: "mesada",
                        amount: k.mesadaSemanal,
                        description: "Crédito de mesada semanal",
                      });

                      // 3) Atualiza UI local (fallback)
                      setKids((prev) =>
                        prev.map((x) =>
                          x.id === k.id
                            ? { ...x, saldo: x.saldo + k.mesadaSemanal }
                            : x
                        )
                      );

                      setHighlightId(k.id);
                      setTimeout(() => setHighlightId(null), 900);

                      // 4) (Opcional) TODO: enviar update para Supabase se desejar manter o saldo lá também
                    }}
                    className="rounded-xl bg-white text-blue-700 font-semibold py-2 border border-blue-200 hover:bg-blue-50 flex items-center justify-center gap-2"
                  >
                    <AiOutlineDollarCircle className="w-5 h-5" />
                    Mesada
                  </button>

                  <Link
                    to={`/parent/kids/${k.id}`}
                    className="text-center rounded-xl bg-white text-gray-700 font-semibold py-2 border border-gray-200 hover:bg-gray-50"
                  >
                    Detalhes
                  </Link>

                  <button
                    onClick={() => nav(`/parent/progress?kid=${k.id}`)}
                    className="rounded-xl bg-white text-gray-700 font-semibold py-2 border border-gray-200 hover:bg-gray-50"
                  >
                    Progresso
                  </button>
                </div>
              </div>
            ))
          )}
        </section>
      </main>

      <BottomNavParent />
    </div>
  );
}
