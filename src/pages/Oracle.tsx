import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'motion/react';
import { playOracleDrawSfx, playOracleFlipSfx } from '../lib/sfx';

type OracleCardData = {
  id: number;
  title: string;
  arc: string;
};

type OracleReading = {
  id: string;
  key: string;
  omen: string;
  guidance: string;
  intensity: 'LOW' | 'MID' | 'HIGH';
};

const cards: OracleCardData[] = [
  { id: 1, title: 'THE PAST', arc: 'echo' },
  { id: 2, title: 'THE PRESENT', arc: 'signal' },
  { id: 3, title: 'THE FUTURE', arc: 'vector' },
];

const omenSubjects = [
  'A hidden dependency',
  'A forgotten promise',
  'A mirrored intention',
  'A dormant fragment',
  'A locked relay',
  'An orphaned process',
  'A split timeline',
  'A leaking boundary',
  'An unstable interface',
  'A silent witness',
  'An encrypted memory',
  'A distant signal',
  'A drifting metric',
  'A borrowed identity',
  'A delayed acknowledgement',
  'A recursive thought',
  'A brittle contract',
  'A shadow routine',
  'A latent pattern',
  'A second-order effect',
];

const omenVerbs = [
  'is surfacing',
  'is mutating',
  'is requesting access',
  'is collapsing inward',
  'is synchronizing',
  'is rerouting',
  'is resisting inspection',
  'is echoing your choice',
  'is amplifying noise',
  'is narrowing the path',
  'is drifting off-spec',
  'is preparing a branch',
  'is exposing weak assumptions',
  'is redirecting intent',
  'is rewriting context',
  'is opening a side channel',
  'is forcing a decision',
  'is destabilizing certainty',
  'is caching old pain',
  'is validating your threshold',
];

const omenConsequences = [
  'the next move must be deliberate',
  'delay will raise the cost',
  'precision now prevents rework later',
  'silence is no longer neutral',
  'your oldest shortcut is now visible',
  'the system expects clarity',
  'one truth is enough to unlock progress',
  'small fixes now avert large failures',
  'a missing check is becoming critical',
  'confidence must be earned by proof',
  'you are closer than your fear suggests',
  'a calm response wins this cycle',
  'your boundary discipline is being tested',
  'the right sequence matters more than speed',
  'attention is your scarcest resource',
  'restraint is an active strategy',
  'the first assumption deserves a second look',
  'you can trade urgency for accuracy',
  'the pattern repeats until corrected',
  'the answer appears after simplification',
];

const actionPool = [
  'Cut one obsolete branch before sunset.',
  'Ship the smallest fix before expanding scope.',
  'Document the edge case no one mentions.',
  'Return to the first assumption and test it.',
  'Replace speed with precision for one cycle.',
  'Protect your focus from noisy inputs.',
  'Name the risk and reduce it visibly.',
  'Commit one clean improvement before exploring.',
  'Refactor the loudest friction point.',
  'Add one guardrail and measure impact.',
  'Stop parallelizing and finish one thread.',
  'Clarify ownership before adding scope.',
  'Delete complexity that no longer pays rent.',
  'Validate with data before belief.',
  'Move one decision from vague to explicit.',
  'Choose reversible actions first.',
  'Tighten feedback loops for the next hour.',
  'Prioritize reliability over novelty.',
  'Reduce moving parts before scaling.',
  'Preserve energy for the highest-leverage task.',
];

const intensityPool: OracleReading['intensity'][] = ['LOW', 'MID', 'HIGH'];

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateReading(card: OracleCardData, usedKeys: Set<string>): OracleReading {
  for (let attempt = 0; attempt < 300; attempt += 1) {
    const subject = randomItem(omenSubjects);
    const verb = randomItem(omenVerbs);
    const consequence = randomItem(omenConsequences);
    const action = randomItem(actionPool);
    const intensity = randomItem(intensityPool);
    const key = `${card.arc}|${subject}|${verb}|${consequence}|${action}|${intensity}`;
    if (usedKeys.has(key)) continue;
    usedKeys.add(key);
    return {
      id: `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
      key,
      omen: `${card.title}: ${subject} ${verb}; ${consequence}.`,
      guidance: action,
      intensity,
    };
  }

  const nonce = `${Date.now()}-${Math.random().toString(16).slice(2, 6)}`;
  const guidance = randomItem(actionPool);
  return {
    id: nonce,
    key: nonce,
    omen: `${card.title}: the oracle forked a new line [${nonce}]`,
    guidance: `${guidance} Keep this code as a one-time omen.`,
    intensity: randomItem(intensityPool),
  };
}

type OracleCardProps = {
  key?: React.Key;
  card: OracleCardData;
  index: number;
  isCompact: boolean;
  reading: OracleReading;
  resetSignal: number;
  onReveal: (card: OracleCardData) => void;
};

function OracleCard({ card, index, isCompact, reading, resetSignal, onReveal }: OracleCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isFlipped, setIsFlipped] = useState(false);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const springConfig = useMemo(() => ({ damping: 20, stiffness: 300 }), []);
  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [16, -16]), springConfig);
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-16, 16]), springConfig);

  useEffect(() => {
    setIsFlipped(false);
    mouseX.set(0);
    mouseY.set(0);
  }, [resetSignal, mouseX, mouseY]);

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!cardRef.current || isFlipped || e.pointerType === 'touch') return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    mouseX.set(x);
    mouseY.set(y);
  };

  const resetTilt = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  const toggleCard = () => {
    setIsFlipped((prev) => {
      const next = !prev;
      if (next) {
        onReveal(card);
        playOracleFlipSfx();
      }
      return next;
    });
    resetTilt();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggleCard();
    }
  };

  return (
    <motion.div
      ref={cardRef}
      role="button"
      tabIndex={0}
      aria-label={`Flip card ${card.title}`}
      style={{ rotateX, rotateY, zIndex: isFlipped ? 50 : 10 }}
      onPointerMove={handlePointerMove}
      onPointerLeave={resetTilt}
      onClick={toggleCard}
      onKeyDown={handleKeyDown}
      drag
      dragElastic={0.08}
      dragMomentum={false}
      initial={{ opacity: 0, y: 60 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.12, type: 'spring', stiffness: 180, damping: 18 }}
      className="relative w-full max-w-[19rem] h-[22rem] sm:h-[24rem] cursor-pointer perspective-1000 group outline-none"
    >
      <motion.div
        className="w-full h-full relative preserve-3d transition-transform duration-700 ease-out"
        animate={{ rotateY: isFlipped ? 180 : 0, scale: isFlipped ? 1.05 : 1 }}
      >
        <div className="absolute inset-0 backface-hidden border-2 border-acid-green/70 bg-void/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 shadow-[0_0_35px_rgba(57,255,20,0.18)] group-hover:border-cyan transition-colors">
          <div className="w-16 h-16 border border-acid-green/70 rounded-full flex items-center justify-center mb-7 relative">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Number.POSITIVE_INFINITY, ease: 'linear', duration: 7 }}
              className="absolute inset-2 rounded-full border border-acid-green/30 border-dashed"
            />
            <div className="w-2 h-2 bg-acid-green rounded-full animate-ping" />
          </div>
          <h2 className="text-2xl text-acid-green tracking-widest text-center">{card.title}</h2>
          <p className="font-mono text-[11px] mt-4 text-white/60 text-center uppercase tracking-[0.12em] leading-relaxed">
            {isCompact ? 'Tap to draw a new reading.' : 'Hover to align. Click to draw a new reading.'}
          </p>
        </div>

        <div
          className="absolute inset-0 backface-hidden border-2 border-cyan bg-cyan text-void flex flex-col items-center justify-center p-6 shadow-[0_0_50px_rgba(0,243,255,0.45)]"
          style={{ transform: 'rotateY(180deg)' }}
        >
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] mb-2">Intensity: {reading.intensity}</p>
          <p className="font-mono text-sm text-center font-semibold leading-relaxed mb-3">{reading.omen}</p>
          <p className="font-mono text-xs text-center leading-relaxed text-void/85">{reading.guidance}</p>
          <div className="absolute bottom-4 left-4 right-4 h-[1px] bg-void/25" />
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function Oracle() {
  const [flash, setFlash] = useState(false);
  const [resetSignal, setResetSignal] = useState(0);
  const [isCompact, setIsCompact] = useState(false);
  const usedReadingsRef = useRef<Set<string>>(new Set());
  const [readings, setReadings] = useState<Record<number, OracleReading>>(() =>
    Object.fromEntries(cards.map((card) => [card.id, generateReading(card, usedReadingsRef.current)])),
  );
  const [history, setHistory] = useState<string[]>([]);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 768px)');
    const sync = () => setIsCompact(media.matches);
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);

  const revealReading = (card: OracleCardData) => {
    const next = generateReading(card, usedReadingsRef.current);
    setReadings((prev) => ({ ...prev, [card.id]: next }));
    setHistory((prev) => [next.omen, ...prev].slice(0, 5));
    setFlash(true);
    playOracleDrawSfx();
    window.setTimeout(() => setFlash(false), 150);
  };

  const resetDeck = () => {
    setReadings(Object.fromEntries(cards.map((card) => [card.id, generateReading(card, usedReadingsRef.current)])));
    setHistory([]);
    setResetSignal((prev) => prev + 1);
    playOracleDrawSfx();
  };

  return (
    <div className="page-shell px-4 pt-20 pb-28 sm:px-8 sm:pt-28">
      <motion.div
        initial={false}
        animate={{ opacity: flash ? 1 : 0 }}
        transition={{ duration: 0.15 }}
        className="absolute inset-0 bg-acid-green z-0 pointer-events-none mix-blend-overlay"
      />

      <div className="relative z-10 max-w-6xl mx-auto">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-8 sm:mb-12">
          <div>
            <p className="section-kicker mb-2">Node 01</p>
            <h1 className="text-3xl sm:text-5xl text-white/90">Oracle</h1>
            <p className="font-mono text-acid-green mt-3 text-xs sm:text-sm tracking-[0.08em] uppercase">
              Every draw is regenerated. No fixed answers.
            </p>
          </div>
          <button
            type="button"
            onClick={resetDeck}
            className="font-mono text-xs uppercase tracking-[0.14em] border border-white/25 hover:border-acid-green px-4 py-2 bg-void/80 transition-colors w-full sm:w-auto"
          >
            Shuffle Deck
          </button>
        </div>

        <div className="glass-panel border border-white/20 p-4 sm:p-5 mb-8">
          <p className="font-mono text-xs sm:text-sm text-white/75 leading-relaxed">
            Mobile: tap to draw. Desktop: tilt + click to draw. Oracle responses are regenerated each time you flip a card.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 place-items-center mb-8">
          {cards.map((card, i) => (
            <OracleCard
              key={card.id}
              card={card}
              index={i}
              onReveal={revealReading}
              reading={readings[card.id]}
              resetSignal={resetSignal}
              isCompact={isCompact}
            />
          ))}
        </div>

        <div className="glass-panel border border-white/20 p-4 sm:p-5">
          <p className="section-kicker mb-3">Recent Omens</p>
          <div className="space-y-2">
            {history.length === 0 && <p className="font-mono text-xs text-white/55">No draws yet. Flip a card to reveal omens.</p>}
            {history.map((entry, i) => (
              <p key={`${entry}-${i}`} className="font-mono text-xs sm:text-sm text-white/80 leading-relaxed">
                {entry}
              </p>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
