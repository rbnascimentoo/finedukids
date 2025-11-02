function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

/**
 * Solicita permissão e cria a assinatura de push.
 * @param vapidPublicKey Sua chave pública VAPID (base64url)
 * @returns subscription (JSON) ou null se negado/falhou
 */
export async function subscribeToPush(vapidPublicKey: string) {
  if (!('serviceWorker' in navigator)) return null;
  if (!('PushManager' in window)) return null;

  const perm = await Notification.requestPermission();
  if (perm !== 'granted') return null;

  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
  });

  // Exemplo: salvar localmente e depois enviar ao backend
  localStorage.setItem('push_subscription', JSON.stringify(sub));
  return sub.toJSON ? sub.toJSON() : sub;
}

/** Cancela a assinatura (opcional) */
export async function unsubscribeFromPush() {
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  if (sub) {
    await sub.unsubscribe();
    localStorage.removeItem('push_subscription');
    return true;
  }
  return false;
}
