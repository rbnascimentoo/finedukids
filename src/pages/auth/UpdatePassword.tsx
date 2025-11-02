// src/pages/auth/UpdatePassword.tsx
import { useEffect, useState } from "react";
import { supabase } from "../../services/supabase";
import { useNavigate } from "react-router-dom";

function parseHashTokens(hash: string) {
  // hash vem no formato: #access_token=...&expires_in=...&refresh_token=...&token_type=bearer&type=recovery
  const out: Record<string, string> = {};
  const h = hash.startsWith("#") ? hash.slice(1) : hash;
  for (const kv of h.split("&")) {
    const [k, v] = kv.split("=");
    if (k) out[decodeURIComponent(k)] = decodeURIComponent(v || "");
  }
  return out;
}

export default function UpdatePassword() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [pass, setPass] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  async function tryEstablishSessionFromUrl() {
    setMsg("Validando seu link…");
    setErr(null);

    try {
      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");
      const hasHash = window.location.hash && window.location.hash.length > 1;

      // 1) Fluxo novo: ?code=... -> exchangeCodeForSession
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(window.location.href);
        if (error) {
          setErr(error.message || "Link inválido ou expirado.");
          setMsg(null);
          return;
        }
        setReady(true);
        setMsg(null);
        return;
      }

      // 2) Fluxo antigo: #access_token=...&refresh_token=...&type=recovery -> setSession
      if (!code && hasHash) {
        const params = parseHashTokens(window.location.hash);
        if (params["type"] === "recovery" && params["access_token"] && params["refresh_token"]) {
          const { data, error } = await supabase.auth.setSession({
            access_token: params["access_token"],
            refresh_token: params["refresh_token"],
          });
          if (error || !data?.session) {
            setErr(error?.message || "Não foi possível validar o link de recuperação.");
            setMsg(null);
            return;
          }
          // limpa o hash para não confundir futuras navegações
          history.replaceState(null, document.title, window.location.pathname + window.location.search);
          setReady(true);
          setMsg(null);
          return;
        }
      }

      // 3) Já tem sessão ativa?
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        setReady(true);
        setMsg(null);
        return;
      }

      // 4) Nada deu: inválido
      setErr("Link inválido ou expirado. Solicite uma nova redefinição.");
      setMsg(null);
    } catch (e: any) {
      setErr(e?.message || "Falha ao validar o link.");
      setMsg(null);
    }
  }

  useEffect(() => {
    tryEstablishSessionFromUrl();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setMsg(null);

    if (pass.length < 6) return setErr("A senha deve ter pelo menos 6 caracteres.");
    if (pass !== confirm) return setErr("As senhas não coincidem.");

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: pass });
      if (error) {
        if(error.message?.toLocaleLowerCase().includes("different from the old")) {
          setErr("A nova senha deve ser diferente da senha anterior.");
        } else {
          setErr(error.message || "Não foi possível atualizar a senha.");
        }
        return;
      }
      setMsg("Senha atualizada com sucesso! Redirecionando para o login…");
      setTimeout(() => navigate("/login", { replace: true }), 1200);
    } catch (e: any) {
      setErr(e?.message || "Erro inesperado.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg)] px-4">
      <div className="w-full max-w-[420px]">
        <div className="rounded-2xl bg-white shadow-[0_10px_30px_rgba(0,0,0,0.06)] border border-gray-100 p-6">
          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <span className="text-xl">🔒</span>
          </div>
          <h1 className="text-xl font-extrabold text-center text-gray-900">Definir nova senha</h1>
          <p className="text-center text-gray-500 mt-1 mb-5">
            Crie uma nova senha para acessar sua conta.
          </p>

          {!ready ? (
            <div className="space-y-3">
              {msg && <p className="text-center text-gray-600">{msg}</p>}
              {err && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                  {err}
                </div>
              )}
              <div className="flex justify-center">
                <button
                  onClick={tryEstablishSessionFromUrl}
                  className="rounded-xl px-4 py-2 border bg-white hover:bg-gray-50"
                >
                  Tentar novamente
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-3">
              <input
                type="password"
                required
                placeholder="Nova senha (mín. 6)"
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-3 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
              <input
                type="password"
                required
                placeholder="Confirmar nova senha"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-3 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />

              {err && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                  {err}
                </div>
              )}
              {msg && (
                <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-xl px-3 py-2">
                  {msg}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl px-4 py-3 font-semibold border transition bg-blue-600 text-white border-blue-600 hover:brightness-105 active:scale-[0.99] disabled:opacity-80"
              >
                {loading ? "Salvando..." : "Atualizar senha"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
