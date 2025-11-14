import { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "../../services/supabase";

export default function Reset() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const nav = useNavigate();

  const resetMutation = useMutation({
    mutationFn: async (emailValue: string) => {
      const redirectTo = `${window.location.origin}/update-password`;

      const { error } = await supabase.auth.resetPasswordForEmail(
        emailValue.trim(),
        { redirectTo },
      );

      if (error) {
        throw new Error(
          error.message || "Não foi possível iniciar a redefinição de senha.",
        );
      }
    },
    onSuccess: () => {
      setErr(null);
      setMsg(
        "Se o e-mail estiver cadastrado, você receberá instruções para redefinir sua senha.",
      );
    },
    onError: (e: unknown) => {
      setMsg(null);
      const message =
        e instanceof Error
          ? e.message
          : "Erro inesperado ao solicitar redefinição.";
      setErr(message);
    },
  });

  const disabled = useMemo(
    () => !email.trim() || resetMutation.isPending,
    [email, resetMutation.isPending],
  );

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setErr(null);
    if (disabled) return;
    resetMutation.mutate(email);
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-8 bg-[#bbf144]">
      <div className="w-full max-w-sm">
        {/* HEADER */}
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-[#403A3A] text-center">
            Esqueceu a senha?
          </h1>
          <p className="text-sm text-[#403A3A]/80 text-center mt-1">
            Sem problemas! Informe seu e-mail e te enviamos um link seguro.
          </p>
        </header>

        {/* FORM */}
        <form onSubmit={onSubmit} className="space-y-3" noValidate>
          <input
            type="email"
            required
            placeholder="voce@exemplo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-white rounded-full px-4 py-3 text-sm text-black shadow-sm outline-none border border-transparent focus:border-[#FF7A00]"
            autoComplete="email"
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
            disabled={disabled}
            className="w-full rounded-full bg-[#ff7b00] text-[#1A1A1A] font-semibold py-3 text-sm shadow-md disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.98] transition-transform"
          >
            {resetMutation.isPending ? "Enviando..." : "Redefinir senha"}
          </button>
        </form>

        <div className="mt-4 text-center text-xs text-[#1A1A1A]">
          <button
            onClick={() => nav("/login")}
            className="underline underline-offset-2"
            type="button"
          >
            ← Voltar para login
          </button>
        </div>

        <p className="mt-2 text-center text-xs text-[#1A1A1A]">
          Ainda não tem conta?{" "}
          <Link to="/register" className="font-semibold underline">
            Criar conta
          </Link>
        </p>
      </div>
    </div>
  );
}
