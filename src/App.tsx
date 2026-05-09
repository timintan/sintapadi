/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import Dashboard from './pages/Dashboard';
import IdentifikasiPanen from './pages/IdentifikasiPanen';
import PengeringanTahap1 from './pages/PengeringanTahap1';
import PengeringanTahap2 from './pages/PengeringanTahap2';
import Penggilingan from './pages/Penggilingan';
import Settings from './pages/Settings';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="identifikasi" element={<IdentifikasiPanen />} />
          <Route path="pengeringan">
            <Route path="tahap1" element={<PengeringanTahap1 />} />
            <Route path="tahap2" element={<PengeringanTahap2 />} />
          </Route>
          <Route path="penggilingan" element={<Penggilingan />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </Router>
  );
}

