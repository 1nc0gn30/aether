import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Hexagon, Eye, Database, Radio, CircleDashed } from 'lucide-react';
import { cn } from '../lib/utils';
import AmbientPlayer from './AmbientPlayer';

const navItems = [
  { path: '/', icon: Hexagon, label: 'NEXUS' },
  { path: '/oracle', icon: Eye, label: 'ORACLE' },
  { path: '/archive', icon: Database, label: 'ARCHIVE' },
  { path: '/synthesizer', icon: Radio, label: 'SYNTH' },
  { path: '/void', icon: CircleDashed, label: 'VOID' },
];

export default function Layout() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-void text-white overflow-hidden relative flex flex-col">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_20%_20%,rgba(57,255,20,0.08),transparent_30%),radial-gradient(circle_at_85%_10%,rgba(0,243,255,0.08),transparent_35%),radial-gradient(circle_at_50%_85%,rgba(255,191,63,0.08),transparent_30%)]" />
      {/* Background Noise Overlay */}
      <div 
        className="pointer-events-none fixed inset-0 z-50 opacity-[0.03] mix-blend-overlay"
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}
      />

      <AnimatePresence mode="wait">
        <motion.main
          data-scroll-shell="true"
          key={location.pathname}
          initial={{ opacity: 0, filter: 'blur(10px)', scale: 0.98 }}
          animate={{ opacity: 1, filter: 'blur(0px)', scale: 1 }}
          exit={{ opacity: 0, filter: 'blur(10px)', scale: 1.02 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="flex-1 relative z-10 h-screen overflow-y-auto overflow-x-hidden"
        >
          <Outlet />
        </motion.main>
      </AnimatePresence>

      <AmbientPlayer />

      {/* Floating Navigation */}
      <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-1.5rem)] max-w-3xl">
        <div className="glass-panel rounded-2xl px-3 py-2 sm:px-6 sm:py-3 flex items-center justify-between sm:justify-center gap-4 sm:gap-8 box-shadow-neon">
          {navItems.map(({ path, icon: Icon, label }) => (
            <NavLink
              key={path}
              to={path}
              className={({ isActive }) =>
                cn(
                  "relative group flex flex-col items-center gap-1 transition-colors duration-300 min-w-12",
                  isActive ? "text-acid-green" : "text-white/50 hover:text-white"
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className="w-5 h-5" />
                  <span className="text-[9px] font-mono tracking-[0.15em] transition-opacity uppercase">
                    {label}
                  </span>
                  {isActive && (
                    <motion.div
                      layoutId="nav-indicator"
                      className="absolute -bottom-2 w-1 h-1 rounded-full bg-acid-green shadow-[0_0_8px_#39ff14]"
                    />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
