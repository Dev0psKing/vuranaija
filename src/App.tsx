/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { UserProvider } from './context/UserContext';
import { ThemeProvider } from './context/ThemeContext';
import { Layout } from './components/layout/Layout';
import Landing from './pages/Landing';
import Onboarding from './pages/Onboarding';
import Dashboard from './pages/Dashboard';
import Simulator from './pages/Simulator';
import Health from './pages/Health';
import Coach from './pages/Coach';
import Learn from './pages/Learn';
import Portfolio from './pages/Portfolio';
import Market from './pages/Market';
import Transactions from './pages/Transactions';
import DebtPayoff from './pages/DebtPayoff';
import JapaPlanner from './pages/JapaPlanner';

export default function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vuranaija-theme">
      <UserProvider>
        <Router>
          <Layout>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/onboarding" element={<Onboarding />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/simulator" element={<Simulator />} />
              <Route path="/health" element={<Health />} />
              <Route path="/coach" element={<Coach />} />
              <Route path="/learn" element={<Learn />} />
              <Route path="/portfolio" element={<Portfolio />} />
              <Route path="/market" element={<Market />} />
              <Route path="/transactions" element={<Transactions />} />
              <Route path="/debt" element={<DebtPayoff />} />
              <Route path="/japa" element={<JapaPlanner />} />
            </Routes>
          </Layout>
        </Router>
      </UserProvider>
    </ThemeProvider>
  );
}
