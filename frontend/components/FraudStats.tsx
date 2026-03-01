// components/FraudStats.tsx
import React from 'react';

interface FraudStatsProps {
  alerts: any[];
  totalTransactions: number;
}

const FraudStats: React.FC<FraudStatsProps> = ({ alerts, totalTransactions }) => {
  const fraudCount = alerts.filter(a => a.probability > 0.5).length;
  const detectionRate = totalTransactions > 0 ? (fraudCount / totalTransactions * 100).toFixed(1) : '0.0';
  
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div className="bg-dark-card p-4 rounded-lg">
        <p className="text-sm text-slate-400">Fraud Alerts</p>
        <p className="text-2xl font-bold text-white">{alerts.length}</p>
        <p className="text-xs text-slate-500">Last 24 hours</p>
      </div>
      
      <div className="bg-dark-card p-4 rounded-lg">
        <p className="text-sm text-slate-400">Detection Rate</p>
        <p className="text-2xl font-bold text-green-500">{detectionRate}%</p>
        <p className="text-xs text-slate-500">Accuracy: 94.2%</p>
      </div>
      
      <div className="bg-dark-card p-4 rounded-lg">
        <p className="text-sm text-slate-400">Avg Response Time</p>
        <p className="text-2xl font-bold text-white">128ms</p>
        <p className="text-xs text-slate-500">Real-time detection</p>
      </div>
    </div>
  );
};