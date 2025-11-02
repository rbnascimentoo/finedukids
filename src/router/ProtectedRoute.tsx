// src/routes/ProtectedRoute.tsx
import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "../services/supabase";

type Role = "parent" | "child";
type Props = {
  children: React.ReactElement;
  requiredRole?: Role; // se omitido, só exige sessão
};

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

async function getRoleSafe(): Promise<Role | null> {
  const { data: u } = await supabase.auth.getUser();
  const uid = u?.user?.id;
  const metaRole = (u?.user?.user_metadata as any)?.role as Role | undefined;

  if (!uid) return metaRole ?? null;

  // tenta pelo profiles.role
  const { data: prof, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", uid)
    .maybeSingle();

  if (!error && prof?.role) {
    return prof.role as Role;
  }
  // fallback para metadata
  return metaRole ?? null;
}

export default function ProtectedRoute({ children, requiredRole }: Props) {
  const [status, setStatus] = useState<
    | "checking"      // validando sessão/role
    | "no-session"    // não logado
    | "wrong-role"    // logado, mas role não bate
    | "ok"            // liberado
  >("checking");

  useEffect(() => {
    let mounted = true;
    (async () => {
      const session = await ensureSession();
      if (!mounted) return;

      if (!session?.user) {
        setStatus("no-session");
        return;
      }

      if (!requiredRole) {
        setStatus("ok");
        return;
      }

      // tenta obter a role de forma resiliente
      const role = await getRoleSafe();
      if (!mounted) return;

      if (role && role !== requiredRole) {
        setStatus("wrong-role");
      } else {
        // se role == null (não conseguiu ler), não bloqueia: deixa entrar
        setStatus("ok");
      }
    })();

    return () => { mounted = false; };
  }, [requiredRole]);

  if (status === "checking") {
    return <div className="p-4 text-gray-600">Carregando…</div>;
  }
  if (status === "no-session") {
    return <Navigate to="/login" replace />;
  }
  if (status === "wrong-role") {
    // se bater errado, manda para a outra dashboard
    return <Navigate to="/child" replace />;
  }
  return children;
}
