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
        const { error } = await supabase.auth.exchangeCodeForSession(
          window.location.href,
        );
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
        if (
          params["type"] === "recovery" &&
          params["access_token"] &&
          params["refresh_token"]
        ) {
          const { data, error } = await supabase.auth.setSession({
            access_token: params["access_token"],
            refresh_token: params["refresh_token"],
          });
          if (error || !data?.session) {
            setErr(
              error?.message ||
                "Não foi possível validar o link de recuperação.",
            );
            setMsg(null);
            return;
          }
          // limpa o hash para não confundir futuras navegações
          history.replaceState(
            null,
            document.title,
            window.location.pathname + window.location.search,
          );
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

    if (pass.length < 6) {
      setErr("A senha deve ter pelo menos 6 caracteres.");
      return;
    }
    if (pass !== confirm) {
      setErr("As senhas não coincidem.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: pass });
      if (error) {
        if (
          error.message
            ?.toLocaleLowerCase()
            .includes("different from the old")
        ) {
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
    <div className="min-h-screen flex items-center justify-center px-6 py-8 bg-[#B5E945]">
      <div className="w-full max-w-sm">
        {/* HEADER */}
        <header className="mb-6">
          <h1 className="text-3xl font-bold text-[#1A1A1A] text-center">
            Definir nova senha
          </h1>
          <p className="text-sm text-[#1A1A1A]/80 text-center mt-1">
            Crie uma nova senha para continuar usando o FinEdu Kids.
          </p>
        </header>

        {/* ESTADO DE VALIDAÇÃO DO LINK */}
        {!ready ? (
          <div className="space-y-3">
            {msg && (
              <p className="text-center text-sm text-[#1A1A1A]/80">{msg}</p>
            )}
            {err && (
              <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                {err}
              </div>
            )}
            <div className="flex justify-center">
              <button
                type="button"
                onClick={tryEstablishSessionFromUrl}
                className="rounded-full px-4 py-2 text-xs font-semibold bg-white text-black shadow-sm border border-transparent hover:border-black/10"
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
              placeholder="Nova senha (mín. 6 caracteres)"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              className="w-full bg-white rounded-full px-4 py-3 text-sm text-black shadow-sm outline-none border border-transparent focus:border-[#FF7A00]"
            />
            <input
              type="password"
              required
              placeholder="Confirmar nova senha"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full bg-white rounded-full px-4 py-3 text-sm text-[#1A1A1A] shadow-sm outline-none border border-transparent focus:border-[#FF7A00]"
            />

            {err && (
              <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                {err}
              </div>
            )}
            {msg && (
              <div className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-xl px-3 py-2">
                {msg}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-[#00ccff] text-[#1A1A1A] font-semibold py-3 text-sm shadow-md disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.98] transition-transform"
            >
              {loading ? "Salvando..." : "Atualizar senha"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
