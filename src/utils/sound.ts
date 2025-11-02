// simples helper pra tocar sons curtos (efeitos)
let unlocked = false;
let audioCtx: AudioContext | null = null;

export function unlockAudio(): void {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    if (audioCtx.state === "suspended") audioCtx.resume();
    unlocked = true;
  } catch (e) {
    // silencioso
  }
}

export function isAudioUnlocked() {
  return unlocked;
}

// Toca um beep rápido usando WebAudio (sem asset)
export function playBeep(volume = 0.1, durationMs = 120, freq = 880) {
  if (!unlocked || !audioCtx) return;
  const ctx = audioCtx;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.frequency.value = freq;
  gain.gain.value = volume;
  osc.connect(gain).connect(ctx.destination);
  osc.start();
  setTimeout(() => {
    osc.stop();
    osc.disconnect();
    gain.disconnect();
  }, durationMs);
}

// Tocar um arquivo de áudio (ex.: /sounds/click.mp3)
let clickAudio: HTMLAudioElement | null = null;
export function playClick() {
  if (!unlocked) return;
  if (!clickAudio) clickAudio = new Audio("/sounds/click.mp3");
  // alguns browsers exigem set currentTime = 0 pra repetição rápida
  try { clickAudio.currentTime = 0; } catch {}
  clickAudio.play().catch(() => {});
}
