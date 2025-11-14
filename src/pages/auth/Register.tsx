import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import DatePicker, { registerLocale } from "react-datepicker";
import { ptBR } from "date-fns/locale";
import "react-datepicker/dist/react-datepicker.css";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "../../services/supabase";
import type { Role, SignUpInput } from "../../domain/models";

registerLocale("pt-BR", ptBR);

export default function Register() {
  const navigate = useNavigate();

  const [role, setRole] = useState<Role>("parent");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    document.body.setAttribute(
      "data-role",
      role === "child" ? "child" : "parent",
    );
    return () => document.body.removeAttribute("data-role");
  }, [role]);


  const signUpMutation = useMutation({
    mutationFn: async ({ email, password }: SignUpInput) => {
      // const birthISO = formatISO(birthdate);

      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            name: name.trim(),
            role
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        // jogar para o onError
        throw new Error(error.message || "Não foi possível criar sua conta.");
      }

      const userId = data.user?.id;
      if (!userId) throw new Error("User not found");

      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          name,
          role,
        })
        .eq("id", userId);

      if (profileError) throw profileError;

    },
    onSuccess: () => {
      setError(null);
      setInfo(
        "Conta criada! Enviamos um e-mail de confirmação. Verifique sua caixa de entrada para continuar.",
      );
      setTimeout(() => navigate("/login", { replace: true }), 1200);
    },
    onError: (err: any) => {
      setInfo(null);
      setError(
        err?.message ||
        "Aconteceu um erro inesperado. Tente novamente mais tarde.",
      );
    },
  });

  const disabled = useMemo(() => {
    return (
      !name.trim() ||
      !email.trim() ||
      password.length < 6 ||
      password !== confirm ||
      signUpMutation.isPending
    );
  }, [name, email, password, confirm, signUpMutation.isPending]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (disabled) return;

    setError(null);
    setInfo(null);

    signUpMutation.mutate({
      email,
      password
    });
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-8 bg-[#FFD1D9]">
      <div className="w-full max-w-sm">

        {/* HEADER */}
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-[#403A3A] text-center">
            Criar conta
          </h1>
          <p className="text-sm text-[#403A3A]/80 text-center mt-1">
            Só alguns dados para começarmos.
          </p>
        </header>

        {/* ROLE TABS */}
        <div className="flex bg-white/40 rounded-full p-1 mb-6">
          <button
            type="button"
            onClick={() => setRole("parent")}
            className={`flex-1 py-2 rounded-full text-xs font-semibold transition-all
              ${role === "parent"
                ? "bg-white text-[#1A1A1A] shadow-sm"
                : "text-[#403A3A]/70"
              }`}
          >
            Responsável
          </button>

          <button
            type="button"
            onClick={() => setRole("child")}
            className={`flex-1 py-2 rounded-full text-xs font-semibold transition-all
              ${role === "child"
                ? "bg-white text-[#1A1A1A] shadow-sm"
                : "text-[#403A3A]/70"
              }`}
          >
            Criança
          </button>
        </div>

        {/* FORM */}
        <form className="space-y-3" onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Nome completo"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-white rounded-full px-4 py-3 text-sm text-[#1A1A1A] shadow-sm outline-none border border-transparent focus:border-[#A7D8FF]"
          />

          <input
            type="email"
            placeholder="E-mail"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-white rounded-full px-4 py-3 text-sm text-[#1A1A1A] shadow-sm outline-none border border-transparent focus:border-[#A7D8FF]"
          />

          <input
            type="password"
            placeholder="Senha (mín. 6)"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-white rounded-full px-4 py-3 text-sm text-[#1A1A1A] shadow-sm outline-none border border-transparent focus:border-[#A7D8FF]"
          />

          <input
            type="password"
            placeholder="Confirmar senha"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="w-full bg-white rounded-full px-4 py-3 text-sm text-[#1A1A1A] shadow-sm outline-none border border-transparent focus:border-[#A7D8FF]"
          />

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-xs text-red-700">
              {error}
            </div>
          )}

          {info && (
            <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-xs text-blue-700">
              {info}
            </div>
          )}

          {/* BOTÃO - azul bebê com texto PRETO */}
          <button
            type="submit"
            disabled={disabled}
            className="w-full rounded-full bg-[#00ccff] text-[#1A1A1A] font-semibold py-3 text-sm shadow-md disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.98] transition-transform"
          >
            {signUpMutation.isPending ? "Criando conta..." : "Criar conta"}
          </button>
        </form>

        <p className="text-center text-xs text-[#403A3A] mt-4">
          Já possui uma conta?{" "}
          <Link to="/login" className="font-semibold underline">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  );
}
