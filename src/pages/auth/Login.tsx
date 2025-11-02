import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../../services/supabase";
import { setActiveUser } from "../../services/session";

export default function Login() {
  const navigate = useNavigate();

  // UI
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [mostrarSenha] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // sessão atual
  const [hasSession, setHasSession] = useState(false);
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);

  const [needsConfirm, setNeedsConfirm] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const redirectTo = `${window.location.origin}/auth/callback`;

  useEffect(() => {
    document.body.setAttribute("data-role", "parent"); // tema neutro/parent no login
    return () => document.body.removeAttribute("data-role");
  }, []);

  // Aguarda sessão de forma confiável (evita corrida pós-login)
  async function ensureSession(timeoutMs = 1200) {
    const t0 = Date.now();
    while (Date.now() - t0 < timeoutMs) {
      const { data } = await supabase.auth.getSession();
      if (data.session?.user) return data.session;
      await new Promise((r) => setTimeout(r, 120));
    }
    const { data } = await supabase.auth.getSession();
    return data.session ?? null;
  }

  // Checa sessão ao montar
  useEffect(() => {
    let mounted = true;
    (async () => {
      const session = await ensureSession();
      if (!mounted) return;
      if (session?.user) {
        setHasSession(true);
        setSessionEmail(session.user.email ?? null);
      } else {
        setHasSession(false);
        setSessionEmail(null);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Resolve a role (profiles.role -> fallback metadata.role)
  async function resolveRole(): Promise<"parent" | "child"> {
    const { data: u } = await supabase.auth.getUser();
    const uid = u?.user?.id;
    const metaRole = (u?.user?.user_metadata as any)?.role as "parent" | "child" | undefined;

    if (uid) {
      const { data: prof, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", uid)
        .maybeSingle();

      if (!error && prof?.role) {
        return prof.role === "parent" ? "parent" : "child";
      }
    }
    return metaRole === "parent" ? "parent" : "child";
  }

  async function goToDashboard() {
    setError(null);
    setLoading(true);
    try {
      const session = await ensureSession();
      if (!session?.user) {
        setHasSession(false);
        setSessionEmail(null);
        setError("Sessão expirada. Faça login novamente.");
        return;
      }
      const role = await resolveRole();
      setActiveUser(session.user.id, role);
      navigate(role === "parent" ? "/parent" : "/child", { replace: true });
    } catch (e: any) {
      setError(e?.message || "Não foi possível continuar agora.");
    } finally {
      setLoading(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { error: signErr } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: pass,
      });

      if (signErr) {
        if (/confirm/i.test(signErr.message)) {
          setError("E-mail ainda não confirmado. Verifique sua caixa de entrada.");
        } else if (signErr.message.includes("email not confirmed") || signErr.message.includes("not confirmed")) {
          setNeedsConfirm(email.trim());
          setError("Seu e-mail ainda não foi confirmado.");
        } else if (signErr.message.includes("Invalid login credentials")) {
          setError("E-mail ou senha inválidos. Verifique e tente novamente.");
        } else {
          setError(signErr.message || "Não foi possível entrar.");
        }
        return;
      }

      // sessão e navegação
      const session = await ensureSession();
      if (!session?.user) {
        setError("Sessão não encontrada após login. Tente novamente.");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role, deactivated")
        .eq("id", session.user.id)
        .maybeSingle();

      if (profile?.deactivated) {
        await supabase.auth.signOut();
        setError("Sua conta está desativada. Entre em contato para reativação.");
        return;
      }

      // alterna para modo “Continuar”
      setHasSession(true);
      setSessionEmail(session.user.email ?? null);
      setEmail("");
      setPass("");

      const role = await resolveRole();
      navigate(role === "parent" ? "/parent" : "/child", { replace: true });
    } catch (e: any) {
      setError(e?.message || "Erro inesperado ao entrar.");
    } finally {
      setLoading(false);
    }
  }

    async function resendConfirmation() {
    if (!needsConfirm) return;
    setResending(true);
    setError(null);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: needsConfirm,
        options: { emailRedirectTo: redirectTo },
      });
      if (error) {
        setError(error.message || "Não foi possível reenviar o e-mail agora.");
        return;
      }
      // feedback positivo
      alert("Reenviamos o e-mail de confirmação. Verifique sua caixa de entrada e spam.");
    } finally {
      setResending(false);
    }
  }

  async function switchAccount() {
    setError(null);
    setLoading(true);
    try {
      await supabase.auth.signOut();
      setHasSession(false);
      setSessionEmail(null);
    } catch (e: any) {
      setError(e?.message || "Não foi possível sair agora.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg)] px-4">
      <div className="w-full max-w-[420px]">
        <div className="rounded-2xl bg-white shadow-[0_10px_30px_rgba(0,0,0,0.06)] border border-gray-100 p-6">
          {/* ícone topo */}
          <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">✅</span>
          </div>

          <h1 className="text-2xl font-extrabold text-center text-gray-900 leading-tight">
            Bem-vindo ao FinEdu<br />Kids
          </h1>
          <p className="text-center text-gray-500 mt-1 mb-5">
            Vamos começar a sua jornada financeira!
          </p>

          {/* BLOCO: Sessão ativa → mostrar “Continuar” */}
          {hasSession && (
            <div className="space-y-3">
              <div className="text-sm text-gray-600 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2">
                Sessão ativa {sessionEmail ? `para ${sessionEmail}` : ""}.
              </div>

              {error && (
                <div
                  className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2"
                  role="alert"
                  aria-live="assertive"
                >
                  {error}
                </div>
              )}

              {/* Banner de aviso quando precisa confirmar */}
              {needsConfirm && (
                <div className="text-sm bg-yellow-50 border border-yellow-200 text-yellow-900 rounded-xl px-3 py-2 mb-3">
                  Seu e-mail ainda não foi confirmado. Clique em “Reenviar e-mail de confirmação”
                  e verifique sua caixa de entrada.
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={resendConfirmation}
                      disabled={resending}
                      className="rounded-lg bg-blue-600 text-white px-3 py-2 font-semibold hover:brightness-105 disabled:opacity-60"
                    >
                      {resending ? "Reenviando..." : "Reenviar e-mail de confirmação"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setNeedsConfirm(null)}
                      className="rounded-lg border border-gray-200 px-3 py-2 text-gray-700 bg-white hover:bg-gray-50"
                    >
                      Fechar
                    </button>
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={goToDashboard}
                disabled={loading}
                className="w-full rounded-full px-4 py-3 font-semibold shadow-md transition
                           bg-blue-600 text-white hover:brightness-105 active:scale-[0.99] disabled:opacity-60"
              >
                {loading ? "Abrindo…" : "Continuar"}
              </button>

              <button
                type="button"
                onClick={switchAccount}
                disabled={loading}
                className="w-full rounded-xl px-4 py-3 font-semibold border transition
                           bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
              >
                Entrar com outra conta
              </button>

              <div className="mt-1 text-center">
                <Link to="/reset" className="text-sm text-gray-500 hover:underline">
                  Esqueceu a senha?
                </Link>
              </div>
            </div>
          )}

          {/* BLOCO: Sem sessão → mostrar formulário de login */}
          {!hasSession && (
            <form onSubmit={onSubmit} className="space-y-3" noValidate>
              <input
                type="email"
                required
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-3 focus:outline-none focus:ring-2 focus:ring-blue-200"
                autoComplete="username"
              />
              <input
                type={mostrarSenha ? "text" : "password"}
                required
                placeholder="Senha"
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-3 focus:outline-none focus:ring-2 focus:ring-blue-200"
                autoComplete="current-password"
              />

              {error && (
                <div
                  className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2"
                  role="alert"
                  aria-live="assertive"
                >
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-full px-4 py-3 font-semibold shadow-md transition
                           bg-blue-600 text-white hover:brightness-105 active:scale-[0.99] disabled:opacity-60"
              >
                {loading ? "Entrando..." : "Entrar"}
              </button>

              <div className="mt-1 text-center">
                <Link to="/reset" className="text-sm text-gray-500 hover:underline">
                  Esqueceu a senha?
                </Link>
              </div>
            </form>
          )}
        </div>

        <div className="text-center mt-3 text-sm text-gray-600">
          Novo por aqui?{" "}
          <Link to="/register" className="text-blue-600 font-semibold hover:underline">
            Criar conta
          </Link>
        </div>
      </div>
    </div>
  );
}
