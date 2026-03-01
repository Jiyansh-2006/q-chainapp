// components/CryptanalysisDashboard.tsx
import React from 'react';
import { CryptanalysisResult } from '../types/quantum.types';

interface CryptanalysisDashboardProps {
  analysis: CryptanalysisResult;
  onRefresh?: () => void;
}

export const CryptanalysisDashboard: React.FC<CryptanalysisDashboardProps> = ({ 
  analysis, 
  onRefresh 
}) => {
  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'high': return 'text-red-400 bg-red-500/20 border-red-500/30';
      case 'medium': return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30';
      case 'low': return 'text-green-400 bg-green-500/20 border-green-500/30';
      default: return 'text-gray-400 bg-gray-500/20 border-gray-500/30';
    }
  };

  const getMetricColor = (value: number, thresholds: { good: number; warning: number }) => {
    if (value >= thresholds.good) return 'text-green-400';
    if (value >= thresholds.warning) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className="space-y-6">
      {/* Overall Security Status */}
      <div className={`p-6 rounded-xl border ${getRiskColor(analysis.risk)}`}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xl font-bold">Security Analysis</h3>
            <p className="text-sm opacity-80">Risk Level: {analysis.risk.toUpperCase()}</p>
          </div>
          <div className="text-3xl">
            {analysis.secure ? '✅' : '⚠️'}
          </div>
        </div>
        
        <div className="grid grid-cols-4 gap-4">
          <div>
            <div className="text-xs text-gray-400">Risk Score</div>
            <div className="text-2xl font-bold">{analysis.risk_score}%</div>
          </div>
          <div>
            <div className="text-xs text-gray-400">Issues Found</div>
            <div className="text-2xl font-bold">{analysis.issues.length}</div>
          </div>
          <div>
            <div className="text-xs text-gray-400">Recommendations</div>
            <div className="text-2xl font-bold">{analysis.recommendations.length}</div>
          </div>
          <div>
            <div className="text-xs text-gray-400">Secure</div>
            <div className="text-2xl font-bold">{analysis.secure ? 'Yes' : 'No'}</div>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 bg-gray-800/30 rounded-lg border border-gray-700">
          <h4 className="text-sm font-semibold text-gray-300 mb-3">Entropy Analysis</h4>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Entropy Score:</span>
              <span className={getMetricColor(analysis.metrics.entropy_score, { good: 0.8, warning: 0.5 })}>
                {(analysis.metrics.entropy_score * 100).toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-gray-700 h-2 rounded-full">
              <div 
                className={`h-2 rounded-full ${
                  analysis.metrics.entropy_score >= 0.8 ? 'bg-green-500' :
                  analysis.metrics.entropy_score >= 0.5 ? 'bg-yellow-500' : 'bg-red-500'
                }`}
                style={{ width: `${analysis.metrics.entropy_score * 100}%` }}
              />
            </div>
          </div>
        </div>

        <div className="p-4 bg-gray-800/30 rounded-lg border border-gray-700">
          <h4 className="text-sm font-semibold text-gray-300 mb-3">Timing Analysis</h4>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Timing Leak:</span>
              <span className={getMetricColor(1 - analysis.metrics.timing_leak_score, { good: 0.8, warning: 0.5 })}>
                {(analysis.metrics.timing_leak_score * 100).toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between text-xs text-gray-500">
              <span>Expected: {analysis.timestamp_analysis.expected_delay.toFixed(2)}ms</span>
              <span>Actual: {analysis.timestamp_analysis.actual_delay.toFixed(2)}ms</span>
            </div>
            {analysis.timestamp_analysis.is_suspicious && (
              <div className="mt-2 p-2 bg-red-500/10 rounded text-xs text-red-400">
                ⚠️ Timing variance detected
              </div>
            )}
          </div>
        </div>

        <div className="p-4 bg-gray-800/30 rounded-lg border border-gray-700">
          <h4 className="text-sm font-semibold text-gray-300 mb-3">Pattern Matching</h4>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Pattern Match:</span>
              <span className={getMetricColor(1 - analysis.metrics.pattern_match, { good: 0.8, warning: 0.5 })}>
                {(analysis.metrics.pattern_match * 100).toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Signature Strength:</span>
              <span className={getMetricColor(analysis.metrics.signature_strength, { good: 0.9, warning: 0.7 })}>
                {(analysis.metrics.signature_strength * 100).toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        <div className="p-4 bg-gray-800/30 rounded-lg border border-gray-700">
          <h4 className="text-sm font-semibold text-gray-300 mb-3">Nonce Analysis</h4>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Nonce Reuse Risk:</span>
              <span className={getMetricColor(1 - analysis.metrics.nonce_reuse_risk, { good: 0.9, warning: 0.7 })}>
                {(analysis.metrics.nonce_reuse_risk * 100).toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Timestamp Drift:</span>
              <span className="text-yellow-400">
                {analysis.metrics.timestamp_drift.toFixed(2)}ms
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Issues & Recommendations */}
      {analysis.issues.length > 0 && (
        <div className="p-4 bg-red-500/10 rounded-lg border border-red-500/30">
          <h4 className="text-sm font-semibold text-red-400 mb-2">⚠️ Issues Detected</h4>
          <ul className="space-y-1">
            {analysis.issues.map((issue, idx) => (
              <li key={idx} className="text-sm text-gray-300 flex items-start">
                <span className="text-red-400 mr-2">•</span>
                {issue}
              </li>
            ))}
          </ul>
        </div>
      )}

      {analysis.recommendations.length > 0 && (
        <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/30">
          <h4 className="text-sm font-semibold text-blue-400 mb-2">💡 Recommendations</h4>
          <ul className="space-y-1">
            {analysis.recommendations.map((rec, idx) => (
              <li key={idx} className="text-sm text-gray-300 flex items-start">
                <span className="text-blue-400 mr-2">→</span>
                {rec}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};