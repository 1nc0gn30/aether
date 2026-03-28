import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { saveLoop } from '../lib/loops';

type BarCount = 4 | 8 | 12 | 16;

type AudioBus = {
  ctx: AudioContext;
  master: GainNode;
  compressor: DynamicsCompressorNode;
  analyser: AnalyserNode;
};

type Instrument = {
  id: number;
  name: string;
  key: string;
  colorClass: string;
};

const STEPS_PER_BAR = 16;
const MAX_HITS_PER_STEP = 4;
const INPUT_DEBOUNCE_MS = 70;

const instruments: Instrument[] = [
  { id: 0, name: 'Kick', key: 'A', colorClass: 'bg-acid-green/85' },
  { id: 1, name: 'Snare', key: 'S', colorClass: 'bg-cyan/85' },
  { id: 2, name: 'Hat', key: 'D', colorClass: 'bg-white/80' },
  { id: 3, name: 'Clap', key: 'F', colorClass: 'bg-amber/85' },
  { id: 4, name: 'Tom', key: 'J', colorClass: 'bg-acid-green/70' },
  { id: 5, name: 'Rim', key: 'K', colorClass: 'bg-cyan/70' },
  { id: 6, name: 'Perc', key: 'L', colorClass: 'bg-white/60' },
  { id: 7, name: 'Stab', key: ';', colorClass: 'bg-crimson/80' },
];

function createEmptySteps(totalSteps: number): number[][] {
  return Array.from({ length: totalSteps }, () => []);
}

function resizeSteps(prev: number[][], totalSteps: number): number[][] {
  if (prev.length === totalSteps) return prev;
  const next = createEmptySteps(totalSteps);
  const copyLength = Math.min(prev.length, totalSteps);
  for (let i = 0; i < copyLength; i += 1) {
    next[i] = [...prev[i]].slice(0, MAX_HITS_PER_STEP);
  }
  return next;
}

function withHit(stepHits: number[], instrumentId: number) {
  if (stepHits.includes(instrumentId)) return stepHits;
  if (stepHits.length >= MAX_HITS_PER_STEP) return stepHits;
  return [...stepHits, instrumentId].sort((a, b) => a - b);
}

function withoutHit(stepHits: number[], instrumentId: number) {
  return stepHits.filter((id) => id !== instrumentId);
}

function safeCreateNoise(ctx: AudioContext, durationSec: number) {
  const sampleFrames = Math.max(1, Math.floor(ctx.sampleRate * durationSec));
  const buffer = ctx.createBuffer(1, sampleFrames, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i += 1) {
    data[i] = Math.random() * 2 - 1;
  }
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  return src;
}

export default function Synthesizer() {
  const [bpm, setBpm] = useState(112);
  const [bars, setBars] = useState<BarCount>(4);
  const totalSteps = bars * STEPS_PER_BAR;
  const [steps, setSteps] = useState<number[][]>(() => createEmptySteps(4 * STEPS_PER_BAR));
  const [playhead, setPlayhead] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [loopName, setLoopName] = useState('Neon Drift');
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const audioRef = useRef<AudioBus | null>(null);
  const timerRef = useRef<number | null>(null);
  const animRef = useRef<number | null>(null);
  const analyserCanvasRef = useRef<HTMLCanvasElement>(null);
  const currentStepRef = useRef(0);
  const loopStartPerfRef = useRef(0);
  const lastInputRef = useRef<Record<number, number>>({});

  useEffect(() => {
    setSteps((prev) => resizeSteps(prev, totalSteps));
    setPlayhead((prev) => Math.min(prev, totalSteps - 1));
    currentStepRef.current = Math.min(currentStepRef.current, totalSteps - 1);
  }, [totalSteps]);

  const stepMs = useMemo(() => (60_000 / bpm) / 4, [bpm]);
  const loopMs = useMemo(() => totalSteps * stepMs, [stepMs, totalSteps]);

  const hitCount = useMemo(() => steps.reduce((sum, step) => sum + step.length, 0), [steps]);

  const ensureAudio = () => {
    if (audioRef.current) {
      if (audioRef.current.ctx.state === 'suspended') void audioRef.current.ctx.resume();
      return audioRef.current;
    }

    const Ctx = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return null;

    const ctx = new Ctx();
    const master = ctx.createGain();
    const compressor = ctx.createDynamicsCompressor();
    const analyser = ctx.createAnalyser();

    // Conservative output chain to reduce speaker clipping risk.
    master.gain.setValueAtTime(0.35, ctx.currentTime);
    compressor.threshold.setValueAtTime(-20, ctx.currentTime);
    compressor.knee.setValueAtTime(18, ctx.currentTime);
    compressor.ratio.setValueAtTime(12, ctx.currentTime);
    compressor.attack.setValueAtTime(0.003, ctx.currentTime);
    compressor.release.setValueAtTime(0.25, ctx.currentTime);

    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.82;

    master.connect(compressor);
    compressor.connect(analyser);
    analyser.connect(ctx.destination);

    audioRef.current = { ctx, master, compressor, analyser };
    return audioRef.current;
  };

  const playInstrument = (instrumentId: number, velocity = 1) => {
    const bus = ensureAudio();
    if (!bus) return;
    const { ctx, master } = bus;
    const now = ctx.currentTime;
    const v = Math.max(0.2, Math.min(1, velocity));

    if (instrumentId === 0) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(45, now + 0.18);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.25 * v, now + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
      osc.connect(gain);
      gain.connect(master);
      osc.start(now);
      osc.stop(now + 0.24);
      return;
    }

    if (instrumentId === 1) {
      const noise = safeCreateNoise(ctx, 0.2);
      const noiseFilter = ctx.createBiquadFilter();
      noiseFilter.type = 'highpass';
      noiseFilter.frequency.setValueAtTime(1600, now);
      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.17 * v, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);

      const body = ctx.createOscillator();
      const bodyGain = ctx.createGain();
      body.type = 'triangle';
      body.frequency.setValueAtTime(210, now);
      body.frequency.exponentialRampToValueAtTime(125, now + 0.13);
      bodyGain.gain.setValueAtTime(0.001, now);
      bodyGain.gain.exponentialRampToValueAtTime(0.11 * v, now + 0.01);
      bodyGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);

      noise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(master);
      body.connect(bodyGain);
      bodyGain.connect(master);

      noise.start(now);
      noise.stop(now + 0.2);
      body.start(now);
      body.stop(now + 0.18);
      return;
    }

    if (instrumentId === 2) {
      const noise = safeCreateNoise(ctx, 0.08);
      const filter = ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(5200, now);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.075 * v, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.07);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(master);
      noise.start(now);
      noise.stop(now + 0.08);
      return;
    }

    if (instrumentId === 3) {
      const noise = safeCreateNoise(ctx, 0.22);
      const band = ctx.createBiquadFilter();
      band.type = 'bandpass';
      band.frequency.setValueAtTime(1300, now);
      band.Q.setValueAtTime(0.8, now);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.09 * v, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);

      noise.connect(band);
      band.connect(gain);
      gain.connect(master);
      noise.start(now);
      noise.stop(now + 0.22);
      return;
    }

    const freqMap = [180, 760, 920, 420];
    const idx = Math.max(0, instrumentId - 4);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = instrumentId === 7 ? 'sawtooth' : instrumentId === 6 ? 'triangle' : 'square';
    osc.frequency.setValueAtTime(freqMap[idx] ?? 500, now);
    if (instrumentId === 4) {
      osc.frequency.exponentialRampToValueAtTime(95, now + 0.2);
    }
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(0.085 * v, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + (instrumentId === 7 ? 0.18 : 0.12));
    osc.connect(gain);
    gain.connect(master);
    osc.start(now);
    osc.stop(now + (instrumentId === 7 ? 0.2 : 0.13));
  };

  const stopPlayback = () => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    currentStepRef.current = 0;
    setPlayhead(0);
    setIsPlaying(false);
  };

  const startPlayback = () => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    const audio = ensureAudio();
    if (!audio) return;

    currentStepRef.current = 0;
    setPlayhead(0);
    loopStartPerfRef.current = performance.now();
    setIsPlaying(true);

    timerRef.current = window.setInterval(() => {
      const stepIndex = currentStepRef.current;
      const hits = steps[stepIndex] ?? [];
      if (hits.length > 0) {
        const velocity = Math.max(0.45, 1 - hits.length * 0.08);
        hits.forEach((id) => playInstrument(id, velocity));
      }

      setPlayhead(stepIndex);
      currentStepRef.current = (stepIndex + 1) % totalSteps;
    }, stepMs);
  };

  const togglePlayback = () => {
    if (isPlaying) {
      stopPlayback();
    } else {
      startPlayback();
    }
  };

  const triggerLivePad = (instrumentId: number) => {
    const now = performance.now();
    const last = lastInputRef.current[instrumentId] ?? 0;
    if (now - last < INPUT_DEBOUNCE_MS) return;
    lastInputRef.current[instrumentId] = now;

    playInstrument(instrumentId, 1);

    if (!isRecording || !isPlaying || loopMs <= 0) return;

    const elapsed = ((now - loopStartPerfRef.current) % loopMs + loopMs) % loopMs;
    const targetStep = Math.round(elapsed / stepMs) % totalSteps;

    setSteps((prev) => {
      const next = prev.map((arr) => [...arr]);
      next[targetStep] = withHit(next[targetStep], instrumentId);
      return next;
    });
  };

  const toggleStep = (instrumentId: number, stepIndex: number) => {
    setSteps((prev) => {
      const next = prev.map((arr) => [...arr]);
      const current = next[stepIndex] ?? [];
      next[stepIndex] = current.includes(instrumentId)
        ? withoutHit(current, instrumentId)
        : withHit(current, instrumentId);
      return next;
    });
  };

  const clearPattern = () => {
    setSteps(createEmptySteps(totalSteps));
    setSavedAt(null);
  };

  const savePattern = () => {
    if (hitCount === 0) return;
    const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;

    saveLoop({
      id,
      name: loopName.trim() || 'Untitled Loop',
      bpm,
      bars,
      steps,
      createdAt: new Date().toISOString(),
      visualSeed: Math.floor(Math.random() * 10_000_000),
    });

    setSavedAt(new Date().toLocaleTimeString());
  };

  useEffect(() => {
    const keyToId = new Map(instruments.map((inst) => [inst.key.toLowerCase(), inst.id]));

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      const id = keyToId.get(e.key.toLowerCase());
      if (id === undefined) return;
      e.preventDefault();
      triggerLivePad(id);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isPlaying, isRecording, loopMs, stepMs, totalSteps]);

  useEffect(() => {
    const draw = () => {
      const canvas = analyserCanvasRef.current;
      const audio = audioRef.current;
      if (!canvas) {
        animRef.current = requestAnimationFrame(draw);
        return;
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        animRef.current = requestAnimationFrame(draw);
        return;
      }

      const dpr = window.devicePixelRatio || 1;
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      const targetW = Math.floor(width * dpr);
      const targetH = Math.floor(height * dpr);

      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
      }

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, targetW, targetH);
      ctx.fillStyle = 'rgba(8, 10, 12, 0.75)';
      ctx.fillRect(0, 0, targetW, targetH);

      if (audio) {
        const bins = audio.analyser.frequencyBinCount;
        const data = new Uint8Array(bins);
        audio.analyser.getByteFrequencyData(data);
        const barCount = 42;
        const step = Math.max(1, Math.floor(bins / barCount));
        const barW = targetW / barCount;

        for (let i = 0; i < barCount; i += 1) {
          const v = data[i * step] / 255;
          const barH = Math.max(2, v * targetH * 0.9);
          const x = i * barW + 1;
          const y = targetH - barH;
          ctx.fillStyle = i % 2 === 0 ? 'rgba(57,255,20,0.72)' : 'rgba(0,243,255,0.72)';
          ctx.fillRect(x, y, Math.max(2, barW - 2), barH);
        }
      } else {
        ctx.fillStyle = 'rgba(148,163,184,0.7)';
        ctx.font = `${12 * dpr}px monospace`;
        ctx.fillText('Tap a pad to initialize audio output', 12 * dpr, 22 * dpr);
      }

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, []);

  useEffect(() => () => {
    stopPlayback();
  }, []);

  const density = Math.round((hitCount / Math.max(1, totalSteps)) * 100) / 100;

  return (
    <div className="page-shell px-4 pt-20 pb-28 sm:px-8 sm:pt-28">
      <motion.div
        className="absolute inset-0 z-0"
        animate={{
          background: isRecording
            ? 'radial-gradient(circle at 15% 18%, rgba(255,0,60,0.18), transparent 35%), radial-gradient(circle at 82% 22%, rgba(0,243,255,0.15), transparent 35%), radial-gradient(circle at 52% 84%, rgba(57,255,20,0.16), transparent 40%)'
            : 'radial-gradient(circle at 15% 18%, rgba(57,255,20,0.13), transparent 35%), radial-gradient(circle at 82% 22%, rgba(0,243,255,0.12), transparent 35%), radial-gradient(circle at 52% 84%, rgba(255,191,63,0.12), transparent 40%)',
        }}
        transition={{ duration: 0.35 }}
      />

      <div className="relative z-10 max-w-7xl mx-auto">
        <div className="mb-7">
          <p className="section-kicker mb-2">Node 03</p>
          <h1 className="text-3xl sm:text-5xl text-white/90">Synthesizer</h1>
          <p className="font-mono text-acid-green mt-3 text-xs sm:text-sm tracking-[0.08em] uppercase">
            Quantized beat recording with output protection and loop archive export.
          </p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
          <div className="xl:col-span-8 space-y-4">
            <div className="glass-panel border border-white/20 p-4 sm:p-5">
              <p className="section-kicker mb-3">Pad Matrix</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
                {instruments.map((inst) => (
                  <button
                    key={inst.id}
                    type="button"
                    onClick={() => triggerLivePad(inst.id)}
                    className="border border-white/20 hover:border-acid-green/70 bg-void/70 px-3 py-3 text-left transition-colors"
                  >
                    <p className="text-sm">{inst.name}</p>
                    <p className="font-mono text-[10px] text-white/55 mt-1">Key {inst.key}</p>
                  </button>
                ))}
              </div>

              <div className="overflow-x-auto pb-1">
                <div className="min-w-[58rem] space-y-2">
                  {instruments.map((inst) => (
                    <div key={inst.id} className="grid" style={{ gridTemplateColumns: `7rem repeat(${totalSteps}, minmax(0, 1fr))` }}>
                      <div className="pr-2 flex items-center justify-between">
                        <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-white/70">{inst.name}</span>
                        <span className="font-mono text-[10px] text-white/40">{inst.key}</span>
                      </div>
                      {Array.from({ length: totalSteps }).map((_, stepIndex) => {
                        const active = steps[stepIndex]?.includes(inst.id);
                        const isPlayhead = isPlaying && playhead === stepIndex;
                        const strongBeat = stepIndex % 4 === 0;
                        return (
                          <button
                            key={`${inst.id}-${stepIndex}`}
                            type="button"
                            onClick={() => toggleStep(inst.id, stepIndex)}
                            className={`h-6 border-r border-b ${strongBeat ? 'border-white/25' : 'border-white/10'} transition-colors ${active ? inst.colorClass : 'bg-white/5'} ${isPlayhead ? 'ring-1 ring-cyan ring-inset' : ''}`}
                            aria-label={`Toggle ${inst.name} at step ${stepIndex + 1}`}
                          />
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="glass-panel border border-white/20 p-4 sm:p-5">
              <p className="section-kicker mb-3">Output Meter</p>
              <canvas ref={analyserCanvasRef} className="w-full h-28 border border-white/15 bg-void/70" />
              <p className="font-mono text-[11px] text-white/55 mt-2 leading-relaxed">
                Master output runs through a compressor with conservative gain to reduce clipping and speaker spikes.
              </p>
            </div>
          </div>

          <div className="xl:col-span-4">
            <div className="glass-panel border border-white/20 p-4 sm:p-5 space-y-4 xl:sticky xl:top-24">
              <p className="section-kicker">Transport</p>

              <div>
                <label htmlFor="bpm" className="font-mono text-xs text-white/70 uppercase tracking-[0.08em]">BPM: {bpm}</label>
                <input
                  id="bpm"
                  type="range"
                  min={70}
                  max={176}
                  value={bpm}
                  onChange={(e) => setBpm(Number(e.target.value))}
                  className="w-full mt-2"
                />
              </div>

              <div>
                <p className="font-mono text-xs text-white/70 uppercase tracking-[0.08em] mb-2">Bars</p>
                <div className="grid grid-cols-4 gap-2">
                  {[4, 8, 12, 16].map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setBars(value as BarCount)}
                      className={`border px-2 py-2 font-mono text-xs ${bars === value ? 'border-acid-green text-acid-green bg-acid-green/10' : 'border-white/20 text-white/70 hover:border-white/50'}`}
                    >
                      {value}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={togglePlayback}
                  className={`font-mono text-xs uppercase tracking-[0.1em] border px-3 py-2 ${isPlaying ? 'border-crimson text-crimson bg-crimson/10' : 'border-acid-green text-acid-green bg-acid-green/10'}`}
                >
                  {isPlaying ? 'Stop' : 'Play'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsRecording((v) => !v)}
                  className={`font-mono text-xs uppercase tracking-[0.1em] border px-3 py-2 ${isRecording ? 'border-crimson text-crimson bg-crimson/10' : 'border-white/25 text-white/75 hover:border-white/55'}`}
                >
                  {isRecording ? 'Recording' : 'Record'}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={clearPattern}
                  className="font-mono text-xs uppercase tracking-[0.1em] border border-white/25 text-white/75 hover:border-white/55 px-3 py-2"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={savePattern}
                  disabled={hitCount === 0}
                  className="font-mono text-xs uppercase tracking-[0.1em] border border-cyan/70 text-cyan hover:bg-cyan/10 disabled:opacity-40 disabled:cursor-not-allowed px-3 py-2"
                >
                  Save Loop
                </button>
              </div>

              <div>
                <label htmlFor="loopName" className="font-mono text-xs text-white/70 uppercase tracking-[0.08em]">Loop Name</label>
                <input
                  id="loopName"
                  value={loopName}
                  onChange={(e) => setLoopName(e.target.value)}
                  className="w-full mt-2 bg-void/75 border border-white/20 focus:border-cyan outline-none px-2.5 py-2 font-mono text-xs"
                  placeholder="My loop"
                />
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="border border-white/20 p-2">
                  <p className="font-mono text-[10px] text-white/60 uppercase">Steps</p>
                  <p>{totalSteps}</p>
                </div>
                <div className="border border-white/20 p-2">
                  <p className="font-mono text-[10px] text-white/60 uppercase">Hits</p>
                  <p>{hitCount}</p>
                </div>
                <div className="border border-white/20 p-2">
                  <p className="font-mono text-[10px] text-white/60 uppercase">Density</p>
                  <p>{density}</p>
                </div>
              </div>

              <p className="font-mono text-[11px] text-white/55 leading-relaxed">
                Recording snaps taps to the nearest step for tighter timing. Rapid accidental double taps are filtered by a short debounce gate.
              </p>

              {savedAt && (
                <p className="font-mono text-[11px] text-acid-green">
                  Saved to archive at {savedAt}.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
