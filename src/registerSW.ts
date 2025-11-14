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

// Para o app saber quando o controlador trocar (após skipWaiting)
function listenControllerChange() {
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    // Após assumir o novo SW, recarrega a página p/ usar assets atualizados
    window.location.reload();
  });
}

export function registerSW() {
  if (!('serviceWorker' in navigator)) return;

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/service-worker.js')
      .then((reg) => {
        registrationRef = reg;

        // SW novo encontrado
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (!newWorker) return;

          newWorker.addEventListener('statechange', () => {
            // Quando o novo worker fica "installed" e já existe controlador, há uma update pronta
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              waitingRef = reg.waiting || newWorker;
              for (const cb of updateListeners) {
                cb({ waiting: waitingRef!, registration: reg });
              }
            }
          });
        });

        // Caso a página carregue já com um waiting (cenário de refresh)
        if (reg.waiting) {
          waitingRef = reg.waiting;
          for (const cb of updateListeners) {
            cb({ waiting: waitingRef, registration: reg });
          }
        }

        listenControllerChange();
      })
      .catch((err) => console.error('[SW] register error', err));
  });
}
