import { useEffect, useMemo, useState } from "react";
import BottomNavChild from "../../components/BottomNavChild";
import { getCurrentUser, getUserById } from "../../services/auth";
import { getKidByUser, type Kid } from "../../services/storage";
import { getCatalog, redeemReward, type Reward, readRedemptions } from "../../services/rewards";
import { playClick } from "../../utils/sound";
import { AiOutlineStar } from "react-icons/ai";
import Modal from "../../components/Modal";
import { addTx } from "../../services/tx";

/** Linguagem automática por idade */
type LanguageLevel = "crianca" | "adolescente" | "jovem";
function calcAge(birthISO?: string | null): number | null {
  if (!birthISO) return null;
  const b = new Date(birthISO);
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--;
  return age;
}
function languageFromAge(age: number | null): LanguageLevel {
  if (age === null) return "crianca";
  if (age <= 10) return "crianca";
  if (age <= 14) return "adolescente";
  return "jovem";
}
function fmtBR(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function RewardsPage() {
  const user = getCurrentUser();
  const [kid, setKid] = useState<Kid | null>(null);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [redeemed, setRedeemed] = useState<ReturnType<typeof readRedemptions>>([]);
  const [filter, setFilter] = useState<"all" | "diversao" | "educacao" | "saude">("all");

  // estado dos modais
  const [openConfirm, setOpenConfirm] = useState(false);
  const [openSuccess, setOpenSuccess] = useState(false);
  const [selected, setSelected] = useState<Reward | null>(null);
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    document.body.setAttribute("data-role", "child");
    if (!user) return;
    const k = getKidByUser(user.id);
    if (k) {
      setKid(k);
      setRedeemed(readRedemptions(k.id));
    }
    setRewards(getCatalog());

    // ouvir resgates feitos por esta ou outras telas
    const onRedeem = () => {
      const kk = getKidByUser(user.id);
      if (kk) {
        setKid(kk);
        setRedeemed(readRedemptions(kk.id));
      }
    };
    window.addEventListener("kid-redeemed", onRedeem as EventListener);
    window.addEventListener("storage", onRedeem as EventListener);
    return () => {
      window.removeEventListener("kid-redeemed", onRedeem as EventListener);
      window.removeEventListener("storage", onRedeem as EventListener);
    };
  }, [user?.id]);

  // linguagem
  const childUser = useMemo(() => (kid?.userId ? getUserById(kid.userId) : null), [kid?.userId]);
  const level: LanguageLevel = useMemo(
    () => languageFromAge(calcAge(childUser?.birthdate)),
    [childUser?.birthdate]
  );

  const saldoFmt = useMemo(
    () => (kid ? fmtBR(kid.saldo) : fmtBR(0)),
    [kid?.saldo]
  );

  const view = useMemo(
    () => (filter === "all" ? rewards : rewards.filter(r => r.tag === filter)),
    [rewards, filter]
  );

  function askRedeem(r: Reward) {
    setSelected(r);
    setErrMsg(null);
    setOpenConfirm(true);
  }

  async function doRedeem() {
    if (!kid || !selected) return;
    setProcessing(true);
    setErrMsg(null);
    try {
      const res = redeemReward(kid, selected);
      if (!res.ok) {
        setErrMsg(res.error || "Não foi possível resgatar.");
        return;
      }
      try { playClick(); } catch {}
      setOpenConfirm(false);
      setOpenSuccess(true);

      addTx(kid.id, {
        type: "redeem",
        amount: -selected.price,
        description: `Resgate: ${selected.title}`,
      });
    } finally {
      setProcessing(false);
    }
  }

  function successMessage() {
    if (!selected) return "";
    if (level === "crianca") return "Prêmio resgatado! 🎉";
    if (level === "adolescente") return "Recompensa resgatada!";
    return "Conquista trocada com sucesso.";
  }

  if (!kid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg)]">
        <p className="text-gray-600">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] pb-24">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 shadow-sm sticky top-0">
        <div className="px-4 py-3 max-w-full md:max-w-[640px] mx-auto flex items-center gap-3">
          <AiOutlineStar className="w-6 h-6 text-blue-600" />
          <h1 className="text-[17px] font-semibold text-gray-900">
            {level === "crianca" ? "Prêmios" : level === "adolescente" ? "Recompensas" : "Conquistas"}
          </h1>
          <div className="ml-auto text-xs text-gray-500">
            Saldo: <span className="font-semibold text-blue-700">{saldoFmt}</span>
          </div>
        </div>
      </header>

      {/* Conteúdo */}
      <main className="px-4 py-4 max-w-full md:max-w-[640px] mx-auto space-y-6">
        {/* Filtros */}
        <section className="bg-white border border-gray-100 rounded-2xl p-3">
          <div className="grid grid-cols-4 gap-2">
            {[
              { k: "all", label: "Todos" },
              { k: "diversao", label: "Diversão" },
              { k: "educacao", label: "Educação" },
              { k: "saude", label: "Saúde" },
            ].map(({ k, label }) => (
              <button
                key={k}
                onClick={() => setFilter(k as any)}
                className={`rounded-xl px-3 py-2 text-sm font-semibold border ${
                  filter === k
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </section>

        {/* Grid de recompensas */}
        <section className="grid grid-cols-1 gap-3">
          {view.map((r) => {
            const can = kid.saldo >= r.price;
            return (
              <div
                key={r.id}
                className="bg-white border border-gray-100 rounded-2xl p-4 flex items-center gap-3"
              >
                <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-xl">
                  🎁
                </div>

                <div className="flex-1">
                  <p className="font-semibold text-gray-900">{r.title}</p>
                  {r.desc && <p className="text-xs text-gray-500">{r.desc}</p>}
                  <p className="text-sm font-semibold text-gray-900 mt-1">
                    {fmtBR(r.price)}
                  </p>
                </div>

                <button
                  disabled={!can}
                  onClick={() => askRedeem(r)}
                  className={`rounded-xl px-3 py-2 text-sm font-semibold border ${
                    can
                      ? "bg-blue-600 text-white border-blue-600 hover:brightness-105"
                      : "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                  }`}
                >
                  Trocar
                </button>
              </div>
            );
          })}

          {view.length === 0 && (
            <div className="bg-white border border-gray-100 rounded-2xl p-5 text-center text-gray-600">
              Nenhuma recompensa disponível neste filtro.
            </div>
          )}
        </section>

        {/* Últimos resgates */}
        <section>
          <h2 className="text-sm font-semibold text-gray-700 mb-3">
            {level === "crianca" ? "Últimos prêmios" : "Últimos resgates"}
          </h2>
        {redeemed.length === 0 ? (
            <div className="bg-white border border-gray-100 rounded-2xl p-5 text-center text-gray-600">
              Você ainda não resgatou recompensas.
            </div>
          ) : (
            <ul className="bg-white border border-gray-100 rounded-2xl divide-y">
              {redeemed.slice(0, 10).map((it) => (
                <li key={it.id} className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{it.title}</p>
                    <p className="text-xs text-gray-500">{new Date(it.at).toLocaleString("pt-BR")}</p>
                  </div>
                  <p className="text-sm font-semibold text-red-600">- {fmtBR(it.price)}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>

      {/* Modal de confirmação */}
      <Modal
        open={openConfirm}
        title="Confirmar troca"
        onClose={() => { if (!processing) setOpenConfirm(false); }}
        footer={
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setOpenConfirm(false)}
              disabled={processing}
              className="rounded-xl bg-white text-gray-700 font-semibold px-4 py-2 border border-gray-200 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              onClick={doRedeem}
              disabled={processing}
              className={`rounded-xl bg-blue-600 text-white font-semibold px-4 py-2 border border-blue-600 hover:brightness-105 ${processing ? "opacity-80 cursor-not-allowed" : ""}`}
            >
              {processing ? "Trocando..." : "Confirmar"}
            </button>
          </div>
        }
      >
        {!selected ? (
          <p className="text-sm text-gray-600">Carregando...</p>
        ) : (
          <div className="space-y-2">
            {errMsg && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                {errMsg}
              </div>
            )}
            <p className="text-sm text-gray-800">
              Você deseja trocar <b>{selected.title}</b> por <b>{fmtBR(selected.price)}</b>?
            </p>
            <p className="text-xs text-gray-500">
              Seu saldo atual é <b>{saldoFmt}</b>.
            </p>
          </div>
        )}
      </Modal>

      {/* Modal de sucesso */}
      <Modal
        open={openSuccess}
        title="Tudo certo!"
        onClose={() => setOpenSuccess(false)}
        footer={
          <div className="flex justify-end">
            <button
              onClick={() => setOpenSuccess(false)}
              className="rounded-xl bg-blue-600 text-white font-semibold px-4 py-2 border border-blue-600 hover:brightness-105"
            >
              Ok
            </button>
          </div>
        }
      >
        <div className="space-y-2">
          <p className="text-sm text-gray-800">{successMessage()}</p>
          {selected && (
            <p className="text-xs text-gray-500">
              Você trocou <b>{selected.title}</b> por <b>{fmtBR(selected.price)}</b>.
            </p>
          )}
        </div>
      </Modal>

      <BottomNavChild />
    </div>
  );
}
