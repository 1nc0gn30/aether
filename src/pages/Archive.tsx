import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { deleteLoop, getSavedLoops, type SavedLoop } from '../lib/loops';
import { playArchiveFilterSfx, playArchiveOpenSfx } from '../lib/sfx';

const padFreqs = [
  261.63, 293.66, 329.63, 349.23, 392.0, 440.0, 493.88, 523.25,
  587.33, 659.25, 698.46, 783.99, 880.0, 987.77, 1046.5, 1174.66,
];

type SortMode = 'newest' | 'oldest' | 'dense' | 'sparse' | 'tempo-up' | 'tempo-down';
type BarFilter = 'all' | 4 | 8 | 12 | 16;

type LoopMetrics = {
  hits: number;
  occupied: number;
  density: number;
};

function hashHue(seed: number, offset: number) {
  return (seed * 37 + offset * 61) % 360;
}

function getMetrics(loop: SavedLoop): LoopMetrics {
  const hits = loop.steps.reduce((sum, step) => sum + step.length, 0);
  const occupied = loop.steps.filter((step) => step.length > 0).length;
  const density = Math.round((hits / Math.max(1, loop.steps.length)) * 100) / 100;
  return { hits, occupied, density };
}

export default function Archive() {
  const [loops, setLoops] = useState<SavedLoop[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playhead, setPlayhead] = useState(0);
  const [energy, setEnergy] = useState(0);
  const [query, setQuery] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('newest');
  const [barFilter, setBarFilter] = useState<BarFilter>('all');

  const audioCtxRef = useRef<AudioContext | null>(null);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    const current = getSavedLoops();
    setLoops(current);
    setActiveId(current[0]?.id ?? null);
  }, []);

  const filteredLoops = useMemo(() => {
    const q = query.trim().toLowerCase();
    const next = loops.filter((loop) => {
      const namePass = q.length === 0 || loop.name.toLowerCase().includes(q);
      const barsPass = barFilter === 'all' || loop.bars === barFilter;
      return namePass && barsPass;
    });

    next.sort((a, b) => {
      if (sortMode === 'newest') return b.createdAt.localeCompare(a.createdAt);
      if (sortMode === 'oldest') return a.createdAt.localeCompare(b.createdAt);
      if (sortMode === 'tempo-up') return b.bpm - a.bpm;
      if (sortMode === 'tempo-down') return a.bpm - b.bpm;
      if (sortMode === 'dense') return getMetrics(b).density - getMetrics(a).density;
      return getMetrics(a).density - getMetrics(b).density;
    });

    return next;
  }, [loops, query, sortMode, barFilter]);

  useEffect(() => {
    if (!activeId) {
      setActiveId(filteredLoops[0]?.id ?? null);
      return;
    }
    if (!filteredLoops.some((loop) => loop.id === activeId)) {
      setActiveId(filteredLoops[0]?.id ?? null);
    }
  }, [filteredLoops, activeId]);

  const activeLoop = useMemo(() => filteredLoops.find((l) => l.id === activeId) ?? null, [filteredLoops, activeId]);

  const metrics = activeLoop ? getMetrics(activeLoop) : { hits: 0, occupied: 0, density: 0 };

  const h1 = activeLoop ? hashHue(activeLoop.visualSeed, 1) : 180;
  const h2 = activeLoop ? hashHue(activeLoop.visualSeed, 2) : 120;
  const h3 = activeLoop ? hashHue(activeLoop.visualSeed, 3) : 35;

  const ensureAudio = () => {
    if (audioCtxRef.current) return audioCtxRef.current;
    const ctx = new (window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext!)();
    audioCtxRef.current = ctx;
    return ctx;
  };

  const playPadTone = (padIdx: number, gain = 0.08) => {
    const freq = padFreqs[padIdx] ?? 261.63;
    const ctx = ensureAudio();
    if (ctx.state === 'suspended') void ctx.resume();

    const osc = ctx.createOscillator();
    const hp = ctx.createBiquadFilter();
    const g = ctx.createGain();

    hp.type = 'highpass';
    hp.frequency.setValueAtTime(48, ctx.currentTime);

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.linearRampToValueAtTime(Math.min(0.12, gain), ctx.currentTime + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);

    osc.connect(hp);
    hp.connect(g);
    g.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.26);
  };

  const stopPlayback = () => {
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsPlaying(false);
    setPlayhead(0);
    setEnergy(0);
  };

  const startPlayback = () => {
    if (!activeLoop) return;
    if (intervalRef.current) window.clearInterval(intervalRef.current);
    const stepMs = (60_000 / activeLoop.bpm) / 4;
    let step = 0;
    setIsPlaying(true);
    setPlayhead(0);

    intervalRef.current = window.setInterval(() => {
      const pads = activeLoop.steps[step] ?? [];
      pads.forEach((p, i) => playPadTone(p, 0.05 + Math.min(0.06, pads.length * 0.015) + i * 0.004));
      setEnergy(Math.min(1, pads.length / 4));
      setPlayhead(step);
      step = (step + 1) % activeLoop.steps.length;
    }, stepMs);
  };

  useEffect(() => () => stopPlayback(), []);

  useEffect(() => {
    stopPlayback();
  }, [activeId]);

  const refreshLoops = (nextActive?: string | null) => {
    const current = getSavedLoops();
    setLoops(current);
    setActiveId(nextActive ?? current[0]?.id ?? null);
  };

  const handleDelete = (id: string) => {
    const isCurrent = id === activeId;
    deleteLoop(id);
    refreshLoops(isCurrent ? null : activeId);
  };

  return (
    <div className="page-shell px-4 pt-20 pb-28 sm:px-8 sm:pt-28">
      <motion.div
        className="absolute inset-0 z-0"
        animate={{
          background: `radial-gradient(circle at 15% 20%, hsla(${h1}, 90%, 55%, ${0.08 + energy * 0.25}), transparent 35%), radial-gradient(circle at 80% 25%, hsla(${h2}, 90%, 55%, ${0.08 + energy * 0.22}), transparent 36%), radial-gradient(circle at 50% 85%, hsla(${h3}, 90%, 55%, ${0.08 + energy * 0.3}), transparent 40%)`,
        }}
        transition={{ duration: 0.35 }}
      />
      <motion.div
        className="absolute inset-0 z-0"
        animate={{ opacity: isPlaying ? 0.22 + energy * 0.45 : 0.06 }}
        transition={{ duration: 0.12 }}
        style={{
          backgroundImage: 'linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px)',
          backgroundSize: '38px 38px',
        }}
      />

      <div className="relative z-10 max-w-7xl mx-auto">
        <div className="mb-7">
          <p className="section-kicker mb-2">Node 02</p>
          <h1 className="text-3xl sm:text-5xl text-white/90">Archive Loop Vault</h1>
          <p className="font-mono text-acid-green mt-3 text-xs sm:text-sm tracking-[0.08em] uppercase">
            Search, sort, and inspect saved loops with a clearer rhythm profile.
          </p>
        </div>

        <div className="glass-panel border border-white/20 p-4 sm:p-5 mb-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search loop name"
              className="bg-void/75 border border-white/20 focus:border-cyan outline-none px-3 py-2 font-mono text-xs"
            />
            <select
              value={sortMode}
              onChange={(e) => {
                setSortMode(e.target.value as SortMode);
                playArchiveFilterSfx();
              }}
              className="bg-void/75 border border-white/20 focus:border-cyan outline-none px-3 py-2 font-mono text-xs"
            >
              <option value="newest">Sort: Newest</option>
              <option value="oldest">Sort: Oldest</option>
              <option value="dense">Sort: Density High</option>
              <option value="sparse">Sort: Density Low</option>
              <option value="tempo-up">Sort: BPM High</option>
              <option value="tempo-down">Sort: BPM Low</option>
            </select>
            <select
              value={String(barFilter)}
              onChange={(e) => {
                const raw = e.target.value;
                setBarFilter(raw === 'all' ? 'all' : Number(raw) as BarFilter);
                playArchiveFilterSfx();
              }}
              className="bg-void/75 border border-white/20 focus:border-cyan outline-none px-3 py-2 font-mono text-xs"
            >
              <option value="all">Bars: All</option>
              <option value="4">Bars: 4</option>
              <option value="8">Bars: 8</option>
              <option value="12">Bars: 12</option>
              <option value="16">Bars: 16</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-7 space-y-3">
            {loops.length === 0 && (
              <div className="glass-panel border border-white/20 p-5">
                <p className="font-mono text-sm text-white/70">No saved loops yet. Record one in Synth and save to archive.</p>
              </div>
            )}

            {loops.length > 0 && filteredLoops.length === 0 && (
              <div className="glass-panel border border-white/20 p-5">
                <p className="font-mono text-sm text-white/70">No loops match the current search/filter.</p>
              </div>
            )}

            {filteredLoops.map((loop) => {
              const active = loop.id === activeId;
              const m = getMetrics(loop);
              return (
                <button
                  key={loop.id}
                  type="button"
                  onClick={() => {
                    setActiveId(loop.id);
                    playArchiveOpenSfx();
                  }}
                  className={`w-full text-left border p-4 transition-colors ${active ? 'border-acid-green bg-acid-green/10' : 'border-white/20 bg-void/70 hover:border-white/50'}`}
                >
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="px-2 py-1 text-[10px] font-mono border border-white/25 text-white/75 uppercase">{loop.bpm} BPM</span>
                    <span className="px-2 py-1 text-[10px] font-mono border border-white/25 text-white/75 uppercase">{loop.bars} Bars</span>
                    <span className="px-2 py-1 text-[10px] font-mono border border-white/25 text-white/75 uppercase">{loop.steps.length} Steps</span>
                    <span className="px-2 py-1 text-[10px] font-mono border border-white/25 text-white/75 uppercase">{m.hits} Hits</span>
                    <span className="px-2 py-1 text-[10px] font-mono border border-white/25 text-white/75 uppercase">Density {m.density}</span>
                  </div>
                  <h3 className="text-xl">{loop.name}</h3>
                  <p className="font-mono text-xs text-white/60 mt-1">{new Date(loop.createdAt).toLocaleString()}</p>
                </button>
              );
            })}
          </div>

          <div className="lg:col-span-5">
            <div className="glass-panel border border-white/20 p-4 sm:p-5 lg:sticky lg:top-24">
              <p className="section-kicker mb-3">Loop Console</p>
              {!activeLoop && <p className="font-mono text-sm text-white/70">Select a loop from the left.</p>}
              {activeLoop && (
                <div>
                  <h3 className="text-2xl mb-3">{activeLoop.name}</h3>
                  <div className="grid grid-cols-4 gap-2 mb-4">
                    <div className="border border-white/20 p-2 text-center">
                      <p className="font-mono text-[10px] text-white/60 uppercase">Bpm</p>
                      <p>{activeLoop.bpm}</p>
                    </div>
                    <div className="border border-white/20 p-2 text-center">
                      <p className="font-mono text-[10px] text-white/60 uppercase">Bars</p>
                      <p>{activeLoop.bars}</p>
                    </div>
                    <div className="border border-white/20 p-2 text-center">
                      <p className="font-mono text-[10px] text-white/60 uppercase">Hits</p>
                      <p>{metrics.hits}</p>
                    </div>
                    <div className="border border-white/20 p-2 text-center">
                      <p className="font-mono text-[10px] text-white/60 uppercase">Filled</p>
                      <p>{metrics.occupied}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mb-4">
                    <button
                      type="button"
                      onClick={() => (isPlaying ? stopPlayback() : startPlayback())}
                      className={`font-mono text-xs uppercase tracking-[0.1em] border px-3 py-2 ${isPlaying ? 'border-crimson text-crimson bg-crimson/10' : 'border-acid-green text-acid-green bg-acid-green/10'}`}
                    >
                      {isPlaying ? 'Stop' : 'Play'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(activeLoop.id)}
                      className="font-mono text-xs uppercase tracking-[0.1em] border px-3 py-2 border-white/30 text-white/75 hover:border-white/60"
                    >
                      Delete
                    </button>
                  </div>

                  <div className="overflow-x-auto pb-1">
                    <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${activeLoop.steps.length}, minmax(10px, 1fr))`, minWidth: `${Math.max(320, activeLoop.steps.length * 12)}px` }}>
                      {activeLoop.steps.map((step, i) => {
                        const level = Math.min(1, step.length / 4);
                        return (
                          <div
                            key={i}
                            className={`h-3 ${isPlaying && i === playhead ? 'bg-cyan' : 'bg-acid-green/20'}`}
                            style={isPlaying && i === playhead ? undefined : { opacity: 0.2 + level * 0.8 }}
                            title={`Step ${i + 1}: ${step.length} hit${step.length === 1 ? '' : 's'}`}
                          />
                        );
                      })}
                    </div>
                  </div>
                  <p className="font-mono text-[11px] text-white/55 mt-3">
                    Timeline: brighter blocks contain more hits. Cyan indicates the current playback step.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
