import { useEffect, useMemo, useRef, useState } from "react";
import {
  AiOutlineSound,
  AiOutlineBell,
  AiOutlineUser,
  AiOutlineCalendar,
  AiOutlinePicture,
  AiOutlineLogout,
} from "react-icons/ai";
import { useNavigate } from "react-router-dom";
import BottomNavChild from "../../components/BottomNavChild";
import { makeAuthRepo, makeKidsRepo, makePrefsRepo } from "../../repository/Factory";
import type { Prefs } from "../../repository/PrefsRepo";
import { subscribeToPush, unsubscribeFromPush } from "../../utils/push";

/** Cálculo de idade e linguagem por idade (somente leitura) */
type LanguageLevel = "crianca" | "adolescente" | "jovem";
function calcAge(birthISO?: string | null): number | null {
  if (!birthISO) return null;
  const b = new Date(birthISO);
  if (isNaN(b.getTime())) return null;
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
function levelLabel(level: LanguageLevel) {
  if (level === "crianca") return "Criança";
  if (level === "adolescente") return "Adolescente";
  return "Jovem";
}

/** Helpers data */
function isoToYmd(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
function ymdToIso(ymd: string) {
  if (!ymd) return undefined;
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1);
  return dt.toISOString();
}

export default function ChildSettings() {
  const navigate = useNavigate();

  const auth = useMemo(() => makeAuthRepo(), []);
  const kidsRepo = useMemo(() => makeKidsRepo(), []);
  const prefsRepo = useMemo(() => makePrefsRepo(), []);

  // ids
  const [userId, setUserId] = useState<string>("");
  const [kidId, setKidId] = useState<string>("");

  // perfil
  const [displayName, setDisplayName] = useState("");
  const [birthYmd, setBirthYmd] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // linguagem (somente leitura)
  const [level, setLevel] = useState<LanguageLevel>("crianca");

  // prefs
  const [prefs, setPrefs] = useState<Prefs>({ sound: false, notifications: false });
  const [prefsHint, setPrefsHint] = useState<string | null>(null);

  // estado UI
  const [loading, setLoading] = useState(true);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // tema criança
  useEffect(() => {
    document.body.setAttribute("data-role", "child");
    return () => document.body.removeAttribute("data-role");
  }, []);

  // carregar dados (somente usuário criança)
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const me = await auth.getCurrentUser();
        if (!me || me.role !== "child") {
          navigate("/login");
          return;
        }
        setUserId(me.id);
        setDisplayName(me.name || "");
        setBirthYmd(isoToYmd(me.birthdate));
        setAvatarUrl(me.avatarUrl ?? null);

        const kid = await kidsRepo.getByUser(me.id);
        if (!kid) {
          setSaveMsg("Conta de criança não encontrada.");
          return;
        }
        setKidId(kid.id);

        // linguagem por idade
        setLevel(languageFromAge(calcAge(me.birthdate)));

        // prefs
        const loaded = await prefsRepo.get(kid.id);
        setPrefs(loaded);
      } catch (e) {
        console.error(e);
        setSaveMsg("Não foi possível carregar suas configurações.");
      } finally {
        setLoading(false);
      }
    })();
  }, [auth, kidsRepo, prefsRepo, navigate]);

  // salvar prefs (debounce leve)
  useEffect(() => {
    if (!kidId) return;
    const t = setTimeout(async () => {
      try {
        await prefsRepo.set(kidId, prefs);
        setPrefsHint("Preferências salvas");
        setTimeout(() => setPrefsHint(null), 1200);
      } catch (e) {
        console.error(e);
        setPrefsHint("Falha ao salvar preferências.");
      }
    }, 200);
    return () => clearTimeout(t);
  }, [kidId, prefs, prefsRepo]);

  // handlers prefs
  const toggleSound = () => setPrefs((p) => ({ ...p, sound: !p.sound }));
  
  const toggleNotifications = async () => {
    if (!prefs.notifications) {
      try {
        if (!("Notification" in window)) {
          setPrefsHint("Navegador não suporta notificações.");
          return;
        }
        const perm = await Notification.requestPermission();
        if (perm !== "granted") {
          setPrefsHint("Permissão de notificação negada.");
          return;
        }
        const vapidPK = (import.meta.env.VITE_VAPID_PUBLIC_KEY as string) || "";
        if (vapidPK && "serviceWorker" in navigator && "PushManager" in window) {
          try {
            const sub = await subscribeToPush(vapidPK);
            console.log("[push] assinatura:", sub);
            // TODO: Enviar `sub` ao backend para push real
          } catch (err) {
            console.warn("Falha ao assinar push:", err);
          }
        }
        setPrefs((p) => ({ ...p, notifications: true }));
        setPrefsHint("Notificações ativadas.");
        return;
      } catch (err) {
        console.error(err);
        setPrefsHint("Não foi possível ativar notificações agora.");
        return;
      }
    }
    try {
      await unsubscribeFromPush();
    } catch {}
    setPrefs((p) => ({ ...p, notifications: false }));
    setPrefsHint("Notificações desativadas.");
  };

  // handlers conta
  const pickAvatar = () => fileInputRef.current?.click();
  const onAvatarFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file); // preview (upload real depois com Supabase Storage)
    setAvatarUrl(url);
  };

  const saveAccount = async () => {
    setSaveMsg(null);
    try {
      // Atualiza no KidsRepo (fonte de verdade para dados da criança)
      if (kidId) {
        await kidsRepo.update(kidId, {
          nome: displayName.trim() || "Criança",
          birthdate: birthYmd ? ymdToIso(birthYmd) : undefined,
          avatarUrl: avatarUrl || undefined,
        } as any);
      }
      // Opcional: refletir também no auth (nome/avatar básicos)
      if (userId) {
        await auth.updateUser({
          id: userId,
          name: displayName.trim(),
          birthdate: birthYmd ? ymdToIso(birthYmd) : undefined,
          avatarUrl: avatarUrl || undefined,
        } as any);
      }
      // Recalcular linguagem por idade
      setLevel(languageFromAge(calcAge(ymdToIso(birthYmd) || null)));

      setSaveMsg("Dados salvos com sucesso! Alterações de nome/idade podem exigir o ok dos responsáveis.");
      setTimeout(() => setSaveMsg(null), 2000);
    } catch (e: any) {
      console.error(e);
      setSaveMsg(e?.message || "Erro ao salvar dados.");
    }
  };

  if (loading) return <div className="max-w-[640px] mx-auto p-4">Carregando...</div>;

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <div className="max-w-[640px] mx-auto p-4 pb-24">
        <h1 className="text-xl font-bold mb-4">Configurações</h1>

        {/* Conta */}
        <section className="bg-white rounded-2xl border border-gray-100 p-4 mb-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Minha conta</h2>

          {/* Avatar */}
          <div className="flex items-center gap-3 mb-3">
            <img
              src={avatarUrl || "/images/avatar-default.png"}
              alt="Avatar"
              className="w-14 h-14 rounded-xl border border-gray-200 object-cover bg-gray-50"
            />
            <div className="flex gap-2">
              <button
                onClick={pickAvatar}
                className="px-3 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold inline-flex items-center gap-2"
              >
                <AiOutlinePicture /> Trocar foto
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={onAvatarFile}
              />
              <button
                onClick={() => setAvatarUrl(null)}
                className="px-3 py-2 rounded-xl bg-gray-100 text-gray-800 text-sm font-semibold"
              >
                Remover
              </button>
            </div>
          </div>

          {/* Nome */}
          <div className="mb-3">
            <label className="text-xs text-gray-600 flex items-center gap-1 mb-1">
              <AiOutlineUser /> Nome
            </label>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Digite seu nome"
              className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>

          {/* Nascimento */}
          <div className="mb-2">
            <label className="text-xs text-gray-600 flex items-center gap-1 mb-1">
              <AiOutlineCalendar /> Data de nascimento
            </label>
            <input
              type="date"
              value={birthYmd}
              onChange={(e) => setBirthYmd(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
              lang="pt-BR"
            />
            <p className="text-[11px] text-gray-500 mt-1">
              Alterações de nome/idade podem exigir o ok dos responsáveis.
            </p>
          </div>

          {/* Linguagem do app (somente leitura) */}
          <div className="mt-3">
            <p className="text-xs text-gray-600 mb-1">Linguagem no app</p>
            <div className="inline-flex items-center gap-2">
              <span className="px-2 py-1 rounded-lg bg-blue-50 text-blue-700 text-xs font-semibold">
                {levelLabel(level)}
              </span>
              <span className="text-[11px] text-gray-500">
                (definida automaticamente pela sua idade)
              </span>
            </div>
          </div>

          {/* Salvar */}
          <div className="flex items-center justify-between mt-4">
            <div className="text-xs text-gray-500">{saveMsg}</div>
            <button
              onClick={saveAccount}
              className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold"
            >
              Salvar alterações
            </button>
          </div>
        </section>

        {/* Preferências */}
        <section className="space-y-3 mb-4">
          {/* Sons */}
          <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                <AiOutlineSound className="text-blue-600 w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Sons do app</p>
                <p className="text-xs text-gray-500">Efeitos sonoros e toques</p>
              </div>
            </div>
            <button
              onClick={toggleSound}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                prefs.sound ? "bg-blue-600" : "bg-gray-300"
              }`}
              aria-pressed={prefs.sound}
              aria-label="Alternar som"
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${
                  prefs.sound ? "translate-x-5" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          {/* Notificações */}
          <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                <AiOutlineBell className="text-blue-600 w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Notificações</p>
                <p className="text-xs text-gray-500">Lembretes e avisos importantes</p>
              </div>
            </div>
            <button
              onClick={toggleNotifications}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                prefs.notifications ? "bg-blue-600" : "bg-gray-300"
              }`}
              aria-pressed={prefs.notifications}
              aria-label="Alternar notificações"
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${
                  prefs.notifications ? "translate-x-5" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          {prefsHint && (
            <div className="text-xs text-green-600" role="status">
              {prefsHint}
            </div>
          )}
        </section>

        {/* Sair */}
        <section className="mt-6">
          <button
            onClick={async () => {
              try { await auth.signOut(); } catch {}
              navigate("/login");
            }}
            className="w-full justify-center gap-2 px-4 py-2 rounded-xl bg-gray-100 text-gray-800 text-sm font-semibold inline-flex items-center"
          >
            <AiOutlineLogout className="w-5 h-5" /> Sair
          </button>
          <p className="text-[11px] text-gray-500 mt-1">
            Ao sair, você poderá entrar novamente quando quiser.
          </p>
        </section>
      </div>

      <BottomNavChild />
    </div>
  );
}
