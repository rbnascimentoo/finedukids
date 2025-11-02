import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { acceptInvitation } from "../../services/invitations";
import { supabase } from "../../services/supabase";

export default function AcceptInvite() {
  const [sp] = useSearchParams();
  const nav = useNavigate();
  const token = sp.get("token") || "";
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!token) { setErr("Convite inválido."); setLoading(false); return; }

      // usuário precisa estar autenticado (criança)
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        // guarda caminho e envia para login
        sessionStorage.setItem("post_login_redirect", `/invite?token=${token}`);
        nav("/login?msg=acesse_para_aceitar", { replace: true });
        return;
      }

      const res = await acceptInvitation(token);
      if (!alive) return;

      if (!res.ok) {
        setErr(res.error || "Não foi possível aceitar o convite.");
        setLoading(false);
        return;
      }

      setMsg("Convite aceito com sucesso! Sua conta foi vinculada.");
      setLoading(false);

      // redireciona para o dashboard da criança
      setTimeout(() => nav("/child", { replace: true }), 1200);
    })();
    return () => { alive = false; };
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg)] px-4">
      <div className="w-full max-w-[420px] rounded-2xl bg-white shadow-[0_10px_30px_rgba(0,0,0,0.06)] border border-gray-100 p-6">
        <h1 className="text-xl font-extrabold text-center text-gray-900">Convite</h1>
        <p className="text-center text-gray-500 mt-1 mb-5">Vincular conta da criança</p>

        {loading && <div className="text-center text-gray-600">Validando convite…</div>}
        {!loading && msg && <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-xl px-3 py-2">{msg}</div>}
        {!loading && err && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{err}</div>}
      </div>
    </div>
  );
}
