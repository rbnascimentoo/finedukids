// src/pages/auth/Reset.tsx
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../../services/supabase";

export default function Reset() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();

  useEffect(() => {
    // tema neutro (pode usar 'parent' se quiser)
    document.body.setAttribute("data-role", "parent");
    return () => document.body.removeAttribute("data-role");
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setErr(null);
    setLoading(true);
    try {
      // URL para onde o Supabase redirecionará após o usuário definir a nova senha.
      // Altere para uma rota sua (ex.: /update-password) e implemente essa página se desejar.
      const redirectTo = `${window.location.origin}/update-password`;

      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo,
      });

      if (error) {
        setErr(error.message || "Não foi possível iniciar a redefinição de senha.");
        return;
      }

      setMsg("Caso o e-mail exista, você receberá um e-mail com instruções para redefinir sua senha.");
    } catch (e: any) {
      setErr(e?.message || "Erro inesperado ao solicitar redefinição.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg)] px-4">
      <div className="w-full max-w-[420px]">
        <div className="rounded-2xl bg-white shadow-[0_10px_30px_rgba(0,0,0,0.06)] border border-gray-100 p-6">
          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <span className="text-xl">🔑</span>
          </div>
          <h1 className="text-xl font-extrabold text-center text-gray-900">Esqueceu a senha?</h1>
          <p className="text-center text-gray-500 mt-1 mb-5">
            Sem problemas! Informe seu e-mail que vamos te ajudar a recuperar o acesso.
          </p>

          <form onSubmit={onSubmit} className="space-y-3">
            <label className="block text-sm text-gray-700">E-mail</label>
            <input
              type="email"
              required
              placeholder="voce@exemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-3 focus:outline-none focus:ring-2 focus:ring-blue-200"
              autoComplete="email"
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
              {loading ? "Enviando..." : "Redefinir senha"}
            </button>
          </form>

          <div className="mt-4">
            <button onClick={() => nav(-1)} className="text-sm text-gray-600 hover:underline">
              ← Voltar para Login
            </button>
          </div>

          <div className="mt-2 text-center text-sm">
            <Link to="/register" className="text-blue-600 hover:underline">
              Criar conta
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
