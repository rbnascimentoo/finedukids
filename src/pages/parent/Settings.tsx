import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import BottomNavParent from "../../components/BottomNavParent";
import { supabase } from "../../services/supabase";

type ParentPrefs = {
  notificationsEnabled: boolean;
  soundEnabled: boolean;
};

const DEFAULT_PREFS: ParentPrefs = {
  notificationsEnabled: true,
  soundEnabled: true,
};

const PREFS_KEY = "finedu_parent_prefs";

function loadPrefs(): ParentPrefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return DEFAULT_PREFS;
    const parsed = JSON.parse(raw);
    return {
      notificationsEnabled:
        typeof parsed.notificationsEnabled === "boolean"
          ? parsed.notificationsEnabled
          : DEFAULT_PREFS.notificationsEnabled,
      soundEnabled:
        typeof parsed.soundEnabled === "boolean"
          ? parsed.soundEnabled
          : DEFAULT_PREFS.soundEnabled,
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

function persistPrefs(prefs: ParentPrefs) {
  localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("parent-prefs-changed", { detail: prefs }),
    );
  }
}

export default function ParentSettings() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [profileName, setProfileName] = useState<string>("");
  const [profileEmail, setProfileEmail] = useState<string>("");
  const [avatarUrl, setAvatarUrl] = useState<string>("");

  const [prefs, setPrefs] = useState<ParentPrefs>(DEFAULT_PREFS);

  useEffect(() => {
    document.body.setAttribute("data-role", "parent");
    return () => document.body.removeAttribute("data-role");
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setError(null);
        const { data } = await supabase.auth.getSession();
        const user = data.session?.user;

        if (!user) {
          navigate("/login", { replace: true });
          return;
        }

        if (!mounted) return;

        setProfileEmail(user.email ?? "");

        const { data: profile } = await supabase
          .from("profiles")
          .select("name, avatar_url, notifications_enabled, sound_enabled")
          .eq("id", user.id)
          .maybeSingle();

        if (profile) {
          setProfileName(profile.name ?? "");
          setAvatarUrl(profile.avatar_url ?? "");
          setPrefs({
            notificationsEnabled:
              typeof profile.notifications_enabled === "boolean"
                ? profile.notifications_enabled
                : loadPrefs().notificationsEnabled,
            soundEnabled:
              typeof profile.sound_enabled === "boolean"
                ? profile.sound_enabled
                : loadPrefs().soundEnabled,
          });
        } else {
          setPrefs(loadPrefs());
        }
      } catch (e: any) {
        setError(e?.message || "Não foi possível carregar suas preferências.");
        setPrefs(loadPrefs());
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [navigate]);

  const initials = useMemo(() => {
    if (avatarUrl) return "";
    if (!profileName) {
      const email = profileEmail || "";
      return email.slice(0, 2).toUpperCase();
    }
    const tokens = profileName.trim().split(" ").filter(Boolean);
    if (!tokens.length) return "";
    if (tokens.length === 1) return tokens[0][0]?.toUpperCase() ?? "";
    return `${tokens[0][0]}${tokens[tokens.length - 1][0]}`.toUpperCase();
  }, [avatarUrl, profileEmail, profileName]);

  async function handleToggle(
    key: keyof ParentPrefs,
    value: boolean,
  ): Promise<void> {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    persistPrefs(next);

    try {
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user;
      if (!user) return;
      await supabase
        .from("profiles")
        .update({
          notifications_enabled: next.notificationsEnabled,
          sound_enabled: next.soundEnabled,
        })
        .eq("id", user.id);
    } catch {
      // silencioso: mantemos apenas localmente
    }
  }

  async function handleSignOut() {
    try {
      await supabase.auth.signOut();
    } catch {
      // ignore
    }
    navigate("/login", { replace: true });
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg)]">
        <span className="text-gray-500 text-sm">Carregando preferências…</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] pb-24">
      <div className="max-w-[640px] mx-auto px-4 py-6">
        <h1 className="text-xl font-semibold text-gray-900 mb-4">
          Configurações
        </h1>

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <section className="bg-white border border-gray-100 rounded-2xl p-4 mb-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">
            Conta
          </h2>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-lg font-semibold overflow-hidden">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={profileName || "Avatar"}
                  className="w-full h-full object-cover"
                />
              ) : (
                initials || profileName.slice(0, 1).toUpperCase()
              )}
            </div>
            <div>
              <p className="text-base font-semibold text-gray-900">
                {profileName || "Responsável"}
              </p>
              <p className="text-sm text-gray-500">{profileEmail}</p>
            </div>
          </div>
        </section>

        <section className="bg-white border border-gray-100 rounded-2xl p-4 mb-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">
            Preferências
          </h2>
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium text-gray-900">
                Notificações
              </p>
              <p className="text-xs text-gray-500">
                Receber alertas sobre mesadas e missões.
              </p>
            </div>
            <label className="inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only"
                checked={prefs.notificationsEnabled}
                onChange={(e) =>
                  handleToggle("notificationsEnabled", e.target.checked)
                }
              />
              <span
                className={`h-6 w-11 rounded-full transition ${
                  prefs.notificationsEnabled ? "bg-blue-600" : "bg-gray-300"
                }`}
              >
                <span
                  className={`block h-5 w-5 rounded-full bg-white shadow transform transition duration-200 ${
                    prefs.notificationsEnabled ? "translate-x-5" : "translate-x-1"
                  }`}
                />
              </span>
            </label>
          </div>

          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium text-gray-900">Sons</p>
              <p className="text-xs text-gray-500">
                Reproduzir efeitos sonoros na navegação.
              </p>
            </div>
            <label className="inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only"
                checked={prefs.soundEnabled}
                onChange={(e) =>
                  handleToggle("soundEnabled", e.target.checked)
                }
              />
              <span
                className={`h-6 w-11 rounded-full transition ${
                  prefs.soundEnabled ? "bg-blue-600" : "bg-gray-300"
                }`}
              >
                <span
                  className={`block h-5 w-5 rounded-full bg-white shadow transform transition duration-200 ${
                    prefs.soundEnabled ? "translate-x-5" : "translate-x-1"
                  }`}
                />
              </span>
            </label>
          </div>
        </section>

        <section className="bg-white border border-gray-100 rounded-2xl p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">
            Sessão
          </h2>
          <button
            onClick={handleSignOut}
            className="w-full rounded-xl border border-red-500 bg-red-500 text-white font-semibold py-2 hover:brightness-105 transition"
          >
            Sair da conta
          </button>
        </section>
      </div>

      <BottomNavParent />
    </div>
  );
}
