export type NotifPermission = "default" | "denied" | "granted";

export function getNotificationPermission(): NotifPermission {
  return (typeof Notification !== "undefined" ? Notification.permission : "denied") as NotifPermission;
}

export async function requestNotificationPermission(): Promise<NotifPermission> {
  if (typeof Notification === "undefined") return "denied";
  try {
    const res = await Notification.requestPermission();
    return res as NotifPermission;
  } catch {
    return "denied";
  }
}

// Exibe uma notificação simples (foreground)
export async function showLocalNotification(title: string, options?: NotificationOptions) {
  if (getNotificationPermission() !== "granted") return;
  // tenta pelo SW se existir (melhor para background)
  const reg = await navigator.serviceWorker?.getRegistration();
  if (reg) {
    reg.showNotification(title, options);
  } else {
    new Notification(title, options);
  }
}

/** ---------- PUSH (opcional, se quiser avançar) ---------- */
// Assina push com VAPID. Precisa do service worker ativo e um backend para guardar a subscription.
export async function subscribePush(publicVapidKey: string) {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    throw new Error("Push não suportado neste navegador.");
  }
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  if (sub) return sub;

  const convertedKey = urlBase64ToUint8Array(publicVapidKey);
  return reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: convertedKey,
  });
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}
