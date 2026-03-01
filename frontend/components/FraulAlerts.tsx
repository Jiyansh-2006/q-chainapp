// components/FraudAlert.tsx
import React, { useEffect, useState } from 'react';
import { useWallet } from '../hooks/useWallet';
import LoadingSpinner from './LoadingSpinner';

interface Alert {
  id: string;
  timestamp: string;
  severity: 'Low' | 'Medium' | 'High';
  probability: number;
  reason: string;
  amount: number;
  sender: string;
  receiver: string;
  dismissed: boolean;
}

const FraudAlert: React.FC = () => {
  const { address } = useWallet();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [loading, setLoading] = useState(false);

  // Mock transaction queue for testing (replace with actual WebSocket connection)
  const [transactionQueue, setTransactionQueue] = useState<any[]>([]);

  // Load existing alerts from localStorage
  useEffect(() => {
    const savedAlerts = localStorage.getItem('fraudAlerts');
    if (savedAlerts) {
      try {
        setAlerts(JSON.parse(savedAlerts));
      } catch (e) {
        console.error('Error loading alerts:', e);
      }
    }
  }, []);

  // Save alerts to localStorage
  useEffect(() => {
    localStorage.setItem('fraudAlerts', JSON.stringify(alerts));
  }, [alerts]);

  // Mock function to simulate receiving a transaction
  const simulateTransaction = () => {
    if (!address) return;

    const mockTransaction = {
      id: `tx_${Date.now()}`,
      amount: Math.random() * 10, // Random amount 0-10 QTOK
      fee: Math.random() * 0.01,
      sender_wallet: address,
      receiver_wallet: `0x${Math.random().toString(16).substr(2, 40)}`,
      timestamp: new Date().toISOString(),
      transaction_type: 'transfer'
    };

    setTransactionQueue(prev => [...prev, mockTransaction]);
  };

  // Check transaction queue and send for fraud detection
  useEffect(() => {
    if (transactionQueue.length > 0) {
      processTransaction(transactionQueue[0]);
    }
  }, [transactionQueue]);

  const processTransaction = async (transaction: any) => {
    setLoading(true);
    
    try {
      // Call your fraud detection API
      const response = await fetch('https://qchain-ai-backend.onrender.com/predict-fraud-real-time', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(transaction),
      });

      const result = await response.json();
      
      if (result.fraud || result.probability > 0.3) {
        // Add alert
        const newAlert: Alert = {
          id: `alert_${Date.now()}`,
          timestamp: new Date().toISOString(),
          severity: result.severity,
          probability: result.probability,
          reason: result.reason,
          amount: transaction.amount,
          sender: transaction.sender_wallet,
          receiver: transaction.receiver_wallet,
          dismissed: false
        };

        setAlerts(prev => [newAlert, ...prev.slice(0, 9)]); // Keep only last 10 alerts
        
        // Show browser notification
        if (Notification.permission === 'granted') {
          new Notification('⚠️ Suspicious Transaction Detected', {
            body: `Severity: ${result.severity} - ${transaction.amount} QTOK to ${transaction.receiver_wallet.substring(0, 6)}...`,
            icon: '/favicon.ico'
          });
        }
      }
    } catch (error) {
      console.error('Error checking transaction:', error);
    } finally {
      // Remove processed transaction from queue
      setTransactionQueue(prev => prev.slice(1));
      setLoading(false);
    }
  };

  const dismissAlert = (id: string) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === id ? { ...alert, dismissed: true } : alert
    ));
  };

  const clearAllAlerts = () => {
    setAlerts([]);
  };

  const requestNotificationPermission = () => {
    if (!("Notification" in window)) {
      alert("This browser does not support desktop notification");
      return;
    }

    if (Notification.permission === "granted") {
      return;
    }

    if (Notification.permission !== "denied") {
      Notification.requestPermission().then(permission => {
        if (permission === "granted") {
          console.log("Notification permission granted.");
        }
      });
    }
  };

  const activeAlerts = alerts.filter(alert => !alert.dismissed);
  const hasHighSeverity = activeAlerts.some(alert => alert.severity === 'High');

  return (
    <div className="relative">
      {/* Alert Badge/Button */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-4">
          <div className="flex items-center">
            <h3 className="text-lg font-bold text-white mr-3">Fraud Detection</h3>
            {activeAlerts.length > 0 && (
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                hasHighSeverity 
                  ? 'bg-red-500/20 text-red-400 animate-pulse' 
                  : 'bg-yellow-500/20 text-yellow-400'
              }`}>
                {activeAlerts.length} Alert{activeAlerts.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          
          {/* Monitor Toggle */}
          <div className="flex items-center">
            <span className="text-sm text-slate-400 mr-2">Live Monitoring:</span>
            <button
              onClick={() => setIsMonitoring(!isMonitoring)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full ${
                isMonitoring ? 'bg-brand-primary' : 'bg-dark-border'
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                isMonitoring ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>
        </div>

        {/* Test Button (for demo) */}
        <button
          onClick={simulateTransaction}
          disabled={!address || !isMonitoring || loading}
          className="px-4 py-2 bg-brand-primary/20 text-brand-primary text-sm font-medium rounded-lg hover:bg-brand-primary/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
        >
          {loading ? (
            <>
              <LoadingSpinner size="sm" className="mr-2" />
              Checking...
            </>
          ) : (
            <>
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Test Transaction
            </>
          )}
        </button>
      </div>

      {/* Active Alerts */}
      {activeAlerts.length > 0 && (
        <div className="mb-6 space-y-3">
          {activeAlerts.map((alert) => (
            <div
              key={alert.id}
              className={`p-4 rounded-lg border-l-4 ${
                alert.severity === 'High' 
                  ? 'bg-red-500/10 border-red-500' 
                  : alert.severity === 'Medium'
                  ? 'bg-yellow-500/10 border-yellow-500'
                  : 'bg-blue-500/10 border-blue-500'
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center mb-2">
                    <div className={`w-3 h-3 rounded-full mr-2 ${
                      alert.severity === 'High' ? 'bg-red-500 animate-pulse' :
                      alert.severity === 'Medium' ? 'bg-yellow-500' :
                      'bg-blue-500'
                    }`}></div>
                    <h4 className="font-bold text-white">
                      {alert.severity} Risk Transaction Detected
                    </h4>
                    <span className="ml-2 px-2 py-1 text-xs rounded-full bg-dark-border text-slate-300">
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
                      <span className="font-mono text-white">{alert.receiver.substring(0, 8)}...{alert.receiver.substring(34)}</span>
                    </div>
                    <div>
                      <span className="text-slate-400">Time: </span>
                      <span className="text-white">
                        {new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400">Type: </span>
                      <span className="text-white">Transfer</span>
                    </div>
                  </div>
                </div>
                
                <button
                  onClick={() => dismissAlert(alert.id)}
                  className="ml-4 p-2 text-slate-400 hover:text-white hover:bg-dark-border rounded-lg transition-colors"
                  title="Dismiss alert"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              {alert.severity === 'High' && (
                <div className="mt-3 p-3 bg-red-500/20 rounded-lg">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.998-.833-2.732 0L4.342 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    <span className="text-red-300 text-sm font-medium">
                      This transaction shows high-risk patterns. Consider reviewing before proceeding.
                    </span>
                  </div>
                </div>
              )}
            </div>
          ))}
          
          <div className="flex justify-between items-center pt-2">
            <button
              onClick={clearAllAlerts}
              className="text-sm text-slate-400 hover:text-white transition-colors"
            >
              Clear all alerts
            </button>
            <span className="text-xs text-slate-500">
              Last updated: {new Date().toLocaleTimeString()}
            </span>
          </div>
        </div>
      )}

      {/* Status Card */}
      <div className={`p-4 rounded-lg ${
        isMonitoring 
          ? 'bg-green-500/10 border border-green-500/20' 
          : 'bg-dark-border/50 border border-dark-border'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className={`w-3 h-3 rounded-full mr-3 ${
              isMonitoring ? 'bg-green-500 animate-pulse' : 'bg-slate-500'
            }`}></div>
            <div>
              <h4 className="font-medium text-white">
                {isMonitoring ? 'Live Monitoring Active' : 'Monitoring Paused'}
              </h4>
              <p className="text-sm text-slate-400">
                {isMonitoring 
                  ? 'Checking transactions for suspicious patterns...'
                  : 'Turn on monitoring to detect fraudulent transactions'
                }
              </p>
            </div>
          </div>
          
          <div className="text-right">
            <p className="text-sm text-slate-400">Detection Model</p>
            <p className="font-medium text-white">Random Forest (AUC: 0.94)</p>
          </div>
        </div>
        
        {!isMonitoring && (
          <div className="mt-4 p-3 bg-dark-bg rounded-lg">
            <p className="text-sm text-slate-300 mb-2">
              Features being monitored:
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <span className="text-slate-400">• Amount anomalies</span>
              <span className="text-slate-400">• Frequency patterns</span>
              <span className="text-slate-400">• Time of day</span>
              <span className="text-slate-400">• Fee ratios</span>
              <span className="text-slate-400">• Receiver diversity</span>
              <span className="text-slate-400">• Amount volatility</span>
            </div>
          </div>
        )}
      </div>

      {/* Notification Settings */}
      <div className="mt-4 p-4 bg-dark-bg/50 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium text-white mb-1">Notifications</h4>
            <p className="text-sm text-slate-400">Get alerts for suspicious transactions</p>
          </div>
          <button
            onClick={requestNotificationPermission}
            className="px-4 py-2 bg-dark-border text-sm text-white rounded-lg hover:bg-dark-border/80 transition-colors"
          >
            {Notification.permission === 'granted' ? '✓ Enabled' : 'Enable Notifications'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FraudAlert;
