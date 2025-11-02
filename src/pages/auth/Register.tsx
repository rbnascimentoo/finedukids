import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import DatePicker, { registerLocale } from "react-datepicker";
import { ptBR } from "date-fns/locale";
import "react-datepicker/dist/react-datepicker.css";
import { supabase } from "../../services/supabase";

type Role = "parent" | "child";

registerLocale("pt-BR", ptBR);

function formatISO(date: Date | null): string | null {
  if (!date) return null;
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function Register() {
  const navigate = useNavigate();

  const [role, setRole] = useState<Role>("parent");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [birthdate, setBirthdate] = useState<Date | null>(null);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    document.body.setAttribute(
      "data-role",
      role === "child" ? "child" : "parent",
    );
    return () => document.body.removeAttribute("data-role");
  }, [role]);

  const disabled = useMemo(() => {
    return (
      !name.trim() ||
      !email.trim() ||
      password.length < 6 ||
      password !== confirm ||
      busy
    );
  }, [busy, confirm, email, name, password]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (disabled) return;

    setBusy(true);
    setError(null);
    setInfo(null);

    try {
      const birthISO = formatISO(birthdate);
      const { error: signErr } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            name: name.trim(),
            role,
            birthdate: birthISO,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (signErr) {
        setError(signErr.message || "Não foi possível criar sua conta.");
        return;
      }

      setInfo(
        "Conta criada! Enviamos um e-mail de confirmação. Verifique sua caixa de entrada para continuar.",
      );
      setTimeout(() => navigate("/login", { replace: true }), 1200);
    } catch (err: any) {
      setError(
        err?.message || "Aconteceu um erro inesperado. Tente novamente mais tarde.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-[480px]">
        <div className="rounded-2xl bg-white border border-gray-100 shadow-[0_10px_30px_rgba(0,0,0,0.08)] p-6">
          <h1 className="text-2xl font-extrabold text-center text-gray-900">
            Criar conta
          </h1>
          <p className="text-sm text-center text-gray-500 mb-6">
            Vamos iniciar sua jornada no FinEdu Kids.
          </p>

          <div className="flex gap-2 mb-5" role="tablist" aria-label="Tipo de conta">
            <button
              type="button"
              onClick={() => setRole("parent")}
              className={`flex-1 rounded-xl border px-4 py-2 text-sm font-semibold transition ${
                role === "parent"
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
              }`}
              aria-selected={role === "parent"}
            >
              Responsável
            </button>
            <button
              type="button"
              onClick={() => setRole("child")}
              className={`flex-1 rounded-xl border px-4 py-2 text-sm font-semibold transition ${
                role === "child"
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
              }`}
              aria-selected={role === "child"}
            >
              Criança
            </button>
          </div>

          <form className="space-y-3" onSubmit={handleSubmit}>
            <input
              type="text"
              placeholder="Nome completo"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-3 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />

            <input
              type="email"
              placeholder="E-mail"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-3 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />

            <div>
              <label className="block text-sm text-gray-700 mb-1">
                Data de nascimento
              </label>
              <DatePicker
                selected={birthdate}
                onChange={setBirthdate}
                locale="pt-BR"
                dateFormat="dd/MM/yyyy"
                maxDate={new Date()}
                placeholderText="dd/mm/aaaa"
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-3 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                type="password"
                placeholder="Senha (mín. 6)"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-3 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
              <input
                type="password"
                placeholder="Confirmar senha"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-3 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}
            {info && (
              <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
                {info}
              </div>
            )}

            <button
              type="submit"
              disabled={disabled}
              className="w-full rounded-xl bg-blue-600 text-white font-semibold py-3 hover:brightness-105 disabled:opacity-60 disabled:cursor-not-allowed transition"
            >
              {busy ? "Criando conta…" : "Criar conta"}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-gray-500">
            Já possui uma conta?{" "}
            <Link className="text-blue-600 font-semibold" to="/login">
              Entrar
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
