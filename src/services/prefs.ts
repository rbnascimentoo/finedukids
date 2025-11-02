export type ChildPrefs = {
  sound: boolean;
  notifications: boolean;
};

const DEFAULT_PREFS: ChildPrefs = {
  sound: true,
  notifications: true,
};

const KEY = (kidId: string) => `finedu_child_prefs_${kidId}`;

export function loadChildPrefs(kidId: string | null | undefined): ChildPrefs {
  if (!kidId) return DEFAULT_PREFS;
  try {
    const raw = localStorage.getItem(KEY(kidId));
    if (!raw) return DEFAULT_PREFS;
    const obj = JSON.parse(raw);
    return {
      sound: typeof obj.sound === "boolean" ? obj.sound : DEFAULT_PREFS.sound,
      notifications:
        typeof obj.notifications === "boolean"
          ? obj.notifications
          : DEFAULT_PREFS.notifications,
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

export function saveChildPrefs(kidId: string | null | undefined, prefs: ChildPrefs) {
  if (!kidId) return;
  localStorage.setItem(KEY(kidId), JSON.stringify(prefs));
  // evento opcional para outros componentes ouvirem
  window.dispatchEvent(new CustomEvent("child-prefs-changed", { detail: { kidId, prefs } }));
}
