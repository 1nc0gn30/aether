/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import Oracle from './pages/Oracle';
import Archive from './pages/Archive';
import Synthesizer from './pages/Synthesizer';
import Void from './pages/Void';

export default function App() {
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
