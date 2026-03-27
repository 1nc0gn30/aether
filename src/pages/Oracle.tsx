import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'motion/react';

const cards = [
  { id: 1, title: 'THE PAST', message: 'Legacy behavior is still shaping your current loop.' },
  { id: 2, title: 'THE PRESENT', message: 'Your current choice affects every connected node instantly.' },
  { id: 3, title: 'THE FUTURE', message: 'A new pattern is emerging. Adapt before it locks in.' },
];

type OracleCardProps = {
  key?: React.Key;
  title: string;
  message: string;
  index: number;
  onFlip: () => void;
  resetSignal: number;
  isCompact: boolean;
};

function OracleCard({ title, message, index, onFlip, resetSignal, isCompact }: OracleCardProps) {
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
      if (next) onFlip();
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
      aria-label={`Flip card ${title}`}
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
          <div className="w-14 h-14 border border-acid-green/70 rounded-full flex items-center justify-center mb-7 group-hover:scale-105 transition-transform">
            <div className="w-2 h-2 bg-acid-green rounded-full animate-ping" />
          </div>
          <h2 className="text-2xl text-acid-green tracking-widest text-center">{title}</h2>
          <p className="font-mono text-[11px] mt-4 text-white/60 text-center uppercase tracking-[0.12em] leading-relaxed">
            {isCompact ? 'Tap card to reveal message.' : 'Move pointer for tilt. Click to reveal.'}
          </p>
        </div>

        <div
          className="absolute inset-0 backface-hidden border-2 border-acid-green bg-acid-green text-void flex flex-col items-center justify-center p-6 shadow-[0_0_50px_rgba(57,255,20,0.45)]"
          style={{ transform: 'rotateY(180deg)' }}
        >
          <h2 className="text-xl mb-4 text-center">{title}</h2>
          <p className="font-mono text-sm text-center font-semibold leading-relaxed">{message}</p>
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

  useEffect(() => {
    const media = window.matchMedia('(max-width: 768px)');
    const sync = () => setIsCompact(media.matches);
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);

  const handleFlip = () => {
    setFlash(true);
    window.setTimeout(() => setFlash(false), 150);
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
              Draw a card. Read the current signal.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setResetSignal((prev) => prev + 1)}
            className="font-mono text-xs uppercase tracking-[0.14em] border border-white/25 hover:border-acid-green px-4 py-2 bg-void/80 transition-colors w-full sm:w-auto"
          >
            Reset Cards
          </button>
        </div>

        <div className="glass-panel border border-white/20 p-4 sm:p-5 mb-8">
          <p className="font-mono text-xs sm:text-sm text-white/75 leading-relaxed">
            Mobile: tap to flip. Desktop: move cursor over a card for tilt, then click to reveal. Drag cards to rearrange your reading.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 place-items-center">
          {cards.map((card, i) => (
            <OracleCard
              key={card.id}
              title={card.title}
              message={card.message}
              index={i}
              onFlip={handleFlip}
              resetSignal={resetSignal}
              isCompact={isCompact}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
