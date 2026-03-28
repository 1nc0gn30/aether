/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import Oracle from './pages/Oracle';
import Archive from './pages/Archive';
import Synthesizer from './pages/Synthesizer';
import Void from './pages/Void';

export default function App() {
  const [desktopAllowed, setDesktopAllowed] = useState(true);

  useEffect(() => {
    const media = window.matchMedia('(min-width: 1200px) and (hover: hover) and (pointer: fine)');
    const sync = () => setDesktopAllowed(media.matches);
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);

  if (!desktopAllowed) {
    return (
      <div className="min-h-screen bg-void text-white px-6 py-12 flex items-center justify-center">
        <div className="max-w-xl border-2 border-acid-green/70 bg-void/90 p-8 text-center">
          <p className="section-kicker mb-3">Access Restricted</p>
          <h1 className="text-3xl sm:text-4xl mb-4">Desktop Only</h1>
          <p className="font-mono text-sm text-white/75 leading-relaxed">
            AETHER currently supports desktop/laptop screens only. Please open this site on a desktop browser for the full interactive experience.
          </p>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="oracle" element={<Oracle />} />
          <Route path="archive" element={<Archive />} />
          <Route path="synthesizer" element={<Synthesizer />} />
          <Route path="void" element={<Void />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
