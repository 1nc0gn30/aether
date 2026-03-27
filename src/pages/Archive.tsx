import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';

type ArchiveItem = {
  id: string;
  title: string;
  type: string;
  status: string;
  detail: string;
};

const archiveData: ArchiveItem[] = [
  { id: '0x01', title: 'SUBJECT_ALPHA', type: 'MEMORY', status: 'CORRUPTED', detail: 'Neural pathways degraded. Attempting reconstruction...' },
  { id: '0x02', title: 'PROJECT_NEON', type: 'BLUEPRINT', status: 'ACTIVE', detail: 'City grid infrastructure overlay. Power routing optimal.' },
  { id: '0x03', title: 'VOID_PROTOCOL', type: 'DIRECTIVE', status: 'CLASSIFIED', detail: 'Redacted. Level 5 clearance required for decryption.' },
  { id: '0x04', title: 'ECHO_CHAMBER', type: 'RECORDING', status: 'SEALED', detail: 'Audio logs from the first singularity event.' },
  { id: '0x05', title: 'SYNTH_WAVE', type: 'AUDIO', status: 'PLAYING', detail: 'Harmonic resonance detected in sector 7G.' },
  { id: '0x06', title: 'NEURAL_LINK', type: 'INTERFACE', status: 'UNSTABLE', detail: 'Connection dropping. Re-establishing handshake.' },
  { id: '0x07', title: 'GHOST_IN_MACHINE', type: 'ANOMALY', status: 'UNKNOWN', detail: 'Unidentified consciousness pattern detected.' },
  { id: '0x08', title: 'QUANTUM_STATE', type: 'DATA', status: 'OBSERVED', detail: 'State collapsed upon observation. Data finalized.' },
];

function statusColor(status: string) {
  if (status === 'ACTIVE' || status === 'PLAYING' || status === 'OBSERVED') return 'text-acid-green border-acid-green/50';
  if (status === 'UNSTABLE' || status === 'CORRUPTED') return 'text-amber border-amber/50';
  if (status === 'CLASSIFIED' || status === 'SEALED') return 'text-cyan border-cyan/50';
  return 'text-white/70 border-white/30';
}

function ScrambleText({ text, active }: { text: string; active: boolean }) {
  const [display, setDisplay] = useState(text);

  useEffect(() => {
    if (!active) {
      setDisplay(text);
      return;
    }

    let iter = 0;
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    const interval = window.setInterval(() => {
      setDisplay(
        text
          .split('')
          .map((char, i) => {
            if (char === ' ') return ' ';
            if (i < iter) return char;
            return chars[Math.floor(Math.random() * chars.length)];
          })
          .join(''),
      );

      if (iter >= text.length) window.clearInterval(interval);
      iter += 0.5;
    }, 22);

    return () => window.clearInterval(interval);
  }, [active, text]);

  return <span>{display}</span>;
}

export default function Archive() {
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [activeId, setActiveId] = useState<string | null>(null);

  const statuses = useMemo(() => ['ALL', ...new Set(archiveData.map((item) => item.status))], []);

  const filtered = useMemo(() => {
    return archiveData.filter((item) => {
      const statusMatch = statusFilter === 'ALL' || item.status === statusFilter;
      const queryMatch =
        query.trim().length === 0 ||
        item.title.toLowerCase().includes(query.toLowerCase()) ||
        item.type.toLowerCase().includes(query.toLowerCase()) ||
        item.id.toLowerCase().includes(query.toLowerCase());
      return statusMatch && queryMatch;
    });
  }, [query, statusFilter]);

  return (
    <div className="page-shell px-4 pt-20 pb-28 sm:px-8 sm:pt-28">
      <div className="fixed inset-0 pointer-events-none z-20 opacity-[0.05] bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.25)_50%)] bg-[length:100%_4px]" />

      <div className="relative z-10 max-w-7xl mx-auto">
        <div className="mb-6 sm:mb-8">
          <p className="section-kicker mb-2">Node 02</p>
          <h1 className="text-3xl sm:text-5xl text-white/90">Archive</h1>
          <p className="font-mono text-acid-green mt-3 text-xs sm:text-sm tracking-[0.08em] uppercase">
            Search fragments. Tap any card to inspect details.
          </p>
        </div>

        <div className="glass-panel border border-white/20 p-4 sm:p-5 mb-6">
          <div className="flex flex-col gap-4">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by ID, title, or type..."
              className="w-full bg-void/70 border border-white/20 focus:border-cyan outline-none px-3 py-2 font-mono text-sm"
            />

            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {statuses.map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setStatusFilter(status)}
                  className={`shrink-0 font-mono text-xs uppercase tracking-[0.1em] border px-3 py-2 transition-colors ${
                    statusFilter === status ? 'border-acid-green text-acid-green bg-acid-green/10' : 'border-white/25 text-white/70 hover:border-white/60'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mb-4 font-mono text-xs text-white/50 uppercase tracking-[0.12em]">
          {filtered.length} Records Visible
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
          {filtered.map((item, i) => {
            const isActive = activeId === item.id;
            return (
              <motion.button
                key={item.id}
                type="button"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                onMouseEnter={() => setActiveId(item.id)}
                onMouseLeave={() => setActiveId((prev) => (prev === item.id ? null : prev))}
                onClick={() => setActiveId((prev) => (prev === item.id ? null : item.id))}
                className={`text-left group relative min-h-52 border-2 bg-void/85 backdrop-blur-sm overflow-hidden cursor-pointer p-5 transition-colors ${
                  isActive ? 'border-acid-green' : 'border-white/15 hover:border-white/50'
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-6 font-mono text-xs text-white/60">
                  <span>{item.id}</span>
                  <span>{item.type}</span>
                </div>

                <h3 className="text-2xl leading-tight mb-3">
                  <ScrambleText text={item.title} active={isActive} />
                </h3>

                <div className={`inline-block px-2 py-1 border text-[11px] font-mono tracking-[0.08em] ${statusColor(item.status)}`}>
                  {item.status}
                </div>

                <motion.div
                  initial={false}
                  animate={{ opacity: isActive ? 1 : 0, y: isActive ? 0 : 10 }}
                  className="mt-5 pt-4 border-t border-white/15 font-mono text-sm text-white/85 leading-relaxed"
                >
                  <ScrambleText text={item.detail} active={isActive} />
                </motion.div>
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
