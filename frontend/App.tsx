import React, { ReactNode } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Header from './components/Header';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import MintNFT from './pages/MintNFT';
import Simulation from './pages/Simulation';
import TestConnection from './pages/TestConnection';
import TestTransactions from './pages/TestTransactions';
import { useWallet } from './hooks/useWallet';

const App: React.FC = () => {
  const { isConnected, isLoading } = useWallet();

  // 🔐 Route protection wrapper
  const ProtectedRoute: React.FC<{ children: ReactNode }> = ({ children }) => {
    if (isLoading) {
      return (
        <div className="flex justify-center items-center min-h-[60vh] text-lg">
          Connecting wallet...
        </div>
      );
    }

    if (!isConnected) {
      return <Navigate to="/" replace />;
    }

    return children;
  };

  return (
    <HashRouter>
      <div className="min-h-screen bg-dark-bg text-slate-200 font-sans">
        <Header />

        <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
          <Routes>

            {/* Public Landing */}
            <Route path="/" element={<WalletConnectPage />} />

            {/* Protected Pages */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />

            <Route
              path="/transactions"
              element={
                <ProtectedRoute>
                  <Transactions />
                </ProtectedRoute>
              }
            />

            <Route
              path="/mint"
              element={
                <ProtectedRoute>
                  <MintNFT />
                </ProtectedRoute>
              }
            />

            <Route
              path="/simulation"
              element={
                <ProtectedRoute>
                  <Simulation />
                </ProtectedRoute>
              }
            />

            <Route
              path="/test"
              element={
                <ProtectedRoute>
                  <TestConnection />
                </ProtectedRoute>
              }
            />

            <Route
              path="/test-transactions"
              element={
                <ProtectedRoute>
                  <TestTransactions />
                </ProtectedRoute>
              }
            />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" />} />

          </Routes>
        </main>
      </div>
    </HashRouter>
  );
};

/* ================= Wallet Connect Page ================= */

const WalletConnectPage: React.FC = () => {
  const { connectWallet, isLoading, isConnected } = useWallet();

  const handleConnect = async () => {
    const success = await connectWallet();
    if (success) {
      window.location.hash = "#/dashboard";
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] text-center">
      <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-purple-400 to-pink-500 text-transparent bg-clip-text">
        Welcome to Q-Chain
      </h1>

      <p className="text-slate-400 mb-8 max-w-md">
        Quantum-resilient blockchain platform. Connect your wallet to continue.
      </p>

      <button
        onClick={handleConnect}
        disabled={isLoading}
        className="px-8 py-3 bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-bold rounded-lg shadow-lg hover:scale-105 transform transition-transform duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? "Connecting..." : "Connect MetaMask Wallet"}
      </button>
    </div>
  );
};

export default App;
