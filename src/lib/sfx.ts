let audioCtx: AudioContext | null = null;
const SFX_KEY = 'aether:sfx';

export function getSfxEnabled() {
  if (typeof window === 'undefined') return true;
  const raw = window.localStorage.getItem(SFX_KEY);
  if (raw === null) return true;
  return raw === '1';
}

export function setSfxEnabled(enabled: boolean) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(SFX_KEY, enabled ? '1' : '0');
}

function getContext(): AudioContext | null {
  if (!getSfxEnabled()) return null;
  if (typeof window === 'undefined') return null;
  const Ctx = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return null;
  if (!audioCtx) audioCtx = new Ctx();
  if (audioCtx.state === 'suspended') {
    void audioCtx.resume();
  }
  return audioCtx;
}

function tone(freq: number, duration: number, type: OscillatorType, gainLevel: number, when = 0) {
  const ctx = getContext();
  if (!ctx) return;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ctx.currentTime + when);

  gain.gain.setValueAtTime(0, ctx.currentTime + when);
  gain.gain.linearRampToValueAtTime(gainLevel, ctx.currentTime + when + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + when + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(ctx.currentTime + when);
  osc.stop(ctx.currentTime + when + duration + 0.02);
}

function noise(duration: number, gainLevel: number) {
  const ctx = getContext();
  if (!ctx) return;
  const buffer = ctx.createBuffer(1, ctx.sampleRate * duration, ctx.sampleRate);
  const output = buffer.getChannelData(0);
  for (let i = 0; i < output.length; i++) {
    output[i] = (Math.random() * 2 - 1) * 0.6;
  }
  const source = ctx.createBufferSource();
  const filter = ctx.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.setValueAtTime(1200, ctx.currentTime);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(gainLevel, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

  source.buffer = buffer;
  source.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  source.start();
  source.stop(ctx.currentTime + duration);
}

export function playOracleFlipSfx() {
  tone(220, 0.2, 'triangle', 0.09);
  tone(659.25, 0.25, 'sine', 0.07, 0.08);
}

export function playOracleDrawSfx() {
  tone(146.83, 0.22, 'sawtooth', 0.06);
  tone(329.63, 0.18, 'triangle', 0.05, 0.12);
}

export function playArchiveOpenSfx() {
  tone(196, 0.14, 'square', 0.05);
  noise(0.09, 0.025);
}

export function playArchiveFilterSfx() {
  tone(392, 0.1, 'sine', 0.05);
}
