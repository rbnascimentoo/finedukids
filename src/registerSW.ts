type UpdateListener = (info: { waiting: ServiceWorker; registration: ServiceWorkerRegistration }) => void;

let registrationRef: ServiceWorkerRegistration | null = null;
let waitingRef: ServiceWorker | null = null;
const updateListeners = new Set<UpdateListener>();

export function onSWUpdate(cb: UpdateListener) {
  updateListeners.add(cb);
  return () => {
    updateListeners.delete(cb);
  };
}

export function applySWUpdate() {
  if (registrationRef?.waiting) {
    registrationRef.waiting.postMessage({ type: 'SKIP_WAITING' });
  } else if (waitingRef) {
    waitingRef.postMessage({ type: 'SKIP_WAITING' });
  }
}