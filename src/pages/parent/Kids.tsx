// src/pages/parent/Kids.tsx
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import BottomNavParent from "../../components/BottomNavParent";
import Modal from "../../components/Modal";

import {
  getKidsByParent,
  creditMesadaLocal,
  deleteKid,
  type Kid,
} from "../../services/storage";
import { addTx } from "../../services/tx";
import { supabase } from "../../services/supabase";
import { createInvitation } from "../../services/invitations";

import {
  AiOutlinePlusCircle,
  AiOutlineBarChart,
  AiOutlineDollarCircle,
  AiOutlineMail,
  AiOutlineDelete,
} from "react-icons/ai";

export default function Kids() {
  const nav = useNavigate();

  // Tema
  useEffect(() => {
    document.body.setAttribute("data-role", "parent");
    return () => document.body.removeAttribute("data-role");
  }, []);

  // Sessão (parent)
  const [parentId, setParentId] = useState<string>("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      const u = data.session?.user;

      if (!u?.id) {
        nav("/login", { replace: true });
        return;
      }
      setParentId(u.id);
    })();
  }, [nav]);

  // Lista de crianças
  const [kids, setKids] = useState<Kid[]>([]);
  const [loadingKids, setLoadingKids] = useState(false);

  async function loadKids(pid: string) {
    setLoadingKids(true);
    try {
      const list = await getKidsByParent(pid);
      setKids(list);
    } finally {
      setLoadingKids(false);
    }
  }

  useEffect(() => {
    if (!parentId) return;

    (async () => {
      await loadKids(parentId);
    })();

    // Se você despacha eventos customizados no storage, pode re-carregar aqui:
    const onStorage = () => loadKids(parentId);
    window.addEventListener("storage", onStorage as EventListener);

    return () => {

      window.removeEventListener("storage", onStorage as EventListener);
    };
  }, [parentId]);

  const totalSaldo = useMemo(
    () => kids.reduce((acc, k) => acc + (k.saldo || 0), 0),
    [kids]
  );

  // Destaque de saldo atualizado
  const [highlightId, setHighlightId] = useState<string | null>(null);

  // -------------------------
  // Modal: Crédito extra
  // -------------------------
  const [openExtra, setOpenExtra] = useState(false);
  const [extraKidId, setExtraKidId] = useState<string | null>(null);
  const [extraAmount, setExtraAmount] = useState<string>("10.00");
  const [extraDesc, setExtraDesc] = useState<string>("");
  const [extraError, setExtraError] = useState<string | null>(null);
  const [extraBusy, setExtraBusy] = useState(false);

  function openExtraModal(kidId: string) {
    setExtraKidId(kidId);
    setExtraAmount("10.00");
    setExtraDesc("");
    setExtraError(null);
    setOpenExtra(true);
  }

  async function saveExtraCredit() {
    if (!extraKidId) return;
    setExtraError(null);
    setExtraBusy(true);
    try {
      const num =
        typeof extraAmount === "string"
          ? parseFloat(extraAmount)
          : Number(extraAmount);
      if (!isFinite(num) || num <= 0) {
        setExtraError("Informe um valor válido (maior que zero).");
        return;
      }

      // Histórico local
      addTx(extraKidId, {
        type: "mesada",
        amount: num,
        description: extraDesc?.trim() || "Crédito extra",
      });

      // UI otimista
      setKids((prev) =>
        prev.map((k) =>
          k.id === extraKidId ? { ...k, saldo: (k.saldo || 0) + num } : k
        )
      );

      // Persistência local de compatibilidade
      creditMesadaLocal(extraKidId, num);

      // Persistência remota (best-effort)
      try {
        const kidNow = kids.find((x) => x.id === extraKidId);
        const newBalance = (kidNow?.saldo || 0) + num;
        await supabase
          .from("kids")
          .update({ balance: newBalance })
          .eq("id", extraKidId)
          .eq("parent_id", parentId);
      } catch {
        // não trava a UI
      }

      setOpenExtra(false);
      setHighlightId(extraKidId);
      setTimeout(() => setHighlightId(null), 900);
    } finally {
      setExtraBusy(false);
    }
  }

  // -------------------------
  // Modal: Convite por e-mail (envio automático)
  // -------------------------
  const [openInvite, setOpenInvite] = useState(false);
  const [inviteKidId, setInviteKidId] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteLoading, setInviteLoading] = useState(false);

  function openInviteModal(kidId: string) {
    setInviteKidId(kidId);
    setInviteEmail("");
    setInviteUrl(null);
    setInviteError(null);
    setOpenInvite(true);
  }

  async function handleGenerateAndSendInvite() {
    if (!inviteKidId) return;
    setInviteError(null);
    setInviteLoading(true);
    try {
      // 1) Cria convite (gera token + url)
      const created = await createInvitation(parentId, inviteKidId, inviteEmail);
      if (!created.ok) {
        setInviteError(created.error || "Não foi possível gerar o convite.");
        return;
      }
      setInviteUrl(created.url);

      // 2) Envia e-mail via Edge Function
      const { data: { user } } = await supabase.auth.getUser();
      const pName = user?.user_metadata?.name || user?.email || "Responsável";
      const kName = kids.find((x) => x.id === inviteKidId)?.nome || undefined;

      const { data, error: fnErr } = await supabase.functions.invoke("send-invite", {
        body: {
          to: inviteEmail,
          token: created.token,
          kidName: kName,
          parentName: pName,
        },
      });

      if (fnErr || !data?.ok) {
        setInviteError(
          "Convite criado, mas não foi possível enviar o e-mail automaticamente. Copie o link e compartilhe."
        );
        return;
      }
      // sucesso: mantemos a URL para compartilhamento manual opcional
    } finally {
      setInviteLoading(false);
    }
  }

  // -------------------------
  // Modal: Confirmar exclusão
  // -------------------------
  const [openConfirmDelete, setOpenConfirmDelete] = useState(false);
  const [deletingKid, setDeletingKid] = useState<Kid | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function askDelete(k: Kid) {
    setDeletingKid(k);
    setDeleteError(null);
    setOpenConfirmDelete(true);
  }

  async function confirmDelete() {
    if (!deletingKid) return;
    setDeleteBusy(true);
    setDeleteError(null);
    try {
      await deleteKid(deletingKid.id, parentId); // soft delete remoto + remove do local
      setKids((prev) => prev.filter((x) => x.id !== deletingKid.id));
      setOpenConfirmDelete(false);
      setDeletingKid(null);
    } catch (e: any) {
      setDeleteError(e?.message || "Não foi possível excluir a criança.");
    } finally {
      setDeleteBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] pb-24">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 shadow-sm sticky top-0">
        <div className="px-4 py-3 max-w-full md:max-w-[640px] mx-auto">
          <h1 className="text-[17px] font-semibold text-gray-900">Crianças</h1>
        </div>
      </header>

      {/* Conteúdo */}
      <main className="px-4 py-4 max-w-full md:max-w-[640px] mx-auto">
        {/* Ações rápidas (opcional) */}
        <section className="mb-6">
          <div className="grid grid-cols-2 gap-3">
            <Link
              to="/parent/kids/new"
              className="flex items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white py-3 hover:bg-gray-50 transition"
            >
              <AiOutlinePlusCircle className="w-6 h-6 text-blue-600" />
              <span className="text-sm font-semibold text-gray-900">
                Adicionar criança
              </span>
            </Link>

            <button
              onClick={() => nav("/parent/progress")}
              className="flex items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white py-3 hover:bg-gray-50 transition"
            >
              <AiOutlineBarChart className="w-6 h-6 text-blue-600" />
              <span className="text-sm font-semibold text-gray-900">
                Progresso
              </span>
            </button>
          </div>
        </section>

        {/* Resumo */}
        <section className="mb-4">
          <div className="bg-white border border-gray-100 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Saldo total</p>
              <p className="text-2xl font-extrabold text-blue-700 tabular-nums">
                R$ {totalSaldo.toFixed(2)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Crianças</p>
              <p className="text-xl font-bold text-gray-900">{kids.length}</p>
            </div>
          </div>
        </section>

        {/* Lista */}
        <section className="space-y-3">
          {loadingKids && (
            <div className="bg-white border border-gray-100 rounded-2xl p-5 text-center text-gray-600">
              Carregando crianças…
            </div>
          )}

          {!loadingKids && kids.length === 0 && (
            <div className="bg-white border border-gray-100 rounded-2xl p-5 text-center text-gray-600">
              Nenhuma criança cadastrada.{" "}
              <Link
                to="/parent/kids/new"
                className="text-blue-600 font-semibold hover:underline"
              >
                Adicionar agora
              </Link>
            </div>
          )}

          {kids.map((k) => (
            <div
              key={k.id}
              className="bg-white border border-gray-100 rounded-2xl p-4 shadow-card"
            >
              <div className="flex items-center gap-3">
                <img
                  src={k.avatar || "https://i.pravatar.cc/80"}
                  alt={k.nome}
                  className="w-12 h-12 rounded-full object-cover"
                />
                <div className="flex-1">
                  <p className="font-semibold text-gray-900 leading-tight">
                    {k.nome}
                  </p>
                  <p className="text-xs text-gray-500">
                    Mesada semanal: <b>R$ {k.mesadaSemanal.toFixed(2)}</b>
                  </p>
                </div>

                <div className="text-right">
                  <p
                    className={`font-extrabold tabular-nums transition-all duration-500 ${
                      highlightId === k.id
                        ? "text-green-600 scale-110"
                        : "text-blue-700"
                    }`}
                  >
                    R$ {k.saldo.toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-500">Saldo</p>
                </div>
              </div>

              {/* Ações do card */}
              <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2">
                {/* Mesada semanal */}
                <button
                  onClick={() => {
                    const v = k.mesadaSemanal || 0;

                    // Histórico
                    addTx(k.id, {
                      type: "mesada",
                      amount: v,
                      description: "Crédito de mesada semanal",
                    });

                    // UI otimista
                    setKids((prev) =>
                      prev.map((x) =>
                        x.id === k.id ? { ...x, saldo: (x.saldo || 0) + v } : x
                      )
                    );
                    setHighlightId(k.id);
                    setTimeout(() => setHighlightId(null), 900);

                    // Local compat
                    creditMesadaLocal(k.id, v);

                    // Remoto (best-effort)
                    (async () => {
                      try {
                        await supabase
                          .from("kids")
                          .update({ balance: k.saldo + v })
                          .eq("id", k.id)
                          .eq("parent_id", parentId);
                      } catch {}
                    })();
                  }}
                  className="rounded-xl bg-white text-blue-700 font-semibold py-2 border border-blue-200 hover:bg-blue-50 flex items-center justify-center gap-2"
                >
                  <AiOutlineDollarCircle className="w-5 h-5" />
                  Mesada
                </button>

                {/* Crédito extra */}
                <button
                  onClick={() => openExtraModal(k.id)}
                  className="rounded-xl bg-white text-gray-700 font-semibold py-2 border border-gray-200 hover:bg-gray-50"
                >
                  Crédito extra
                </button>

                {/* Detalhes */}
                <Link
                  to={`/parent/kids/${k.id}`}
                  className="text-center rounded-xl bg-white text-gray-700 font-semibold py-2 border border-gray-200 hover:bg-gray-50"
                >
                  Detalhes
                </Link>

                {/* Progresso */}
                <button
                  onClick={() => nav(`/parent/progress?kid=${k.id}`)}
                  className="rounded-xl bg-white text-gray-700 font-semibold py-2 border border-gray-200 hover:bg-gray-50"
                >
                  Progresso
                </button>

                {/* Convidar por e-mail (se não vinculado a um user) */}
                {!((k as any).user_id ?? (k as any).userId) && (
                  <button
                    onClick={() => openInviteModal(k.id)}
                    className="rounded-xl bg-white text-blue-700 font-semibold py-2 border border-blue-200 hover:bg-blue-50 flex items-center justify-center gap-2 col-span-2 md:col-span-1"
                  >
                    <AiOutlineMail className="w-5 h-5" />
                    Convidar por e-mail
                  </button>
                )}

                {/* Excluir */}
                <button
                  onClick={() => askDelete(k)}
                  className="rounded-xl bg-white text-red-600 font-semibold py-2 border border-red-200 hover:bg-red-50 flex items-center justify-center gap-2 col-span-2 md:col-span-1"
                >
                  <AiOutlineDelete className="w-5 h-5" />
                  Excluir
                </button>
              </div>
            </div>
          ))}
        </section>
      </main>

      <BottomNavParent />

      {/* Modal: Crédito extra */}
      <Modal
        open={openExtra}
        title="Creditar extra"
        onClose={() => setOpenExtra(false)}
        footer={
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setOpenExtra(false)}
              className="rounded-xl bg-white text-gray-700 font-semibold px-4 py-2 border border-gray-200 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              onClick={saveExtraCredit}
              disabled={extraBusy}
              className="rounded-xl bg-blue-600 text-white font-semibold px-4 py-2 border border-blue-600 hover:brightness-105 disabled:opacity-60"
            >
              {extraBusy ? "Salvando…" : "Salvar"}
            </button>
          </div>
        }
      >
        <div className="space-y-3">
          <label className="block text-sm text-gray-700">Valor (R$)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={extraAmount}
            onChange={(e) => setExtraAmount(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-3 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
          <label className="block text-sm text-gray-700">Descrição (opcional)</label>
          <input
            type="text"
            value={extraDesc}
            onChange={(e) => setExtraDesc(e.target.value)}
            placeholder="Motivo do crédito"
            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-3 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />

          {extraError && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
              {extraError}
            </div>
          )}
        </div>
      </Modal>

      {/* Modal: Convidar por e-mail */}
      <Modal
        open={openInvite}
        title="Convidar criança por e-mail"
        onClose={() => setOpenInvite(false)}
        footer={
          <div className="flex justify-end gap-2">
            {inviteUrl ? (
              <>
                <button
                  onClick={() => navigator.clipboard.writeText(inviteUrl!)}
                  className="rounded-xl bg-white text-gray-700 font-semibold px-4 py-2 border border-gray-200 hover:bg-gray-50"
                >
                  Copiar link
                </button>
                <button
                  onClick={() => setOpenInvite(false)}
                  className="rounded-xl bg-blue-600 text-white font-semibold px-4 py-2 border border-blue-600 hover:brightness-105"
                >
                  Fechar
                </button>
              </>
            ) : (
              <button
                onClick={handleGenerateAndSendInvite}
                disabled={inviteLoading}
                className="rounded-xl bg-blue-600 text-white font-semibold px-4 py-2 border border-blue-600 hover:brightness-105 disabled:opacity-60"
              >
                {inviteLoading ? "Gerando…" : "Gerar e enviar convite"}
              </button>
            )}
          </div>
        }
      >
        <div className="space-y-3">
          {!inviteUrl ? (
            <>
              <p className="text-sm text-gray-600">
                Informe o e-mail da criança. Um convite será enviado para que ela aceite o vínculo.
              </p>
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="crianca@exemplo.com"
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-3 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
              {inviteError && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                  {inviteError}
                </div>
              )}
            </>
          ) : (
            <>
              <p className="text-sm text-gray-600">
                Convite criado e e-mail enviado! Se preferir, você pode compartilhar o link abaixo:
              </p>
              <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 break-all text-sm">
                {inviteUrl}
              </div>
              <p className="text-xs text-gray-500">
                Dica: clique em “Copiar link” para compartilhar por WhatsApp, e-mail, etc.
              </p>
            </>
          )}
        </div>
      </Modal>

      {/* Modal: Confirmar exclusão */}
      <Modal
        open={openConfirmDelete}
        title="Excluir criança"
        onClose={() => setOpenConfirmDelete(false)}
        footer={
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setOpenConfirmDelete(false)}
              className="rounded-xl bg-white text-gray-700 font-semibold px-4 py-2 border border-gray-200 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              onClick={confirmDelete}
              disabled={deleteBusy}
              className="rounded-xl bg-red-600 text-white font-semibold px-4 py-2 border border-red-600 hover:brightness-105 disabled:opacity-60"
            >
              {deleteBusy ? "Excluindo…" : "Excluir"}
            </button>
          </div>
        }
      >
        <div className="space-y-3">
          {deleteError && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
              {deleteError}
            </div>
          )}
          <p className="text-sm text-gray-600">
            Tem certeza que deseja excluir{" "}
            <b>{deletingKid?.nome || "esta criança"}</b>? Esta ação é permanente.
          </p>
        </div>
      </Modal>
    </div>
  );
}
