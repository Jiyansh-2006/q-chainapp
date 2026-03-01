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
import { useAlgorandWallet } from './hooks/useAlgorandWallet';

const App: React.FC = () => {
  const { isConnected: isEthConnected, isLoading: isEthLoading } = useWallet();
  const { isConnected: isAlgoConnected, isLoading: isAlgoLoading } = useAlgorandWallet();

  // 🔐 Ethereum route protection wrapper
  const ProtectedRoute: React.FC<{ children: ReactNode }> = ({ children }) => {
    if (isEthLoading) {
      return (
        <div className="flex justify-center items-center min-h-[60vh] text-lg">
          Connecting Ethereum wallet...
        </div>
      );
    }

    if (!isEthConnected) {
      return <Navigate to="/" replace />;
    }

    return children;
  };

  // 🔐 Algorand route protection wrapper
  const AlgorandProtectedRoute: React.FC<{ children: ReactNode }> = ({ children }) => {
    if (isAlgoLoading) {
      return (
        <div className="flex justify-center items-center min-h-[60vh] text-lg">
          Connecting Algorand wallet...
        </div>
      );
    }

    if (!isAlgoConnected) {
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

            {/* Protected Ethereum Pages */}
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
  const { connectWallet, isLoading: isEthLoading, isConnected: isEthConnected } = useWallet();
  const { connectWallet: connectAlgorand, isLoading: isAlgoLoading, isConnected: isAlgoConnected } = useAlgorandWallet();
  const [selectedChain, setSelectedChain] = React.useState<'ethereum' | 'algorand'>('ethereum');

  const handleConnect = async () => {
    let success = false;
    
    if (selectedChain === 'ethereum') {
      success = await connectWallet();
      if (success) {
        window.location.hash = "#/dashboard";
      }
    } else {
      try {
        await connectAlgorand();
        window.location.hash = "#/algorand";
      } catch (error) {
        console.error("Algorand connection failed:", error);
      }
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] text-center">
      <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-purple-400 to-pink-500 text-transparent bg-clip-text">
        Welcome to Q-Chain
      </h1>

      <p className="text-slate-400 mb-8 max-w-md">
        Quantum-resilient blockchain platform. Choose your chain and connect your wallet to continue.
      </p>

      {/* Chain Selection */}
      <div className="flex gap-4 mb-8">
        <button
          onClick={() => setSelectedChain('ethereum')}
          className={`px-6 py-3 rounded-lg font-semibold transition-all ${
            selectedChain === 'ethereum'
              ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          }`}
        >
          🟣 Ethereum
        </button>
        <button
          onClick={() => setSelectedChain('algorand')}
          className={`px-6 py-3 rounded-lg font-semibold transition-all ${
            selectedChain === 'algorand'
              ? 'bg-gradient-to-r from-green-600 to-emerald-500 text-white'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          }`}
        >
          🟢 Algorand
        </button>
      </div>

      {/* Connection Status */}
      <div className="mb-4 text-sm">
        {selectedChain === 'ethereum' ? (
          isEthConnected ? (
            <span className="text-green-400">✓ Ethereum wallet connected</span>
          ) : (
            <span className="text-gray-400">Connect MetaMask to continue</span>
          )
        ) : (
          isAlgoConnected ? (
            <span className="text-green-400">✓ Algorand wallet connected</span>
          ) : (
            <span className="text-gray-400">Connect Pera Wallet to continue</span>
          )
        )}
      </div>

      <button
        onClick={handleConnect}
        disabled={isEthLoading || isAlgoLoading}
        className={`px-8 py-3 text-white font-bold rounded-lg shadow-lg hover:scale-105 transform transition-transform duration-300 disabled:opacity-50 disabled:cursor-not-allowed ${
          selectedChain === 'ethereum'
            ? 'bg-gradient-to-r from-blue-600 to-cyan-500'
            : 'bg-gradient-to-r from-green-600 to-emerald-500'
        }`}
      >
        {selectedChain === 'ethereum' ? (
          isEthLoading ? "Connecting to MetaMask..." : "Connect MetaMask Wallet"
        ) : (
          isAlgoLoading ? "Connecting to Pera Wallet..." : "Connect Pera Wallet"
        )}
      </button>

      {/* Network Info */}
      <div className="mt-8 text-xs text-gray-500">
        {selectedChain === 'ethereum' ? (
          <p>Network: Sepolia Testnet • Currency: ETH</p>
        ) : (
          <p>Network: Algorand Testnet • Currency: ALGO</p>
        )}
      </div>
    </div>
  );
};

export default App;
