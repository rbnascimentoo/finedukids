export const isOnline = () => typeof navigator !== "undefined" ? navigator.onLine : true;

export function onNetChange(cb: (online: boolean) => void) {
  const hOnline = () => cb(true);
  const hOffline = () => cb(false);
  window.addEventListener("online", hOnline);
  window.addEventListener("offline", hOffline);
  return () => {
    window.removeEventListener("online", hOnline);
    window.removeEventListener("offline", hOffline);
  };
}
