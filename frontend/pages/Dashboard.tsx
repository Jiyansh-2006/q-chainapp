// pages/Dashboard.tsx
import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useWallet } from '../hooks/useWallet';
import Card from '../components/Card';
import LoadingSpinner from '../components/LoadingSpinner';
import { transactionMonitor } from '../services/transactionMonitor';

interface Transaction {
  hash: string;
  from: string;
  to: string;
  amount: string;
  timestamp: number;
  status: 'Completed' | 'Pending' | 'Failed';
  isPqc: boolean;
  fraudScore?: number;
  fraudSeverity?: 'Low' | 'Medium' | 'High';
  fraudReason?: string;
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
}

interface RiskStats {
  total_transactions: number;
  high_risk_count: number;
  medium_risk_count: number;
  low_risk_count: number;
  max_amount_allowed: number;
  risk_threshold: number;
}

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
  
  const [refreshing, setRefreshing] = useState(false);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [fraudAlerts, setFraudAlerts] = useState<FraudAlertType[]>([]);
  const [liveMonitoring, setLiveMonitoring] = useState(true);
  const [stats, setStats] = useState({
    totalTransactions: 0,
    fraudCount: 0,
    detectionRate: '0.0',
    avgResponseTime: '128ms',
    modelAccuracy: '94.2%'
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

  // Load transactions and alerts from localStorage
  useEffect(() => {
    const loadTransactions = () => {
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
      const interval = setInterval(() => {
        loadTransactions();
        loadAlerts();
        fetchRiskStats();
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [address, recentTransactions.length]);

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
        transactionHash: data.transaction?.hash
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
    await fetchRiskStats();
    setTimeout(() => setRefreshing(false), 1000);
  };

  // Test transaction function
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

  // Risk Stats Cards Component
  const RiskStatsCards = () => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <div className="bg-gradient-to-br from-green-500/10 to-green-600/5 rounded-xl p-6 border border-green-500/30">
        <div className="flex items-center justify-between mb-4">
          <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
            <span className="text-green-400 text-xl">🟢</span>
          </div>
          <span className="text-2xl font-bold text-green-400">{riskStats.low_risk_count}</span>
        </div>
        <h3 className="text-lg font-semibold text-white mb-1">Low Risk</h3>
        <p className="text-sm text-slate-400">Safe transactions</p>
      </div>

      <div className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 rounded-xl p-6 border border-yellow-500/30">
        <div className="flex items-center justify-between mb-4">
          <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center">
            <span className="text-yellow-400 text-xl">🟡</span>
          </div>
          <span className="text-2xl font-bold text-yellow-400">{riskStats.medium_risk_count}</span>
        </div>
        <h3 className="text-lg font-semibold text-white mb-1">Medium Risk</h3>
        <p className="text-sm text-slate-400">Review recommended</p>
      </div>

      <div className="bg-gradient-to-br from-red-500/10 to-red-600/5 rounded-xl p-6 border border-red-500/30">
        <div className="flex items-center justify-between mb-4">
          <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
            <span className="text-red-400 text-xl">🔴</span>
          </div>
          <span className="text-2xl font-bold text-red-400">{riskStats.high_risk_count}</span>
        </div>
        <h3 className="text-lg font-semibold text-white mb-1">High Risk</h3>
        <p className="text-sm text-slate-400">Requires attention</p>
      </div>
    </div>
  );

  // Quick Action Component
  const QuickAction: React.FC<{ 
    to: string, 
    label: string, 
    icon: string, 
    description: string 
  }> = ({ to, label, icon, description }) => (
    <Link 
      to={to} 
      className="flex flex-col items-center p-6 bg-gray-800/50 border border-gray-700 rounded-xl hover:border-blue-500/50 hover:bg-gray-800/80 transition-all duration-300 text-center group"
    >
      <div className="text-3xl mb-4 group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <h3 className="text-lg font-bold text-white mb-2">{label}</h3>
      <p className="text-sm text-slate-400">{description}</p>
      <div className="mt-4 flex items-center text-blue-400 text-sm">
        <span>Get Started</span>
        <svg className="w-4 h-4 ml-2 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
        </svg>
      </div>
    </Link>
  );

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
          <p className="text-slate-400">Manage your QToken assets with real-time fraud protection</p>
        </div>
        {address && (
          <div className="flex items-center gap-3">
            {/* WebSocket Connection Status */}
            <div className={`px-3 py-1 rounded-full text-xs font-medium flex items-center ${
              wsConnected ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
            }`}>
              <div className={`w-2 h-2 rounded-full mr-2 ${wsConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
              {wsConnected ? 'Live' : 'Offline'}
            </div>
            
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

      {/* Risk Stats Cards */}
      <RiskStatsCards />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* QToken Balance */}
        <Card title="QToken Balance" className="bg-gradient-to-br from-gray-800 to-gray-900">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-300">QToken Balance</h3>
              <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="text-3xl font-bold text-white mb-2">
              {parseFloat(qTokenBalance).toFixed(4)} <span className="text-blue-400">QTOK</span>
            </div>
            {address ? (
              <p className="text-sm text-slate-400">
                Connected: {formatAddress(address)}
              </p>
            ) : (
              <p className="text-sm text-slate-400">Connect wallet to view balance</p>
            )}
          </div>
        </Card>

        {/* ETH Balance */}
        <Card title="ETH Balance" className="bg-gradient-to-br from-gray-800 to-gray-900">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-300">ETH Balance</h3>
              <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
            </div>
            <div className="text-3xl font-bold text-white mb-2">
              {parseFloat(nativeBalance).toFixed(4)} <span className="text-purple-400">ETH</span>
            </div>
            <p className="text-sm text-slate-400">
              For transaction gas fees
            </p>
          </div>
        </Card>

        {/* Fraud Detection Stats */}
        <Card title="Fraud Detection" className="bg-gradient-to-br from-gray-800 to-gray-900">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-300">Detection Rate</h3>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                wsConnected ? 'bg-green-500/20' : 'bg-red-500/20'
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

        {/* Monitoring Status */}
        <Card title="Monitoring Status" className="bg-gradient-to-br from-gray-800 to-gray-900">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-300">Real-time</h3>
              <div className={`w-10 h-10 rounded-full ${
                liveMonitoring ? 'bg-green-500/20' : 'bg-red-500/20'
              } flex items-center justify-center`}>
                {liveMonitoring ? (
                  <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L6.59 6.59m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-white">
                {liveMonitoring ? 'Active' : 'Paused'}
              </span>
              <button
                onClick={() => setLiveMonitoring(!liveMonitoring)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full ${
                  liveMonitoring ? 'bg-green-500' : 'bg-gray-600'
                }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                  liveMonitoring ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>
            <p className="text-sm text-slate-400 mt-2">
              {liveMonitoring 
                ? `Real-time monitoring ${wsConnected ? 'connected' : 'connecting...'}` 
                : 'Monitoring disabled'
              }
            </p>
          </div>
        </Card>
      </div>

      {/* Real-Time Fraud Alerts */}
      <Card title="Real-Time Fraud Detection Alerts">
        <div className="space-y-4">
          {fraudAlerts.length > 0 ? (
            <>
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center">
                  <span className="text-lg font-bold text-white mr-3">Active Alerts</span>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    fraudAlerts.some(a => a.severity === 'High') 
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
                    className={`p-4 rounded-lg border-l-4 ${
                      alert.severity === 'High' 
                        ? 'bg-red-500/10 border-red-500' 
                        : alert.severity === 'Medium'
                        ? 'bg-yellow-500/10 border-yellow-500'
                        : 'bg-green-500/10 border-green-500'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center mb-2">
                          <div className={`w-3 h-3 rounded-full mr-2 ${
                            alert.severity === 'High' ? 'bg-red-500 animate-pulse' :
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
            </>
          ) : (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">No Fraud Alerts</h3>
              <p className="text-slate-400">All transactions are safe and secure</p>
              <button
                onClick={testFraudDetection}
                className="mt-4 px-4 py-2 bg-blue-500/20 text-blue-400 text-sm font-medium rounded-lg hover:bg-blue-500/30 transition-colors flex items-center mx-auto"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Test Detection System
              </button>
            </div>
          )}
          
          {/* Monitoring Status */}
          <div className={`p-4 rounded-lg mt-4 ${
            liveMonitoring 
              ? 'bg-green-500/10 border border-green-500/20' 
              : 'bg-gray-700/50 border border-gray-600'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className={`w-3 h-3 rounded-full mr-3 ${
                  liveMonitoring ? 'bg-green-500 animate-pulse' : 'bg-slate-500'
                }`}></div>
                <div>
                  <h4 className="font-medium text-white">
                    {liveMonitoring ? 'Live Monitoring Active' : 'Monitoring Paused'}
                  </h4>
                  <p className="text-sm text-slate-400">
                    {liveMonitoring 
                      ? 'Checking all transactions for suspicious patterns'
                      : 'Turn on monitoring to enable fraud detection'
                    }
                  </p>
                </div>
              </div>
              
              <div className="text-right">
                <p className="text-sm text-slate-400">Response Time</p>
                <p className="font-medium text-white">{stats.avgResponseTime}</p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Quick Actions */}
      <Card title="Quick Actions">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <QuickAction 
            to="/transactions" 
            label="Send QTokens" 
            description="Transfer QTokens (Max 6 QTOK)"
            icon="🚀"
          />
          <QuickAction 
            to="/mint" 
            label="Mint NFT" 
            description="Create quantum-secured NFTs"
            icon="🎨"
          />
          <QuickAction 
            to="/simulation" 
            label="Simulation" 
            description="Test quantum algorithms"
            icon="⚛️"
          />
          <QuickAction 
            to="/test" 
            label="Test Detection" 
            description="Test fraud detection system"
            icon="🔍"
          />
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Transactions */}
        <Card title="Recent Transactions">
          {recentTransactions.length > 0 ? (
            <div className="space-y-3">
              {recentTransactions.map((tx, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-gray-800/30 rounded-lg border border-gray-700 hover:border-blue-500/30 transition-colors group">
                  <div className="flex items-center">
                    <div className={`w-2 h-2 rounded-full mr-3 ${
                      tx.status === 'Completed' ? 'bg-green-500' :
                      tx.status === 'Pending' ? 'bg-yellow-500 animate-pulse' :
                      'bg-red-500'
                    }`}></div>
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
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-white">{tx.amount}</p>
                    {tx.isPqc && (
                      <span className="text-xs text-blue-400 flex items-center justify-end mt-1">
                        <span className="mr-1">🔒</span> PQC
                      </span>
                    )}
                    <span className={`text-xs px-2 py-1 rounded-full mt-1 inline-block ${
                      tx.status === 'Completed' ? 'bg-green-500/20 text-green-400' :
                      tx.status === 'Pending' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-red-500/20 text-red-400'
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
                <svg className="w-8 h-8 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
              </div>
              <p className="text-slate-400">No transactions yet</p>
              <p className="text-sm text-slate-500 mt-1">Send your first QToken to get started</p>
              <Link 
                to="/transactions"
                className="mt-4 inline-block px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                Send QTokens
              </Link>
            </div>
          )}
          
          {recentTransactions.length > 0 && (
            <div className="mt-6 pt-6 border-t border-gray-700">
              <Link 
                to="/transactions" 
                className="flex items-center justify-center text-blue-400 hover:text-blue-300 text-sm font-medium"
              >
                View All Transactions
                <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </Link>
            </div>
          )}
        </Card>

        {/* Blockchain Information */}
        <Card title="Blockchain Information">
          <div className="space-y-6">
            <div className="p-4 bg-gray-800/30 rounded-lg">
              <h4 className="font-semibold text-white mb-3">Local Network Setup</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">Network Name</span>
                  <span className="text-white font-medium">Localhost 8545</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Chain ID</span>
                  <span className="text-white font-medium">11155111</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">RPC URL</span>
                  <span className="text-white font-mono text-sm">http://localhost:8545</span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-gray-800/30 rounded-lg">
              <h4 className="font-semibold text-white mb-3">Contract Address</h4>
              <div className="bg-gray-900 p-3 rounded font-mono text-sm break-all">
                0x5FbDB2315678afecb367f032d93F642f64180aa3
              </div>
              <p className="text-xs text-slate-400 mt-2">QToken Smart Contract (Localhost)</p>
            </div>

            <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <h4 className="font-semibold text-white mb-2 flex items-center">
                <svg className="w-4 h-4 mr-2 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                Fraud Detection System
              </h4>
              <p className="text-sm text-slate-300">
                Real-time monitoring with AI detection:
              </p>
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                <span className="text-slate-400">• Max 6 QTOK limit</span>
                <span className="text-slate-400">• Risk threshold: 4 QTOK</span>
                <span className="text-slate-400">• Real-time alerts</span>
                <span className="text-slate-400">• PQC signatures</span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Connection Status Card */}
      {!address && (
        <Card title="Wallet Connection Required">
          <div className="text-center py-8">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gray-800 flex items-center justify-center">
              <svg className="w-10 h-10 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Connect Your Wallet</h3>
            <p className="text-slate-400 mb-6 max-w-md mx-auto">
              Connect your MetaMask wallet to access the Q-Chain dashboard and manage your QToken assets.
            </p>
            <Link 
              to="/"
              className="inline-block px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold rounded-lg hover:opacity-90 transition-opacity"
            >
              Connect Wallet
            </Link>
            <div className="mt-6 text-sm text-slate-500">
              <p>Make sure you have MetaMask installed and are connected to Localhost 8545</p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default Dashboard;
