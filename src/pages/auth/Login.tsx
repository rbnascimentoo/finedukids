import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "../../services/supabase";
import { setActiveUser } from "../../services/session";
import type { LoginPayload, Role } from "../../domain/models";

async function resolveRole(): Promise<Role> {
  const { data: u } = await supabase.auth.getUser();
  const uid = u?.user?.id;
  const metaRole = (u?.user?.user_metadata as any)?.role as Role | undefined;

  if (uid) {
    const { data: prof } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", uid)
      .maybeSingle();

    if (prof?.role) {
      return prof.role === "parent" ? "parent" : "child";
    }
  }

  return metaRole === "child" ? "child" : "parent";
}

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [error, setError] = useState<string | null>(null);

  const loginMutation = useMutation({
    mutationFn: async ({ email, password }: LoginPayload) => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        if (/confirm/i.test(error.message)) {
          throw new Error("E-mail ainda não confirmado. Verifique seu e-mail.");
        }
        if (error.message.includes("Invalid login credentials")) {
          throw new Error("E-mail ou senha inválidos.");
        }
        throw new Error(error.message || "Erro ao entrar.");
      }

      if (!data.session?.user) {
        throw new Error("Erro interno. Tente novamente.");
      }

      const role = await resolveRole();

      const { data: profile } = await supabase
        .from("profiles")
        .select("deactivated")
        .eq("id", data.session.user.id)
        .maybeSingle();

      if (profile?.deactivated) {
        await supabase.auth.signOut();
        throw new Error("Esta conta está desativada.");
      }

      setActiveUser(data.session.user.id, role);
      return { role };
    },
    onSuccess: ({ role }) => {
      setError(null);
      setEmail("");
      setPass("");
      navigate(role === "parent" ? "/parent" : "/child", { replace: true });
    },
    onError: (err: unknown) => {
      setError(err instanceof Error ? err.message : "Erro inesperado.");
    },
  });

  const disabled = useMemo(
    () => !email.trim() || !pass || loginMutation.isPending,
    [email, pass, loginMutation.isPending]
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (disabled) return;
    setError(null);
    loginMutation.mutate({ email, password: pass });
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-8 bg-gradient-to-b from-[#FFD1D9] via-[#FFE9C3] to-[#60E2FF]">
      <div className="w-full max-w-sm">
        {/* HEADER */}
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-black text-center">
            Entrar
          </h1>
          <p className="text-sm text-black/80 text-center mt-1">
            Bem-vindo de volta! 👋
          </p>
        </header>

        {/* FORM */}
        <form className="space-y-3" onSubmit={handleSubmit} noValidate>
          <input
            type="email"
            required
            placeholder="E-mail"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-white rounded-full px-4 py-3 text-sm text-black shadow-sm outline-none border border-transparent focus:border-[#FF7A00]"
          />

          <input
            type="password"
            required
            placeholder="Senha"
            autoComplete="current-password"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            className="w-full bg-white rounded-full px-4 py-3 text-sm text-black shadow-sm outline-none border border-transparent focus:border-[#FF7A00]"
          />

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-xs text-red-700">
              {error}
            </div>
          )}

          {/* botão laranja fluorescente */}
          <button
            type="submit"
            disabled={disabled}
            className="w-full rounded-full bg-[#ff7b00] text-[#1A1A1A] font-semibold py-3 text-sm shadow-md disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.98] transition-transform"
          >
            {loginMutation.isPending ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <div className="mt-3 text-center">
          <Link to="/reset" className="text-xs text-[#1A1A1A]/80 hover:underline">
            Esqueceu sua senha?
          </Link>
        </div>

        <p className="text-center text-xs text-[#1A1A1A] mt-4">
          Ainda não tem conta?{" "}
          <Link to="/register" className="font-semibold underline">
            Criar conta
          </Link>
        </p>
      </div>
    </div>
  );
}
