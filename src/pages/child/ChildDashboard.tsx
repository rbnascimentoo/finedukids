import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import BottomNavChild from "../../components/BottomNavChild";
import {
  getKidsByUser,
  KIDS_UPDATED_EVENT,
  type Kid,
} from "../../services/storage";
import { supabase } from "../../services/supabase";
import {
  AiOutlineTrophy,
  AiOutlineStar,
  AiOutlineBook,
  AiOutlineBarChart,
} from "react-icons/ai";

/**
 * Dashboard da criança:
 * - Visual similar ao do responsável (header, cards, atalhos)
 * - Carrega o "kid" associado ao user.id
 * - Estado de carregamento robusto (não redireciona por conta própria)
 */

export default function ChildDashboard() {
  const nav = useNavigate();

  const [ready, setReady] = useState(false);
  const [authMsg, setAuthMsg] = useState<string | null>(null);

  const [userId, setUserId] = useState<string>("");
  const [kid, setKid] = useState<Kid | null>(null);

  // Tema da criança
  useEffect(() => {
    document.body.setAttribute("data-role", "child");
    return () => document.body.removeAttribute("data-role");
  }, []);

  // Sessão e carga do kid associado
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const user = data.session?.user;
        

        if (!user) {
          setAuthMsg("Sessão não localizada.");
          setReady(true);
          nav("/login", { replace: true });
          return;
        }

          // Verifica se ainda existe profile (e role) OU vínculo com criança.
        const { data: profile, error } = await supabase
          .from("profiles")
          .select("id, role")
          .eq("id", user.id)
          .maybeSingle();

        if (!mounted) return;

        if (error || !profile) {
          await supabase.auth.signOut();
          nav("/login?msg=perfil_inexistente", { replace: true });
          return;
        }

        setUserId(user.id);

        // Busca o kid vinculado ao user (criança)
        const list = getKidsByUser(user.id);
        setKid(list?.[0] ?? null);
      } catch (e: any) {
        setAuthMsg(e?.message || "Falha ao carregar informações.");
      } finally {
        if (mounted) setReady(true);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Reage a atualizações de kids (ex.: ajustes vindos de outras telas)
  useEffect(() => {
    const refresh = () => {
      if (userId) {
        const list = getKidsByUser(userId);
        setKid(list?.[0] ?? null);
      }
    };
    window.addEventListener(KIDS_UPDATED_EVENT, refresh as EventListener);
    window.addEventListener("storage", refresh as EventListener);
    return () => {
      window.removeEventListener(KIDS_UPDATED_EVENT, refresh as EventListener);
      window.removeEventListener("storage", refresh as EventListener);
    };
  }, [userId]);

  const saldo = useMemo(() => kid?.saldo ?? 0, [kid]);

  if (!ready) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center">
        <div className="text-gray-600">Carregando…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] pb-24">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 shadow-sm sticky top-0">
        <div className="px-4 py-3 max-w-full md:max-w-[640px] mx-auto">
          <h1 className="text-[17px] font-semibold text-gray-900">
            Olá, {kid?.nome || "Criança"}
          </h1>
        </div>
      </header>

      {/* Aviso (sem redirecionar) */}
      {authMsg && (
        <div className="max-w-full md:max-w-[640px] mx-auto px-4 mt-3">
          <div className="rounded-xl border border-yellow-200 bg-yellow-50 text-yellow-800 text-sm px-3 py-2">
            {authMsg}
          </div>
        </div>
      )}

      {/* Conteúdo */}
      <main className="px-4 py-4 max-w-full md:max-w-[640px] mx-auto">
        {/* Resumo */}
        <section className="mb-4">
          <div className="bg-white border border-gray-100 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Seu saldo</p>
              <p className="text-2xl font-extrabold text-blue-700 tabular-nums">
                R$ {saldo.toFixed(2)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Missões concluídas</p>
              <p className="text-xl font-bold text-gray-900">
                {/* placeholder simples para MVP */}
                {kid ? Math.max(0, Math.floor((kid.saldo ?? 0) / 10)) : 0}
              </p>
            </div>
          </div>
        </section>

        {/* Atalhos principais */}
        <section className="mb-6">
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => nav("/child/rewards")}
              className="flex items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white py-3 hover:bg-gray-50 transition"
            >
              <AiOutlineStar className="w-6 h-6 text-blue-600" />
              <span className="text-sm font-semibold text-gray-900">Recompensas</span>
            </button>

            <button
              onClick={() => nav("/child/learn")}
              className="flex items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white py-3 hover:bg-gray-50 transition"
            >
              <AiOutlineBook className="w-6 h-6 text-blue-600" />
              <span className="text-sm font-semibold text-gray-900">Aprendizado</span>
            </button>

            <button
              onClick={() => nav("/child/progress")}
              className="flex items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white py-3 hover:bg-gray-50 transition"
            >
              <AiOutlineBarChart className="w-6 h-6 text-blue-600" />
              <span className="text-sm font-semibold text-gray-900">Progresso</span>
            </button>

            <button
              onClick={() => nav("/child/missions")}
              className="flex items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white py-3 hover:bg-gray-50 transition"
            >
              <AiOutlineTrophy className="w-6 h-6 text-blue-600" />
              <span className="text-sm font-semibold text-gray-900">Missões</span>
            </button>
          </div>
        </section>

        {/* Card de perfil (opcional) */}
        <section className="space-y-3">
          <div className="bg-white border border-gray-100 rounded-2xl p-4 flex items-center gap-3">
            <img
              src={kid?.avatar || "https://i.pravatar.cc/80"}
              alt={kid?.nome || "avatar"}
              className="w-12 h-12 rounded-full object-cover"
            />
            <div className="flex-1">
              <p className="font-semibold text-gray-900 leading-tight">{kid?.nome || "Seu perfil"}</p>
              <p className="text-xs text-gray-500">Toque para personalizar seu avatar e preferências.</p>
            </div>
            <Link
              to="/child/settings"
              className="rounded-xl bg-white text-gray-700 font-semibold px-3 py-2 border border-gray-200 hover:bg-gray-50"
            >
              Configurar
            </Link>
          </div>
        </section>
      </main>

      <BottomNavChild />
    </div>
  );
}
