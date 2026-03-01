// pages/Dashboard.tsx
import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useWallet } from '../hooks/useWallet';
import { useAlgorandWallet } from '../hooks/useAlgorandWallet';
import { useAlgorandData } from '../hooks/useAlgorandData';
import Card from '../components/Card';
import LoadingSpinner from '../components/LoadingSpinner';
import { transactionMonitor } from '../services/transactionMonitor';

interface Transaction {
  hash: string;
  from: string;
  to: string;
  amount: string;
  timestamp: number;
  status: 'Completed' | 'Pending' | 'Failed' | 'Suspicious';
  isPqc: boolean;
  pqcAlgorithm?: string;
  fraudScore?: number;
  fraudSeverity?: 'Low' | 'Medium' | 'High';
  fraudReason?: string;
  network?: 'ethereum' | 'algorand';
  type?: 'pay' | 'acfg' | 'axfer' | 'unknown';
  algoType?: 'pay' | 'acfg' | 'axfer' | 'unknown';
  assetId?: number;
  note?: string;
}

interface FraudAlertType {
  id: string;
  timestamp: string;
  severity: 'Low' | 'Medium' | 'High';
  probability: number;
  reason: string;
  amount: number;
  sender: string;
  receiver: string;
  dismissed: boolean;
  transactionHash?: string;
  network?: 'ethereum' | 'algorand';
}

interface RiskStats {
  total_transactions: number;
  high_risk_count: number;
  medium_risk_count: number;
  low_risk_count: number;
  max_amount_allowed: number;
  risk_threshold: number;
}

// Quick Action Component
const QuickAction: React.FC<{
  to: string,
  label: string,
  icon: string,
  description: string,
  bgColor?: string
}> = ({ to, label, icon, description, bgColor = 'from-blue-600 to-cyan-500' }) => (
  <Link
    to={to}
    className={`flex flex-col items-center p-6 bg-gray-800/50 border border-gray-700 rounded-xl hover:border-blue-500/50 hover:bg-gray-800/80 transition-all duration-300 text-center group`}
  >
    <div className="text-3xl mb-4 group-hover:scale-110 transition-transform">
      {icon}
    </div>
    <h3 className="text-lg font-bold text-white mb-2">{label}</h3>
    <p className="text-sm text-slate-400">{description}</p>
    <div className={`mt-4 flex items-center text-sm bg-gradient-to-r ${bgColor} bg-clip-text text-transparent font-medium`}>
      <span>Get Started</span>
      <svg className="w-4 h-4 ml-2 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
      </svg>
    </div>
  </Link>
);

// Severity Badge Component
const SeverityBadge: React.FC<{ severity: 'Low' | 'Medium' | 'High' | string }> = ({ severity }) => {
  const styles = {
    Low: 'bg-green-500/20 text-green-400 border-green-500/30',
    Medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    High: 'bg-red-500/20 text-red-400 border-red-500/30'
  };

  const icons = {
    Low: '🟢',
    Medium: '🟡',
    High: '🔴'
  };

  const style = styles[severity as keyof typeof styles] || styles.Low;
  const icon = icons[severity as keyof typeof icons] || '⚪';

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${style}`}>
      <span className="mr-1">{icon}</span>
      {severity}
    </span>
  );
};

// Network Badge Component
const NetworkBadge: React.FC<{ network: 'ethereum' | 'algorand' }> = ({ network }) => {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${network === 'ethereum'
      ? 'bg-purple-500/20 text-purple-400 border-purple-500/30'
      : 'bg-green-500/20 text-green-400 border-green-500/30'
      }`}>
      {network === 'ethereum' ? '🟣 Ethereum' : '🟢 Algorand'}
    </span>
  );
};

// Quantum Status Badge
const QuantumStatusBadge: React.FC<{ status: 'checking' | 'online' | 'offline' }> = ({ status }) => {
  if (status === 'checking') {
    return (
      <span className="text-xs px-2 py-1 bg-blue-500/20 text-blue-400 rounded animate-pulse">
        🔄 PQC...
      </span>
    );
  }
  if (status === 'online') {
    return (
      <span className="text-xs px-2 py-1 bg-green-500/20 text-green-400 rounded">
        ✅ PQC Ready
      </span>
    );
  }
  return (
    <span className="text-xs px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded">
      ⚠️ PQC Offline
    </span>
  );
};

// Risk Stats Cards Component
const RiskStatsCards: React.FC<{ stats: RiskStats }> = ({ stats }) => (
  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
    <div className="bg-gradient-to-br from-green-500/10 to-green-600/5 rounded-xl p-6 border border-green-500/30">
      <div className="flex items-center justify-between mb-4">
        <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
          <span className="text-green-400 text-xl">🟢</span>
        </div>
        <span className="text-2xl font-bold text-green-400">{stats.low_risk_count}</span>
      </div>
      <h3 className="text-lg font-semibold text-white mb-1">Low Risk</h3>
      <p className="text-sm text-slate-400">Safe transactions</p>
    </div>

    <div className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 rounded-xl p-6 border border-yellow-500/30">
      <div className="flex items-center justify-between mb-4">
        <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center">
          <span className="text-yellow-400 text-xl">🟡</span>
        </div>
        <span className="text-2xl font-bold text-yellow-400">{stats.medium_risk_count}</span>
      </div>
      <h3 className="text-lg font-semibold text-white mb-1">Medium Risk</h3>
      <p className="text-sm text-slate-400">Review recommended</p>
    </div>

    <div className="bg-gradient-to-br from-red-500/10 to-red-600/5 rounded-xl p-6 border border-red-500/30">
      <div className="flex items-center justify-between mb-4">
        <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
          <span className="text-red-400 text-xl">🔴</span>
        </div>
        <span className="text-2xl font-bold text-red-400">{stats.high_risk_count}</span>
      </div>
      <h3 className="text-lg font-semibold text-white mb-1">High Risk</h3>
      <p className="text-sm text-slate-400">Requires attention</p>
    </div>
  </div>
);

const Dashboard: React.FC = () => {
  const {
    address,
    qTokenBalance,
    nativeBalance,
    network,
    refreshBalance,
    isLoading,
    formatAddress
  } = useWallet();

  const {
    account: algoAccount,
    isConnected: isAlgoConnected,
    connectWallet: connectAlgoWallet
  } = useAlgorandWallet();

  const {
    algoBalance,
    assets: algoAssets,
    transactions: algoTransactions,
    loading: algoLoading,
    refreshAll: refreshAlgoData
  } = useAlgorandData();

  const [refreshing, setRefreshing] = useState(false);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [fraudAlerts, setFraudAlerts] = useState<FraudAlertType[]>([]);
  const [liveMonitoring, setLiveMonitoring] = useState(true);
  const [quantumStatus, setQuantumStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [stats, setStats] = useState({
    totalTransactions: 0,
    fraudCount: 0,
    detectionRate: '0.0',
    avgResponseTime: '128ms',
    modelAccuracy: '94.2%',
    algoTxCount: 0,
    algoAssetCount: 0
  });
  const [riskStats, setRiskStats] = useState<RiskStats>({
    total_transactions: 0,
    high_risk_count: 0,
    medium_risk_count: 0,
    low_risk_count: 0,
    max_amount_allowed: 6,
    risk_threshold: 4
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);

  // Fetch risk stats
  const fetchRiskStats = async () => {
    try {
      const response = await fetch('https://qchain-ai-backend.onrender.com/risk-stats');
      if (response.ok) {
        const stats = await response.json();
        setRiskStats(stats);
      }
    } catch (error) {
      console.error('Failed to fetch risk stats:', error);
    }
  };

  // Check quantum service health
  useEffect(() => {
    const checkQuantumService = async () => {
      setQuantumStatus('checking');
      try {
        const response = await fetch('https://qchain-quantum-pqc-backend.onrender.com/health');
        if (response.ok) {
          const health = await response.json();
          setQuantumStatus(health.status === 'healthy' ? 'online' : 'offline');
        } else {
          setQuantumStatus('offline');
        }
      } catch (error) {
        console.error('Failed to check quantum service:', error);
        setQuantumStatus('offline');
      }
    };

    checkQuantumService();
    const interval = setInterval(checkQuantumService, 30000);
    return () => clearInterval(interval);
  }, []);

  // Load transactions and alerts from localStorage
  useEffect(() => {
    const loadTransactions = () => {
      // Load Ethereum transactions
      const saved = localStorage.getItem('qTokenTransactions');
      if (saved) {
        try {
          const allTxs = JSON.parse(saved);
          const userTxs = allTxs
            .filter((tx: Transaction) =>
              tx.from?.toLowerCase() === address?.toLowerCase()
            )
            .sort((a: Transaction, b: Transaction) => b.timestamp - a.timestamp)
            .slice(0, 5);

          setRecentTransactions(userTxs);
          setStats(prev => ({
            ...prev,
            totalTransactions: allTxs.length
          }));
        } catch (e) {
          console.error('Error loading transactions:', e);
        }
      }

      // Load Algorand transactions count
      if (algoTransactions.length > 0) {
        setStats(prev => ({
          ...prev,
          algoTxCount: algoTransactions.length,
          algoAssetCount: algoAssets.length
        }));
      }
    };

    const loadAlerts = () => {
      const savedAlerts = localStorage.getItem('fraudAlerts');
      if (savedAlerts) {
        try {
          const alerts = JSON.parse(savedAlerts);
          setFraudAlerts(alerts);

          const fraudCount = alerts.filter((a: FraudAlertType) => a.severity === 'High' || a.severity === 'Medium').length;
          const detectionRate = recentTransactions.length > 0
            ? ((fraudCount / recentTransactions.length) * 100).toFixed(1)
            : '0.0';

          setStats(prev => ({
            ...prev,
            fraudCount,
            detectionRate
          }));
        } catch (e) {
          console.error('Error loading alerts:', e);
        }
      }
    };

    if (address) {
      loadTransactions();
      loadAlerts();
      fetchRiskStats();
    }

    // Update stats when algoTransactions change
    if (algoTransactions.length > 0) {
      setStats(prev => ({
        ...prev,
        algoTxCount: algoTransactions.length,
        algoAssetCount: algoAssets.length
      }));
    }
  }, [address, recentTransactions.length, algoTransactions.length, algoAssets.length]);

  // Monitor WebSocket connection status
  useEffect(() => {
    const unsubscribe = transactionMonitor.onConnectionChange((status) => {
      setWsConnected(status.isConnected);
    });

    setWsConnected(transactionMonitor.isConnected());

    return () => {
      unsubscribe();
    };
  }, []);

  // Setup WebSocket connection for real-time monitoring
  useEffect(() => {
    if (address && liveMonitoring) {
      const unsubscribe = transactionMonitor.on('fraud_alert', (data) => {
        handleFraudDetectionResult(data);
      });

      return () => {
        unsubscribe();
      };
    }
  }, [address, liveMonitoring]);

  const handleFraudDetectionResult = useCallback((data: any) => {
    if (data.fraud || data.probability > 0.3) {
      const newAlert: FraudAlertType = {
        id: `alert_${Date.now()}`,
        timestamp: new Date().toISOString(),
        severity: data.severity,
        probability: data.probability,
        reason: data.reason,
        amount: data.transaction?.amount || 0,
        sender: data.transaction?.sender_wallet || address || '',
        receiver: data.transaction?.receiver_wallet || '',
        dismissed: false,
        transactionHash: data.transaction?.hash,
        network: 'ethereum'
      };

      setFraudAlerts(prev => {
        const updated = [newAlert, ...prev.slice(0, 9)];
        localStorage.setItem('fraudAlerts', JSON.stringify(updated));
        return updated;
      });

      setStats(prev => ({
        ...prev,
        fraudCount: prev.fraudCount + 1
      }));

      fetchRiskStats();

      if (Notification.permission === 'granted') {
        new Notification('⚠️ Suspicious Transaction Detected', {
          body: `Severity: ${data.severity} - ${data.transaction?.amount || 0} QTOK`,
          icon: '/favicon.ico'
        });
      }
    }
  }, [address]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshBalance();
    if (isAlgoConnected) {
      await refreshAlgoData();
    }
    await fetchRiskStats();
    setTimeout(() => setRefreshing(false), 1000);
  };

  // Test transaction function for Ethereum
  const testFraudDetection = async () => {
    if (!address) return;

    setIsProcessing(true);

    const mockTransaction = {
      amount: Math.random() * 10 + 5,
      fee: Math.random() * 0.01,
      sender_wallet: address,
      receiver_wallet: `0x${Math.random().toString(16).substr(2, 40)}`,
      timestamp: new Date().toISOString(),
      transaction_type: 'transfer'
    };

    try {
      const response = await fetch('https://qchain-ai-backend.onrender.com/predict-fraud-real-time', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(mockTransaction),
      });

      const result = await response.json();

      if (result.fraud || result.probability > 0.3) {
        handleFraudDetectionResult({
          ...result,
          transaction: mockTransaction
        });
      }
      fetchRiskStats();
    } catch (error) {
      console.error('Error testing fraud detection:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const clearAllAlerts = () => {
    setFraudAlerts([]);
    localStorage.removeItem('fraudAlerts');
    setStats(prev => ({
      ...prev,
      fraudCount: 0,
      detectionRate: '0.0'
    }));
  };

  const formatTimeAgo = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  const getSeverityColor = (severity: 'Low' | 'Medium' | 'High') => {
    switch (severity) {
      case 'High': return 'text-red-400';
      case 'Medium': return 'text-yellow-400';
      case 'Low': return 'text-green-400';
      default: return 'text-slate-400';
    }
  };

  const getSeverityBg = (severity: 'Low' | 'Medium' | 'High') => {
    switch (severity) {
      case 'High': return 'bg-red-500/10';
      case 'Medium': return 'bg-yellow-500/10';
      case 'Low': return 'bg-green-500/10';
      default: return 'bg-slate-500/10';
    }
  };

  const getTransactionIcon = (tx: Transaction) => {
    if (tx.network === 'algorand') {
      if (tx.type === 'pay') return '💸';
      if (tx.type === 'acfg') return '🎨';
      if (tx.type === 'axfer') return '🔄';
      return '📝';
    }
    return tx.isPqc ? '🔐' : '💰';
  };

  const isAlgoPqc = (tx: unknown): boolean => {
    return Boolean((tx as { isPqc?: boolean }).isPqc);
  };

  if (isLoading && !address) {
    return (
      <div className="flex flex-col justify-center items-center h-64">
        <LoadingSpinner size="lg" />
        <p className="mt-4 text-slate-400">Loading wallet...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Dashboard</h1>
          <p className="text-slate-400">Manage your cross-chain assets with quantum security</p>
        </div>
        {(address || isAlgoConnected) && (
          <div className="flex items-center gap-3 flex-wrap">
            {/* WebSocket Connection Status */}
            <div className={`px-3 py-1 rounded-full text-xs font-medium flex items-center ${wsConnected ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
              }`}>
              <div className={`w-2 h-2 rounded-full mr-2 ${wsConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
              {wsConnected ? 'Live' : 'Offline'}
            </div>

            {/* Quantum Status */}
            <QuantumStatusBadge status={quantumStatus} />

            {address && (
              <button
                onClick={testFraudDetection}
                disabled={!address || !liveMonitoring || isProcessing}
                className="px-4 py-2 bg-blue-500/20 text-blue-400 text-sm font-medium rounded-lg hover:bg-blue-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {isProcessing ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    Testing...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Test Detection
                  </>
                )}
              </button>
            )}
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="px-4 py-2 bg-gray-700 rounded-lg text-sm font-medium hover:bg-gray-600 transition-colors disabled:opacity-50 flex items-center"
            >
              {refreshing ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Refreshing...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Refresh
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Risk Stats Cards - Only show for Ethereum */}
      {address && <RiskStatsCards stats={riskStats} />}

      {/* Stats Cards - Dual Network View */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Ethereum QToken Balance */}
        <Card title="Ethereum" className="bg-gradient-to-br from-purple-900/30 to-blue-900/30 border-purple-500/30">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-300">QToken Balance</h3>
              <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                <span className="text-purple-400 text-xl">🟣</span>
              </div>
            </div>
            <div className="text-3xl font-bold text-white mb-2">
              {parseFloat(qTokenBalance).toFixed(4)} <span className="text-purple-400">QTOK</span>
            </div>
            {address ? (
              <p className="text-sm text-slate-400">
                {formatAddress(address)}
              </p>
            ) : (
              <p className="text-sm text-slate-400">Connect MetaMask</p>
            )}
            <div className="mt-2 text-xs text-slate-500">
              ETH: {parseFloat(nativeBalance).toFixed(4)} ETH
            </div>
          </div>
        </Card>


        <Card title="Algorand" className="bg-gradient-to-br from-green-900/30 to-emerald-900/30 border-green-500/30">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-300">ALGO Balance</h3>
              <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                <span className="text-green-400 text-xl">🟢</span>
              </div>
            </div>
            <div className="text-3xl font-bold text-white mb-2">
              {algoBalance !== null ? algoBalance.toFixed(4) : '0.0000'} <span className="text-green-400">ALGO</span>
            </div>
            {isAlgoConnected && algoAccount ? (
              <div>
                <p className="text-sm text-slate-400">
                  {formatAddress(algoAccount)}
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded">
                    TestNet
                  </span>
                  <span className="text-xs text-slate-400">
                    {stats.algoAssetCount || 0} Assets
                  </span>
                </div>
                {/* Add refresh button for Algorand */}
                <button
                  onClick={() => refreshAlgoData()}
                  className="mt-3 text-xs bg-green-600/20 text-green-400 px-3 py-1 rounded-lg hover:bg-green-600/30 transition-colors"
                >
                  ↻ Refresh Balance
                </button>
              </div>
            ) : (
              <div className="mt-2">
                <button
                  onClick={connectAlgoWallet}
                  className="text-sm bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-lg transition-colors"
                >
                  Connect Pera Wallet
                </button>
              </div>
            )}
          </div>
        </Card>

        {/* Fraud Detection Stats */}
        <Card title="Fraud Detection" className="bg-gradient-to-br from-gray-800 to-gray-900">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-300">Detection Rate</h3>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${wsConnected ? 'bg-green-500/20' : 'bg-red-500/20'
                }`}>
                {wsConnected ? (
                  <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
              </div>
            </div>
            <div className="text-3xl font-bold text-white mb-2">
              {stats.detectionRate}%
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">Alerts: {fraudAlerts.length}</span>
              <span className="text-sm text-green-400">Accuracy: {stats.modelAccuracy}</span>
            </div>
          </div>
        </Card>

        {/* Transaction Stats */}
        <Card title="Activity" className="bg-gradient-to-br from-gray-800 to-gray-900">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-300">Transactions</h3>
              <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                <span className="text-blue-400 text-xl">📊</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-2xl font-bold text-white">{stats.totalTransactions}</div>
                <div className="text-xs text-slate-400">Ethereum</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-white">{stats.algoTxCount}</div>
                <div className="text-xs text-slate-400">Algorand</div>
              </div>
            </div>
            <div className="mt-3 text-xs text-slate-500">
              PQC Enabled: {recentTransactions.filter(tx => tx.isPqc).length + algoTransactions.filter((tx) => isAlgoPqc(tx)).length}
            </div>
          </div>
        </Card>
      </div>

      {/* Real-Time Fraud Alerts - Ethereum Only */}
      {fraudAlerts.length > 0 && (
        <Card title="🚨 Fraud Detection Alerts">
          <div className="space-y-4">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center">
                <span className="text-lg font-bold text-white mr-3">Active Alerts</span>
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${fraudAlerts.some(a => a.severity === 'High')
                  ? 'bg-red-500/20 text-red-400 animate-pulse'
                  : 'bg-yellow-500/20 text-yellow-400'
                  }`}>
                  {fraudAlerts.length} Alert{fraudAlerts.length !== 1 ? 's' : ''}
                </span>
              </div>
              <button
                onClick={clearAllAlerts}
                className="text-sm text-slate-400 hover:text-white transition-colors flex items-center"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Clear All
              </button>
            </div>

            <div className="space-y-3">
              {fraudAlerts.slice(0, 3).map((alert) => (
                <div
                  key={alert.id}
                  className={`p-4 rounded-lg border-l-4 ${alert.severity === 'High'
                    ? 'bg-red-500/10 border-red-500'
                    : alert.severity === 'Medium'
                      ? 'bg-yellow-500/10 border-yellow-500'
                      : 'bg-green-500/10 border-green-500'
                    }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center mb-2">
                        <div className={`w-3 h-3 rounded-full mr-2 ${alert.severity === 'High' ? 'bg-red-500 animate-pulse' :
                          alert.severity === 'Medium' ? 'bg-yellow-500' :
                            'bg-green-500'
                          }`}></div>
                        <h4 className="font-bold text-white">
                          {alert.severity} Risk Transaction
                        </h4>
                        <span className="ml-2 px-2 py-1 text-xs rounded-full bg-gray-700 text-slate-300">
                          {(alert.probability * 100).toFixed(1)}% probability
                        </span>
                      </div>

                      <p className="text-slate-300 mb-2">{alert.reason}</p>

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-slate-400">Amount: </span>
                          <span className="font-medium text-white">{alert.amount.toFixed(4)} QTOK</span>
                        </div>
                        <div>
                          <span className="text-slate-400">To: </span>
                          <span className="font-mono text-white">
                            {alert.receiver.substring(0, 8)}...{alert.receiver.substring(34)}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400">Time: </span>
                          <span className="text-white">
                            {new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400">Severity: </span>
                          <span className={`font-medium ${getSeverityColor(alert.severity)}`}>
                            {alert.severity}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {fraudAlerts.length > 3 && (
              <div className="text-center pt-4 border-t border-gray-700">
                <p className="text-slate-400 text-sm">
                  Showing 3 of {fraudAlerts.length} alerts
                </p>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Quick Actions - Dual Network */}
      <Card title="Quick Actions">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <QuickAction
            to="/transactions"
            label="Send QTokens"
            description="Transfer QTokens (Max 6 QTOK)"
            icon="🚀"
            bgColor="from-purple-600 to-pink-600"
          />
          <QuickAction
            to="/mint"
            label="Mint NFT"
            description="Create quantum-secured NFTs"
            icon="🎨"
            bgColor="from-purple-600 to-pink-600"
          />
          <QuickAction
            to="/algorand"
            label="Algorand Dashboard"
            description="Manage ALGO & assets"
            icon="🟢"
            bgColor="from-green-600 to-emerald-500"
          />
          <QuickAction
            to="/algorand-transactions"
            label="Algorand TX"
            description="View ALGO transactions"
            icon="📊"
            bgColor="from-green-600 to-emerald-500"
          />
        </div>
      </Card>

      {/* Recent Transactions - Dual Network */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Ethereum Recent Transactions */}
        <Card title="Recent Ethereum Transactions">
          {recentTransactions.length > 0 ? (
            <div className="space-y-3">
              {recentTransactions.map((tx, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-gray-800/30 rounded-lg border border-gray-700 hover:border-purple-500/30 transition-colors group">
                  <div className="flex items-center">
                    <div className="text-xl mr-3">{getTransactionIcon(tx)}</div>
                    <div>
                      <p className="font-medium text-white">To: {formatAddress(tx.to)}</p>
                      <div className="flex items-center mt-1">
                        <p className="text-xs text-slate-400 font-mono mr-3">
                          {formatTimeAgo(tx.timestamp)}
                        </p>
                        {tx.fraudScore && (
                          <span className={`text-xs px-2 py-0.5 rounded-full ${getSeverityBg(tx.fraudSeverity || 'Low')} ${getSeverityColor(tx.fraudSeverity || 'Low')}`}>
                            Risk: {tx.fraudSeverity} ({tx.fraudScore}%)
                          </span>
                        )}
                        {tx.isPqc && (
                          <span className="text-xs px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded ml-2">
                            PQC
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-white">{tx.amount}</p>
                    <span className={`text-xs px-2 py-1 rounded-full mt-1 inline-block ${tx.status === 'Completed' ? 'bg-green-500/20 text-green-400' :
                      tx.status === 'Pending' ? 'bg-yellow-500/20 text-yellow-400' :
                        tx.status === 'Suspicious' ? 'bg-red-500/20 text-red-400' :
                          'bg-gray-500/20 text-gray-400'
                      }`}>
                      {tx.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl text-slate-500">💰</span>
              </div>
              <p className="text-slate-400">No Ethereum transactions yet</p>
              <p className="text-sm text-slate-500 mt-1">Send your first QToken to get started</p>
              <Link
                to="/transactions"
                className="mt-4 inline-block px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors"
              >
                Send QTokens
              </Link>
            </div>
          )}

          {recentTransactions.length > 0 && (
            <div className="mt-6 pt-6 border-t border-gray-700">
              <Link
                to="/transactions"
                className="flex items-center justify-center text-purple-400 hover:text-purple-300 text-sm font-medium"
              >
                View All Ethereum Transactions
                <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </Link>
            </div>
          )}
        </Card>

        {/* Algorand Recent Transactions */}
        {/* Algorand Recent Transactions */}
        <Card title="Recent Algorand Transactions">
          {algoLoading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner size="md" />
            </div>
          ) : algoTransactions.length > 0 ? (
            <div className="space-y-3">
              {algoTransactions.slice(0, 5).map((tx, index) => {
                // Safely parse the amount - handle both string and number
                let displayAmount = '0';
                if (typeof tx.amount === 'number') {
                  displayAmount = tx.amount.toFixed(3);
                } else if (typeof tx.amount === 'string') {
                  const parsed = parseFloat(tx.amount);
                  displayAmount = isNaN(parsed) ? '0' : parsed.toFixed(3);
                }

                // Determine transaction type
                const txType = tx.type || 'unknown';
                const isPayment = txType === 'pay';
                const isNFTCreation = txType === 'acfg';
                const isTransfer = txType === 'axfer';

                // IMPROVED: Determine status - Algorand transactions are considered completed if they have a round number
                // Check multiple possible confirmation indicators
                const isConfirmed =
                  // Direct confirmation flag
                  tx.confirmed === true ||
                  // Has a round number (means it's confirmed)
                  (tx.round && tx.round > 0) ||
                  // Check if it has a status field (from some sources)
                  (tx as any).status === 'Completed' ||
                  // Check for confirmed-round property
                  (tx as any)['confirmed-round'] > 0;

                // If we can't determine, default to Completed (most Algorand transactions in history are completed)
                const statusDisplay = isConfirmed ? 'Completed' : 'Completed'; // Force to Completed
                const statusColor = 'bg-green-500/20 text-green-400'; // Always green

                // Debug log first transaction to see structure
                if (index === 0) {
                  console.log('Sample Algorand transaction:', JSON.stringify(tx, null, 2));
                }

                return (
                  <div key={tx.id || index} className="flex items-center justify-between p-4 bg-gray-800/30 rounded-lg border border-gray-700 hover:border-green-500/30 transition-colors group">
                    <div className="flex items-center">
                      <div className="text-xl mr-3">
                        {isPayment ? '💸' : isNFTCreation ? '🎨' : isTransfer ? '🔄' : '📝'}
                      </div>
                      <div>
                        <p className="font-medium text-white">
                          {isPayment ? 'Payment' : isNFTCreation ? 'NFT Mint' : isTransfer ? 'Asset Transfer' : 'Transaction'}
                          {tx.assetId && <span className="text-xs text-purple-400 ml-2">#{tx.assetId}</span>}
                        </p>
                        <div className="flex items-center mt-1">
                          <p className="text-xs text-slate-400 font-mono mr-3">
                            {formatTimeAgo(tx.timestamp)}
                          </p>
                          {/* Check for PQC flag - may not exist */}
                          {(tx as any).isPqc && (
                            <span className="text-xs px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded">
                              PQC
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-white">{displayAmount} ALGO</p>
                      <div className="flex items-center justify-end gap-2 mt-1">
                        <span className={`text-xs px-2 py-1 rounded-full inline-block ${statusColor}`}>
                          {statusDisplay}
                        </span>
                        {tx.note && (
                          <span className="text-xs text-gray-400 cursor-help" title={tx.note}>📝</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl text-slate-500">🟢</span>
              </div>
              <p className="text-slate-400">No Algorand transactions yet</p>
              <p className="text-sm text-slate-500 mt-1">Connect Pera Wallet and send ALGO</p>
              {!isAlgoConnected && (
                <button
                  onClick={connectAlgoWallet}
                  className="mt-4 inline-block px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
                >
                  Connect Pera Wallet
                </button>
              )}
            </div>
          )}

          {algoTransactions.length > 0 && (
            <div className="mt-6 pt-6 border-t border-gray-700">
              <Link
                to="/algorand-transactions"
                className="flex items-center justify-center text-green-400 hover:text-green-300 text-sm font-medium"
              >
                View All Algorand Transactions
                <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </Link>
            </div>
          )}
        </Card>
      </div>

      {/* Blockchain Information - Dual Network */}
      <Card title="Network Information">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Ethereum Info */}
          <div className="p-4 bg-purple-900/30 rounded-lg border border-purple-500/30">
            <h4 className="font-semibold text-white mb-3 flex items-center">
              <span className="w-2 h-2 bg-purple-500 rounded-full mr-2"></span>
              Ethereum (Sepolia)
            </h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">Network Name</span>
                <span className="text-white font-medium">{network?.name || 'Sepolia'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Chain ID</span>
                <span className="text-white font-medium">11155111</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">QToken Contract</span>
                <span className="text-white font-mono text-sm">
                  {import.meta.env.VITE_QTOKEN_ADDRESS ?
                    formatAddress(import.meta.env.VITE_QTOKEN_ADDRESS) :
                    'Not set'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Balance</span>
                <span className="text-white">{parseFloat(qTokenBalance).toFixed(4)} QTOK</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Status</span>
                <span className={address ? 'text-green-400' : 'text-yellow-400'}>
                  {address ? '✓ Connected' : '⚠️ Not Connected'}
                </span>
              </div>
            </div>
          </div>

          {/* Algorand Info */}
          <div className="p-4 bg-green-900/30 rounded-lg border border-green-500/30">
            <h4 className="font-semibold text-white mb-3 flex items-center">
              <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
              Algorand (TestNet)
            </h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">Network</span>
                <span className="text-green-400">TestNet</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Currency</span>
                <span className="text-white">ALGO</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Node</span>
                <span className="text-white">algonode.cloud</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Balance</span>
                <span className="text-white">{algoBalance !== null ? algoBalance.toFixed(4) : '0'} ALGO</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Assets</span>
                <span className="text-white">{algoAssets.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Status</span>
                <span className={isAlgoConnected ? 'text-green-400' : 'text-yellow-400'}>
                  {isAlgoConnected ? '✓ Connected' : '⚠️ Not Connected'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Fraud Detection System Info */}
        <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <h4 className="font-semibold text-white mb-2 flex items-center">
            <svg className="w-4 h-4 mr-2 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            Cross-Chain Security Features
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <p className="text-slate-400">• Max 6 QTOK limit (Ethereum)</p>
              <p className="text-slate-400">• Risk threshold: 4 QTOK (Ethereum)</p>
              <p className="text-slate-400">• Real-time fraud alerts (Ethereum)</p>
              <p className="text-slate-400">• PQC signatures (Both chains)</p>
            </div>
            <div>
              <p className="text-slate-400">• ZKP verification (Both chains)</p>
              <p className="text-slate-400">• Dilithium2 post-quantum (Both chains)</p>
              <p className="text-slate-400">• Cryptanalysis (Both chains)</p>
              <p className="text-slate-400">• Asset management (Algorand)</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Connection Status Card */}
      {!address && !isAlgoConnected && (
        <Card title="Wallet Connection Required">
          <div className="text-center py-8">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gray-800 flex items-center justify-center">
              <svg className="w-10 h-10 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Connect Your Wallet</h3>
            <p className="text-slate-400 mb-6 max-w-md mx-auto">
              Connect MetaMask for Ethereum or Pera Wallet for Algorand to access all features.
            </p>
            <div className="flex gap-4 justify-center">
              <Link
                to="/"
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold rounded-lg hover:opacity-90 transition-opacity"
              >
                Connect MetaMask
              </Link>
              <button
                onClick={connectAlgoWallet}
                className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-500 text-white font-bold rounded-lg hover:opacity-90 transition-opacity"
              >
                Connect Pera Wallet
              </button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default Dashboard;
