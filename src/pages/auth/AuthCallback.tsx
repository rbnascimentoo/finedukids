// src/pages/auth/AuthCallback.tsx
import { useEffect, useState } from "react";
import { supabase } from "../../services/supabase";
import { useNavigate } from "react-router-dom";

/**
 * Alguns provedores/fluxos do Supabase redirecionam com:
 *   1) ?code=...                          -> exchangeCodeForSession (fluxo novo)
 *   2) #access_token=...&refresh_token=...&type=recovery -> setSession (fluxo antigo/reset)
 * Este callback trata ambos e só então decide a rota pela role do profile.
 */

function parseHashTokens(hash: string) {
  const out: Record<string, string> = {};
  const h = hash.startsWith("#") ? hash.slice(1) : hash;
  for (const kv of h.split("&")) {
    const [k, v] = kv.split("=");
    if (k) out[decodeURIComponent(k)] = decodeURIComponent(v || "");
  }
  return out;
}

export default function AuthCallback() {
  const navigate = useNavigate();
  const [msg, setMsg] = useState<string | null>("Confirmando seu acesso.");
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");

        // 1) Fluxo ?code=... (novo) -> troca por sessão
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(window.location.href);
          if (error) throw error;
        }
        // 2) Fluxo hash #access_token=... (antigo / recovery)
        else if (window.location.hash && window.location.hash.length > 1) {
          const p = parseHashTokens(window.location.hash);
          const at = p["access_token"];
          const rt = p["refresh_token"];
          if (at && rt) {
            const { error } = await supabase.auth.setSession({
              access_token: at,
              refresh_token: rt,
            });
            if (error) throw error;
            // Limpa o hash para não confundir futuras navegações
            history.replaceState(null, document.title, window.location.pathname + window.location.search);
          }
        }

        // 3) Agora deve haver sessão
        const { data: u } = await supabase.auth.getUser();
        const uid = u?.user?.id;
        if (!uid) throw new Error("Sessão não encontrada após confirmação.");

        // 4) Garante/atualiza profile (id + opcionalmente nome/avatar via metadata)
        //    (se você tiver trigger no DB isso é redundante, mas é um safety net útil)
        

        // 5) Descobre role para decidir rota final
        const { data: profile, error: profErr } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", uid)
          .maybeSingle();

        if (profErr) {
          // Se por RLS/latência não conseguiu ler, segue com fallback para child
          // (ou exponha uma mensagem e dê a opção de continuar)
          setMsg("Sessão confirmada. Redirecionando…");
          if (!mounted) return;
          setTimeout(() => navigate("/child", { replace: true }), 600);
          return;
        }

        const role = profile?.role === "parent" ? "parent" : "child";
        setMsg("Tudo certo! Redirecionando…");
        if (!mounted) return;
        setTimeout(() => navigate(role === "parent" ? "/parent" : "/child", { replace: true }), 600);
      } catch (e: any) {
        setErr(e?.message || "Não foi possível confirmar seu acesso.");
        setMsg(null);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg)] px-4">
      <div className="w-full max-w-[420px]">
        <div className="rounded-2xl bg-white shadow-[0_10px_30px_rgba(0,0,0,0.06)] border border-gray-100 p-6 text-center">
          <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">🔐</span>
          </div>
          <h1 className="text-xl font-extrabold text-gray-900 mb-2">Autenticando…</h1>
          {msg && <p className="text-gray-600">{msg}</p>}
          {err && (
            <div className="mt-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
              {err}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
