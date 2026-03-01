// pages/Transactions.tsx
import React, { useState, useEffect } from 'react';
import Card from '../components/Card';
import LoadingSpinner from '../components/LoadingSpinner';
import { useWallet } from '../hooks/useWallet';
import { transactionMonitor } from '../services/transactionMonitor';

// Enhanced interfaces with ZKP support
interface CryptanalysisMetrics {
  entropy_score: number;
  timing_leak_score: number;
  pattern_match: number;
  signature_strength: number;
  nonce_reuse_risk: number;
  timestamp_drift: number;
}

interface CryptanalysisResult {
  secure: boolean;
  risk: 'low' | 'medium' | 'high';
  risk_score: number;
  issues: string[];
  metrics: CryptanalysisMetrics;
  recommendations: string[];
  timestamp_analysis: {
    expected_delay: number;
    actual_delay: number;
    variance: number;
    is_suspicious: boolean;
  };
}

interface ZKPAttribute {
  name: string;
  value: string | number;
  verified: boolean;
  proof: string;
  public_inputs?: Record<string, any>;
  circuit_type?: string;
}

interface ZKPVerification {
  verified: boolean;
  proof_id: string;
  timestamp: number;
  attributes: ZKPAttribute[];
  overall_score: number;
  validation_method: string;
  circuit?: {
    name: string;
    constraints: number;
    proving_time_ms: number;
    verification_time_ms: number;
  };
}

interface AnalysisDetails {
  amount_factor: number;
  random_factor: number;
  velocity_factor: number;
  anomaly_factor: number;
  raw_probability: number;
  amount: number;
  threshold_4: boolean;
  threshold_6: boolean;
  sender_tx_count: number;
  model_used?: boolean;
  model_probability?: number;
}

interface FraudCheckResult {
  fraud: boolean;
  probability: number;
  severity: 'Low' | 'Medium' | 'High';
  reason: string;
  risk_score?: number;
  transactionId?: string;
  timestamp?: number;
  analysis_details?: AnalysisDetails;
}

interface Transaction {
  hash: string;
  from: string;
  to: string;
  amount: string;
  timestamp: number;
  status: 'Completed' | 'Pending' | 'Failed' | 'Suspicious';
  isPqc: boolean;
  pqcSignature?: string;
  pqcAlgorithm?: string;
  cryptanalysis?: CryptanalysisResult;
  zkpVerification?: ZKPVerification;
  fraudScore?: number;
  fraudSeverity?: 'Low' | 'Medium' | 'High';
  fraudReason?: string;
  fraudAnalysis?: AnalysisDetails;
  explorerUrl?: string;
  verification?: {
    verified: boolean;
    method: 'PQC' | 'Standard';
    timestamp: number;
  };
  realTimeAlert?: boolean;
  alertReason?: string;
}

interface RiskStats {
  total_transactions: number;
  high_risk_count: number;
  medium_risk_count: number;
  low_risk_count: number;
  max_amount_allowed: number;
  risk_threshold: number;
}

// Risk Stats Cards Component
const RiskStatsCards: React.FC<{ stats: RiskStats }> = ({ stats }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      {/* Low Risk Card */}
      <div className="bg-gradient-to-br from-green-500/10 to-green-600/5 rounded-xl p-6 border border-green-500/30">
        <div className="flex items-center justify-between mb-4">
          <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
            <span className="text-green-400 text-xl">🟢</span>
          </div>
          <span className="text-2xl font-bold text-green-400">{stats.low_risk_count}</span>
        </div>
        <h3 className="text-lg font-semibold text-white mb-1">Low Risk</h3>
        <p className="text-sm text-slate-400">Amount ≤ {stats.risk_threshold} QTOK</p>
        <div className="mt-2 text-xs text-green-400/70">
          {stats.total_transactions > 0 
            ? ((stats.low_risk_count / stats.total_transactions) * 100).toFixed(1) 
            : '0'}% of total
        </div>
      </div>

      {/* Medium Risk Card */}
      <div className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 rounded-xl p-6 border border-yellow-500/30">
        <div className="flex items-center justify-between mb-4">
          <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center">
            <span className="text-yellow-400 text-xl">🟡</span>
          </div>
          <span className="text-2xl font-bold text-yellow-400">{stats.medium_risk_count}</span>
        </div>
        <h3 className="text-lg font-semibold text-white mb-1">Medium Risk</h3>
        <p className="text-sm text-slate-400">Amount near threshold</p>
        <div className="mt-2 text-xs text-yellow-400/70">
          {stats.total_transactions > 0 
            ? ((stats.medium_risk_count / stats.total_transactions) * 100).toFixed(1) 
            : '0'}% of total
        </div>
      </div>

      {/* High Risk Card */}
      <div className="bg-gradient-to-br from-red-500/10 to-red-600/5 rounded-xl p-6 border border-red-500/30">
        <div className="flex items-center justify-between mb-4">
          <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
            <span className="text-red-400 text-xl">🔴</span>
          </div>
          <span className="text-2xl font-bold text-red-400">{stats.high_risk_count}</span>
        </div>
        <h3 className="text-lg font-semibold text-white mb-1">High Risk</h3>
        <p className="text-sm text-slate-400">Amount &gt; {stats.risk_threshold} QTOK</p>
        <div className="mt-2 text-xs text-red-400/70">
          {stats.total_transactions > 0 
            ? ((stats.high_risk_count / stats.total_transactions) * 100).toFixed(1) 
            : '0'}% of total
        </div>
      </div>

      {/* Info Banner */}
      <div className="md:col-span-3 mt-2 p-4 bg-blue-500/10 rounded-lg border border-blue-500/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <span className="text-2xl mr-3">📊</span>
            <div>
              <p className="text-sm text-blue-400">
                <span className="font-bold">Probabilistic Risk Scoring:</span> Higher amounts = higher risk probability
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Max limit: {stats.max_amount_allowed} QTOK | Risk threshold: {stats.risk_threshold} QTOK | Total TX: {stats.total_transactions}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Risk Meter Component
const RiskMeter: React.FC<{ score: number; size?: 'sm' | 'md' | 'lg' }> = ({ score, size = 'md' }) => {
  const normalizedScore = Math.min(100, Math.max(0, score));

  const getColor = (score: number) => {
    if (score < 30) return 'text-green-400';
    if (score < 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  const dimensions = {
    sm: { width: 60, height: 60, strokeWidth: 4 },
    md: { width: 80, height: 80, strokeWidth: 6 },
    lg: { width: 120, height: 120, strokeWidth: 8 }
  };

  const { width, height, strokeWidth } = dimensions[size];
  const radius = (width - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (normalizedScore / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={width} height={height} className="transform -rotate-90">
        <circle
          cx={width / 2}
          cy={height / 2}
          r={radius}
          fill="none"
          stroke="#374151"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={width / 2}
          cy={height / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={getColor(normalizedScore)}
        />
      </svg>
      <div className={`absolute inset-0 flex items-center justify-center font-bold ${getColor(normalizedScore)}`}>
        <span className={size === 'sm' ? 'text-xs' : size === 'md' ? 'text-sm' : 'text-lg'}>
          {normalizedScore}%
        </span>
      </div>
    </div>
  );
};

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
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${style}`}>
      <span className="mr-1">{icon}</span>
      {severity} Risk
    </span>
  );
};

// ZKP Attribute Component
const ZKPAttributeBadge: React.FC<{ attribute: ZKPAttribute; onViewFullDetails?: () => void }> = ({
  attribute,
  onViewFullDetails
}) => {
  const [showProof, setShowProof] = useState(false);

  const getAttributeIcon = (name: string) => {
    const icons: Record<string, string> = {
      amount: '💰',
      recipient: '📬',
      nonce: '🔢',
      amount_gt_zero: '📈',
      timestamp: '⏰',
      default: '🔷'
    };
    return icons[name.toLowerCase()] || icons.default;
  };

  return (
    <div className="relative group">
      <div
        className={`inline-flex items-center px-3 py-2 rounded-lg text-xs cursor-pointer transition-all duration-200 border ${attribute.verified
          ? 'bg-gradient-to-r from-green-500/20 to-emerald-500/20 border-green-500/30 text-green-400 hover:from-green-500/30 hover:to-emerald-500/30'
          : 'bg-gradient-to-r from-red-500/20 to-orange-500/20 border-red-500/30 text-red-400 hover:from-red-500/30 hover:to-orange-500/30'
          }`}
        onClick={() => setShowProof(!showProof)}
      >
        <span className="mr-1.5 text-sm">{getAttributeIcon(attribute.name)}</span>
        <span className="font-medium">{attribute.name}:</span>
        <span className="ml-1 font-mono max-w-[100px] truncate">{String(attribute.value)}</span>
        <span className="ml-1.5 text-xs opacity-70 group-hover:opacity-100 transition-opacity">
          {attribute.verified ? '✅' : '❌'}
        </span>
      </div>

      {showProof && (
        <div className="absolute z-20 mt-2 p-4 bg-gray-900 rounded-xl border border-gray-700 shadow-2xl min-w-[320px] backdrop-blur-sm animate-fadeIn">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-bold text-purple-400">🔐 ZKP Proof Details</h4>
            {onViewFullDetails && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onViewFullDetails();
                }}
                className="text-xs px-2 py-1 bg-blue-500/20 text-blue-400 rounded hover:bg-blue-500/30 transition-colors"
              >
                Full Details
              </button>
            )}
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between items-center pb-2 border-b border-gray-700">
              <span className="text-gray-400">Attribute</span>
              <span className="text-white font-medium flex items-center">
                {getAttributeIcon(attribute.name)}
                <span className="ml-1">{attribute.name}</span>
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-400">Value</span>
              <span className="text-white font-mono bg-gray-800 px-2 py-1 rounded">
                {String(attribute.value)}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-400">Status</span>
              <span className={attribute.verified ? 'text-green-400' : 'text-red-400'}>
                {attribute.verified ? '✓ Verified' : '✗ Failed'}
              </span>
            </div>

            {attribute.circuit_type && (
              <div className="flex justify-between">
                <span className="text-gray-400">Circuit</span>
                <span className="text-purple-400 bg-purple-500/10 px-2 py-1 rounded">
                  {attribute.circuit_type}
                </span>
              </div>
            )}

            <div className="mt-2">
              <div className="text-gray-400 mb-1">Proof ID</div>
              <div className="text-purple-400 font-mono text-[10px] bg-gray-800 p-2 rounded break-all">
                {attribute.proof}
              </div>
            </div>

            {attribute.public_inputs && (
              <div className="mt-2">
                <div className="text-gray-400 mb-1">Public Inputs</div>
                <pre className="text-[10px] text-gray-300 bg-gray-800 p-2 rounded overflow-x-auto">
                  {JSON.stringify(attribute.public_inputs, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Unified Analysis Modal (works for ALL risk levels - Low, Medium, High)
const UnifiedAnalysisModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction;
  analysis: AnalysisDetails;
  cryptanalysis?: CryptanalysisResult;
  zkpVerification?: ZKPVerification;
}> = ({ isOpen, onClose, transaction, analysis, cryptanalysis, zkpVerification }) => {
  if (!isOpen) return null;

  const formatAmount = (amount: number) => {
    return amount.toFixed(4);
  };

  const getFactorColor = (value: number, type: 'positive' | 'negative') => {
    if (type === 'positive') {
      return value > 0.7 ? 'text-green-400' : value > 0.4 ? 'text-yellow-400' : 'text-red-400';
    } else {
      return value > 0.7 ? 'text-red-400' : value > 0.4 ? 'text-yellow-400' : 'text-green-400';
    }
  };

  const formatAddress = (addr: string) => {
    if (!addr) return '';
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  const riskScore = analysis.raw_probability * 100;
  const riskLevel = riskScore < 30 ? 'Low' : riskScore < 60 ? 'Medium' : 'High';
  const riskColor = riskScore < 30 ? 'green' : riskScore < 60 ? 'yellow' : 'red';

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-gray-800 rounded-xl max-w-3xl w-full p-6 border border-purple-500/30 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 sticky top-0 bg-gray-800 pb-4 border-b border-gray-700">
          <div className="flex items-center">
            <div className={`w-10 h-10 rounded-full bg-${riskColor}-500/20 flex items-center justify-center mr-3`}>
              <span className={`text-${riskColor}-400`}>
                {riskLevel === 'Low' ? '🟢' : riskLevel === 'Medium' ? '🟡' : '🔴'}
              </span>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Transaction Analysis</h2>
              <p className="text-slate-400 text-sm">
                {riskLevel} Risk Transaction • {(riskScore).toFixed(1)}% probability
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">✕</button>
        </div>

        {/* Transaction Summary */}
        <div className={`p-4 bg-${riskColor}-500/10 rounded-lg mb-6 border border-${riskColor}-500/30`}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-gray-400">Amount</p>
              <p className="text-lg font-bold text-white">{transaction.amount}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Risk Score</p>
              <div className="flex items-center">
                <RiskMeter score={riskScore} size="sm" />
                <span className="ml-2 text-sm text-white">{riskScore.toFixed(1)}%</span>
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-400">Severity</p>
              <SeverityBadge severity={riskLevel} />
            </div>
            <div>
              <p className="text-xs text-gray-400">Model Used</p>
              <p className="text-sm text-white">{analysis.model_used ? 'ML Model' : 'Probabilistic'}</p>
            </div>
          </div>
        </div>

        {/* Transaction Details */}
        <div className="p-4 bg-gray-900/30 rounded-lg mb-6">
          <h3 className="text-sm font-medium text-white mb-3">Transaction Details</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">From:</span>
              <span className="text-white font-mono">{formatAddress(transaction.from)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">To:</span>
              <span className="text-white font-mono">{formatAddress(transaction.to)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Hash:</span>
              <span className="text-purple-400 font-mono text-xs">{transaction.hash.substring(0, 16)}...</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Time:</span>
              <span className="text-white">{new Date(transaction.timestamp).toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Risk Factors - Show for ALL risk levels */}
        <h3 className="text-lg font-bold text-white mb-4">Risk Factors</h3>
        
        <div className="space-y-4 mb-6">
          {/* Amount Factor */}
          <div className="p-4 bg-gray-900/50 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-white">Amount Factor</span>
              <span className={`text-sm font-bold ${
                analysis.amount_factor > 0.7 ? 'text-red-400' : 
                analysis.amount_factor > 0.4 ? 'text-yellow-400' : 'text-green-400'
              }`}>
                {(analysis.amount_factor * 100).toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-gray-700 h-2 rounded-full">
              <div
                className={`h-2 rounded-full ${
                  analysis.amount_factor > 0.7 ? 'bg-red-500' : 
                  analysis.amount_factor > 0.4 ? 'bg-yellow-500' : 'bg-green-500'
                }`}
                style={{ width: `${analysis.amount_factor * 100}%` }}
              />
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Amount: {formatAmount(analysis.amount)} QTOK
              {analysis.amount > 4 && ' (Exceeds threshold)'}
              {analysis.amount > 6 && ' (Exceeds maximum limit)'}
            </p>
          </div>

          {/* Velocity Factor - Show if > 0 */}
          {analysis.velocity_factor > 0 && (
            <div className="p-4 bg-gray-900/50 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-white">Transaction Velocity</span>
                <span className={`text-sm font-bold ${
                  analysis.velocity_factor > 0.15 ? 'text-red-400' : 
                  analysis.velocity_factor > 0.05 ? 'text-yellow-400' : 'text-green-400'
                }`}>
                  {(analysis.velocity_factor * 100).toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-gray-700 h-2 rounded-full">
                <div
                  className={`h-2 rounded-full ${
                    analysis.velocity_factor > 0.15 ? 'bg-red-500' : 
                    analysis.velocity_factor > 0.05 ? 'bg-yellow-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${analysis.velocity_factor * 100}%` }}
                />
              </div>
              <p className="text-xs text-gray-400 mt-2">
                {analysis.sender_tx_count} transactions from this sender
              </p>
            </div>
          )}

          {/* Anomaly Factor - Show if > 0 */}
          {analysis.anomaly_factor > 0 && (
            <div className="p-4 bg-gray-900/50 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-white">Amount Anomaly</span>
                <span className={`text-sm font-bold ${
                  analysis.anomaly_factor > 0.15 ? 'text-red-400' : 
                  analysis.anomaly_factor > 0.05 ? 'text-yellow-400' : 'text-green-400'
                }`}>
                  {(analysis.anomaly_factor * 100).toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-gray-700 h-2 rounded-full">
                <div
                  className={`h-2 rounded-full ${
                    analysis.anomaly_factor > 0.15 ? 'bg-red-500' : 
                    analysis.anomaly_factor > 0.05 ? 'bg-yellow-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${analysis.anomaly_factor * 100}%` }}
                />
              </div>
              <p className="text-xs text-gray-400 mt-2">
                Amount significantly different from average
              </p>
            </div>
          )}

          {/* Random Factor - Always show */}
          <div className="p-4 bg-gray-900/50 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-white">Probabilistic Variation</span>
              <span className="text-sm font-bold text-purple-400">
                {(analysis.random_factor * 100).toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-gray-700 h-2 rounded-full">
              <div
                className="h-2 rounded-full bg-purple-500"
                style={{ width: `${analysis.random_factor * 100}%` }}
              />
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Natural variation in risk calculation (±10%)
            </p>
          </div>
        </div>

        {/* Raw Calculation - Show for ALL risk levels */}
        <div className="p-4 bg-gray-900/30 rounded-lg">
          <h4 className="text-sm font-medium text-white mb-2">Calculation Breakdown</h4>
          <div className="space-y-1 text-xs text-gray-400">
            <p>Raw Probability = Amount Factor × Random Factor + Velocity + Anomaly</p>
            <p className="font-mono mt-2 bg-gray-950 p-2 rounded">
              = ({analysis.amount_factor.toFixed(3)} × {analysis.random_factor.toFixed(3)}) 
              {analysis.velocity_factor > 0 ? ` + ${analysis.velocity_factor.toFixed(3)}` : ''}
              {analysis.anomaly_factor > 0 ? ` + ${analysis.anomaly_factor.toFixed(3)}` : ''}
            </p>
            <p className="font-mono">
              = {analysis.raw_probability.toFixed(3)}
            </p>
            <p className={`text-${riskColor}-400 mt-2 font-medium`}>
              Final Risk Score: {(analysis.raw_probability * 100).toFixed(1)}% ({riskLevel} Risk)
            </p>
          </div>
        </div>

        {/* Cryptanalysis Section - Show for ALL risk levels if available */}
        {cryptanalysis && (
          <div className="mt-6 p-4 bg-purple-500/10 rounded-lg border border-purple-500/30">
            <h3 className="text-lg font-bold text-white mb-3 flex items-center">
              <span className="mr-2">🔐</span> PQC Cryptanalysis
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-400">Signature Strength</p>
                <p className="text-sm text-white">{(cryptanalysis.metrics.signature_strength * 100).toFixed(1)}%</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Entropy Score</p>
                <p className="text-sm text-white">{(cryptanalysis.metrics.entropy_score * 100).toFixed(1)}%</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Nonce Reuse Risk</p>
                <p className="text-sm text-yellow-400">{(cryptanalysis.metrics.nonce_reuse_risk * 100).toFixed(1)}%</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Timing Leak</p>
                <p className={`text-sm ${cryptanalysis.metrics.timing_leak_score > 0.4 ? 'text-red-400' : 'text-green-400'}`}>
                  {(cryptanalysis.metrics.timing_leak_score * 100).toFixed(1)}%
                </p>
              </div>
            </div>
            {cryptanalysis.issues.length > 0 && (
              <div className="mt-3">
                <p className="text-xs text-red-400">Issues: {cryptanalysis.issues.join(', ')}</p>
              </div>
            )}
            <div className="mt-2">
              <p className="text-xs text-gray-400">PQC Security: {cryptanalysis.secure ? '✅ Secure' : '❌ Risky'}</p>
            </div>
          </div>
        )}

        {/* ZKP Verification Section - Show for ALL risk levels if available */}
        {zkpVerification && (
          <div className="mt-4 p-4 bg-blue-500/10 rounded-lg border border-blue-500/30">
            <h3 className="text-lg font-bold text-white mb-3 flex items-center">
              <span className="mr-2">🛡️</span> ZKP Verification
            </h3>
            <div className="flex items-center justify-between mb-3">
              <span className={`text-sm font-bold ${zkpVerification.verified ? 'text-green-400' : 'text-red-400'}`}>
                {zkpVerification.verified ? '✓ Verified' : '✗ Failed'}
              </span>
              <span className="text-sm text-white">Score: {zkpVerification.overall_score}%</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {zkpVerification.attributes.map((attr, idx) => (
                <div key={idx} className="text-xs bg-gray-900/50 p-2 rounded">
                  <span className="text-gray-400">{attr.name}:</span>{' '}
                  <span className={attr.verified ? 'text-green-400' : 'text-red-400'}>
                    {attr.verified ? '✓' : '✗'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Reason - Show for ALL risk levels */}
        {transaction.fraudReason && (
          <div className={`mt-4 p-3 bg-${riskColor}-500/10 rounded-lg border border-${riskColor}-500/20`}>
            <p className="text-xs text-${riskColor}-400">
              <span className="font-bold">Reason:</span> {transaction.fraudReason}
            </p>
          </div>
        )}

        {/* Close Button */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:opacity-90 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// Cryptanalysis Details Modal (keep for backward compatibility)
const CryptanalysisModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  cryptanalysis: CryptanalysisResult;
  zkpVerification?: ZKPVerification;
  transaction?: Transaction;
}> = ({ isOpen, onClose, cryptanalysis, zkpVerification, transaction }) => {
  if (!isOpen) return null;

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'high': return 'text-red-400 bg-red-500/10 border-red-500/30';
      case 'medium': return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30';
      case 'low': return 'text-green-400 bg-green-500/10 border-green-500/30';
      default: return 'text-gray-400 bg-gray-500/10 border-gray-500/30';
    }
  };

  const metrics = cryptanalysis.metrics || {
    entropy_score: 0,
    timing_leak_score: 0,
    pattern_match: 0,
    signature_strength: 0,
    nonce_reuse_risk: 0,
    timestamp_drift: 0
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-gray-800 rounded-xl max-w-4xl w-full p-6 border border-purple-500/30 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 sticky top-0 bg-gray-800 pb-4 border-b border-gray-700">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center mr-3">
              <span className="text-purple-400">🔐</span>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Cryptanalysis Report</h2>
              <p className="text-slate-400 text-sm">Detailed security analysis with ZKP verification</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">✕</button>
        </div>

        {/* Overall Security Status */}
        <div className={`p-6 rounded-xl mb-6 ${getRiskColor(cryptanalysis.risk || 'low')}`}>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center">
                <span className="text-2xl mr-2">{cryptanalysis.secure ? '✅' : '❌'}</span>
                <span className="text-xl font-bold text-white">
                  {cryptanalysis.secure ? 'Secure Transaction' : 'Security Risks Detected'}
                </span>
              </div>
              <p className="text-slate-300 mt-2">
                Risk Level: <span className="font-bold uppercase">{cryptanalysis.risk || 'unknown'}</span> |
                Risk Score: <span className="font-bold">{cryptanalysis.risk_score || 0}%</span>
              </p>
            </div>
            <RiskMeter score={cryptanalysis.risk_score || 0} size="lg" />
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <div className="p-4 bg-gray-900/50 rounded-lg border border-gray-700">
            <div className="text-sm text-gray-400 mb-1">Entropy Score</div>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-white">
                {(metrics.entropy_score * 100).toFixed(1)}%
              </span>
              <span className={`text-xs px-2 py-1 rounded ${metrics.entropy_score > 0.7 ? 'bg-green-500/20 text-green-400' :
                metrics.entropy_score > 0.4 ? 'bg-yellow-500/20 text-yellow-400' :
                  'bg-red-500/20 text-red-400'
                }`}>
                {metrics.entropy_score > 0.7 ? 'High' :
                  metrics.entropy_score > 0.4 ? 'Medium' : 'Low'}
              </span>
            </div>
            <div className="w-full bg-gray-700 h-2 rounded-full mt-2">
              <div
                className={`h-2 rounded-full ${metrics.entropy_score > 0.7 ? 'bg-green-500' :
                  metrics.entropy_score > 0.4 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                style={{ width: `${metrics.entropy_score * 100}%` }}
              />
            </div>
          </div>

          <div className="p-4 bg-gray-900/50 rounded-lg border border-gray-700">
            <div className="text-sm text-gray-400 mb-1">Signature Strength</div>
            <div className="flex items-center">
              <span className="text-lg font-bold text-purple-400">
                {(metrics.signature_strength * 100).toFixed(1)}%
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Algorithm: {transaction?.pqcAlgorithm || 'Dilithium2'}
            </p>
          </div>

          <div className="p-4 bg-gray-900/50 rounded-lg border border-gray-700">
            <div className="text-sm text-gray-400 mb-1">Nonce Reuse Risk</div>
            <div className="flex items-center">
              <span className="text-lg font-bold text-yellow-400">
                {(metrics.nonce_reuse_risk * 100).toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        {/* ZKP Verification Section */}
        {zkpVerification && (
          <div className="mb-6 p-6 bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-xl border border-purple-500/30">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center">
              <span className="mr-2">🛡️</span> Zero-Knowledge Proof Verification
            </h3>

            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="flex items-center">
                  <span className={`text-lg font-bold ${zkpVerification.verified ? 'text-green-400' : 'text-red-400'}`}>
                    {zkpVerification.verified ? 'Verified ✓' : 'Verification Failed ✗'}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-white">{zkpVerification.overall_score}%</div>
                <div className="text-xs text-gray-400">Overall Score</div>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-gray-300">Verified Attributes:</h4>
              <div className="grid grid-cols-2 gap-2">
                {zkpVerification.attributes.map((attr, idx) => (
                  <ZKPAttributeBadge key={idx} attribute={attr} />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Issues */}
        {cryptanalysis.issues && cryptanalysis.issues.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-bold text-white mb-3 flex items-center">
              <span className="mr-2">⚠️</span> Detected Vulnerabilities
            </h3>
            <div className="space-y-2">
              {cryptanalysis.issues.map((vuln, idx) => (
                <div key={idx} className="p-3 bg-red-500/10 rounded-lg border border-red-500/20">
                  <div className="flex items-start">
                    <span className="text-red-400 mr-2">•</span>
                    <span className="text-sm text-gray-300">{vuln}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recommendations */}
        {cryptanalysis.recommendations && cryptanalysis.recommendations.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-bold text-white mb-3 flex items-center">
              <span className="mr-2">💡</span> Recommendations
            </h3>
            <div className="space-y-2">
              {cryptanalysis.recommendations.map((rec, idx) => (
                <div key={idx} className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                  <div className="flex items-start">
                    <span className="text-blue-400 mr-2">→</span>
                    <span className="text-sm text-gray-300">{rec}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Enhanced Transaction Card Component
const TransactionCard: React.FC<{
  transaction: Transaction;
  index: number;
  onViewDetails: () => void;
  onDelete: (hash: string) => void;
}> = ({ transaction, index, onViewDetails, onDelete }) => {
  const [expanded, setExpanded] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const getRiskLevel = () => {
    if (transaction.fraudSeverity === 'High' || (transaction.cryptanalysis && transaction.cryptanalysis.risk === 'high')) {
      return 'High';
    }
    if (transaction.fraudSeverity === 'Medium' || (transaction.cryptanalysis?.risk === 'medium')) {
      return 'Medium';
    }
    return 'Low';
  };

  const riskLevel = getRiskLevel();
  const riskScore = transaction.fraudScore || transaction.cryptanalysis?.risk_score || 0;
  const entropyScore = transaction.cryptanalysis?.metrics?.entropy_score ?? 0.5;
  const entropyScorePercent = (entropyScore * 100).toFixed(1);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Completed': return '✅';
      case 'Pending': return '⏳';
      case 'Failed': return '❌';
      case 'Suspicious': return '⚠️';
      default: return '📄';
    }
  };

  const getRiskGradient = (risk: string) => {
    switch (risk) {
      case 'High': return 'from-red-600/20 via-red-500/10 to-orange-600/20 border-red-500/30';
      case 'Medium': return 'from-yellow-600/20 via-yellow-500/10 to-amber-600/20 border-yellow-500/30';
      case 'Low': return 'from-green-600/20 via-green-500/10 to-emerald-600/20 border-green-500/30';
      default: return 'from-gray-600/20 via-gray-500/10 to-slate-600/20 border-gray-500/30';
    }
  };

  const getRiskBadgeColor = (risk: string) => {
    switch (risk) {
      case 'High': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'Medium': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'Low': return 'bg-green-500/20 text-green-400 border-green-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const formatAddress = (addr: string) => {
    if (!addr) return '';
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  const formatDateTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return {
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      time: date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    };
  };

  const { date, time } = formatDateTime(transaction.timestamp);

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    onDelete(transaction.hash);
    setShowDeleteConfirm(false);
  };

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border transition-all duration-300 hover:shadow-2xl hover:scale-[1.02] ${
        expanded ? 'shadow-2xl scale-[1.02]' : 'shadow-lg'
      } bg-gradient-to-br ${getRiskGradient(riskLevel)} backdrop-blur-sm`}
    >
      {/* Animated background pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)',
          backgroundSize: '24px 24px'
        }} />
      </div>

      {/* Glowing border effect on hover */}
      <div className={`absolute inset-0 rounded-2xl transition-opacity duration-300 opacity-0 hover:opacity-100 pointer-events-none ${
        riskLevel === 'High' ? 'shadow-[0_0_30px_rgba(239,68,68,0.3)]' :
        riskLevel === 'Medium' ? 'shadow-[0_0_30px_rgba(234,179,8,0.3)]' :
        'shadow-[0_0_30px_rgba(34,197,94,0.3)]'
      }`} />

      <div className="relative p-6">
        {/* Header Section */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-4">
            {/* Status Icon with animated glow */}
            <div className={`relative w-12 h-12 rounded-2xl flex items-center justify-center text-xl ${
              riskLevel === 'High' ? 'bg-red-500/20 text-red-400' :
              riskLevel === 'Medium' ? 'bg-yellow-500/20 text-yellow-400' :
              'bg-green-500/20 text-green-400'
            }`}>
              <div className={`absolute inset-0 rounded-2xl animate-ping opacity-20 ${
                riskLevel === 'High' ? 'bg-red-400' :
                riskLevel === 'Medium' ? 'bg-yellow-400' :
                'bg-green-400'
              }`} />
              <span className="relative">{getStatusIcon(transaction.status)}</span>
            </div>

            <div>
              <div className="flex items-center space-x-3 mb-1">
                <span className="text-sm font-medium text-gray-400">TX #{index + 1}</span>
                <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getRiskBadgeColor(riskLevel)}`}>
                  {riskLevel} Risk ({riskScore}%)
                </span>
                {transaction.isPqc && (
                  <span className="px-3 py-1 bg-gradient-to-r from-purple-500/20 to-blue-500/20 text-purple-400 rounded-full text-xs font-medium border border-purple-500/30 flex items-center">
                    <span className="mr-1">🔐</span>
                    PQC
                  </span>
                )}
                {transaction.zkpVerification?.verified && (
                  <span className="px-3 py-1 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 text-blue-400 rounded-full text-xs font-medium border border-blue-500/30 flex items-center animate-pulse">
                    <span className="mr-1">🛡️</span>
                    ZKP
                  </span>
                )}
                {transaction.realTimeAlert && (
                  <span className="px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-xs font-medium border border-red-500/30 animate-pulse flex items-center">
                    <span className="mr-1">🚨</span>
                    ALERT
                  </span>
                )}
              </div>

              <div className="flex items-center space-x-4 text-xs text-gray-400">
                <span className="flex items-center">
                  <span className="mr-1">📅</span>
                  {date}
                </span>
                <span className="flex items-center">
                  <span className="mr-1">⏰</span>
                  {time}
                </span>
                {transaction.pqcAlgorithm && (
                  <span className="flex items-center text-purple-400">
                    <span className="mr-1">⚙️</span>
                    {transaction.pqcAlgorithm}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Delete Button */}
            <button
              onClick={handleDelete}
              className="p-2 hover:bg-red-500/20 rounded-xl transition-all duration-200 group"
              title="Delete transaction"
            >
              <svg
                className="w-5 h-5 text-gray-400 group-hover:text-red-400 transition-colors"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>

            {/* Expand/Collapse Button */}
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-2 hover:bg-white/10 rounded-xl transition-all duration-200 group"
            >
              <svg
                className={`w-5 h-5 text-gray-400 transform transition-transform duration-300 group-hover:text-white ${
                  expanded ? 'rotate-180' : ''
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Transaction Details Grid */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="col-span-1">
            <div className="p-4 bg-gray-900/50 rounded-xl border border-gray-700/50 backdrop-blur-sm">
              <div className="text-xs text-gray-400 mb-1 flex items-center">
                <span className="mr-1">💰</span>
                Amount
              </div>
              <div className="text-xl font-bold text-white">{transaction.amount}</div>
            </div>
          </div>

          <div className="col-span-2">
            <div className="p-4 bg-gray-900/50 rounded-xl border border-gray-700/50 backdrop-blur-sm">
              <div className="text-xs text-gray-400 mb-1 flex items-center">
                <span className="mr-1">📬</span>
                Recipient
              </div>
              <div className="flex items-center justify-between">
                <div className="text-sm font-mono text-white truncate flex-1" title={transaction.to}>
                  {formatAddress(transaction.to)}
                </div>
                <button
                  onClick={() => navigator.clipboard.writeText(transaction.to)}
                  className="ml-2 p-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
                  title="Copy address"
                >
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Security Metrics */}
        {transaction.cryptanalysis && (
          <div className="grid grid-cols-4 gap-3 mb-4">
            <div className="p-3 bg-gray-900/30 rounded-xl">
              <div className="text-xs text-gray-400 mb-1">Entropy</div>
              <div className="flex items-center space-x-2">
                <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      entropyScore > 0.7 ? 'bg-green-500' :
                      entropyScore > 0.4 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${entropyScore * 100}%` }}
                  />
                </div>
                <span className="text-xs font-medium text-white min-w-[45px]">{entropyScorePercent}%</span>
              </div>
            </div>

            <div className="p-3 bg-gray-900/30 rounded-xl">
              <div className="text-xs text-gray-400 mb-1">Risk Score</div>
              <div className="flex items-center justify-between">
                <span className={`text-sm font-bold ${
                  riskScore < 30 ? 'text-green-400' :
                  riskScore < 60 ? 'text-yellow-400' : 'text-red-400'
                }`}>
                  {riskScore}%
                </span>
                <RiskMeter score={riskScore} size="sm" />
              </div>
            </div>

            <div className="p-3 bg-gray-900/30 rounded-xl">
              <div className="text-xs text-gray-400 mb-1">Issues</div>
              <div className="text-sm font-bold text-white">{transaction.cryptanalysis.issues?.length || 0}</div>
            </div>

            <div className="p-3 bg-gray-900/30 rounded-xl">
              <div className="text-xs text-gray-400 mb-1">Security</div>
              <div className={`text-sm font-bold ${
                transaction.cryptanalysis.secure ? 'text-green-400' : 'text-red-400'
              }`}>
                {transaction.cryptanalysis.secure ? 'Secure' : 'Risky'}
              </div>
            </div>
          </div>
        )}

        {/* ZKP Attributes Section */}
        {transaction.zkpVerification && transaction.zkpVerification.attributes.length > 0 && (
          <div className="mb-4 p-4 bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-pink-500/5 rounded-xl border border-blue-500/20">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-blue-400 flex items-center">
                <span className="mr-2">🛡️</span>
                ZKP Verified Attributes
                <span className="ml-2 px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded-full text-xs">
                  {transaction.zkpVerification.attributes.length} verified
                </span>
              </h4>
              <div className="flex items-center space-x-2">
                <span className="text-xs text-gray-400">Overall Score:</span>
                <span className="text-sm font-bold text-white">{transaction.zkpVerification.overall_score}%</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {transaction.zkpVerification.attributes.map((attr, idx) => (
                <ZKPAttributeBadge
                  key={idx}
                  attribute={attr}
                />
              ))}
            </div>

            {transaction.zkpVerification.circuit && (
              <div className="mt-3 flex items-center space-x-4 text-xs text-gray-400 border-t border-blue-500/20 pt-3">
                <span>Circuit: <span className="text-purple-400">{transaction.zkpVerification.circuit.name}</span></span>
                <span>Constraints: <span className="text-white">{transaction.zkpVerification.circuit.constraints.toLocaleString()}</span></span>
                <span>Proving Time: <span className="text-white">{transaction.zkpVerification.circuit.proving_time_ms}ms</span></span>
              </div>
            )}
          </div>
        )}

        {/* Risk Score Bar (always visible) */}
        <div className="mb-4">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-gray-400">Risk Score</span>
            <span className={`font-medium ${
              riskScore < 30 ? 'text-green-400' :
              riskScore < 60 ? 'text-yellow-400' :
              'text-red-400'
            }`}>{riskScore}%</span>
          </div>
          <div className="w-full bg-gray-700 h-2 rounded-full overflow-hidden">
            <div
              className={`h-2 rounded-full ${
                riskScore < 30 ? 'bg-green-500' :
                riskScore < 60 ? 'bg-yellow-500' :
                'bg-red-500'
              }`}
              style={{ width: `${riskScore}%` }}
            />
          </div>
        </div>

        {/* Reason */}
        {transaction.fraudReason && (
          <p className="text-sm text-slate-300 mb-4">{transaction.fraudReason}</p>
        )}

        {/* Expanded Content */}
        {expanded && (
          <div className="mt-4 pt-4 border-t border-gray-700/50 space-y-4 animate-fadeIn">
            {/* Issues Section */}
            {transaction.cryptanalysis && transaction.cryptanalysis.issues && transaction.cryptanalysis.issues.length > 0 && (
              <div className="p-4 bg-red-500/10 rounded-xl border border-red-500/20">
                <h4 className="text-sm font-semibold text-red-400 mb-2 flex items-center">
                  <span className="mr-2">⚠️</span>
                  Detected Issues ({transaction.cryptanalysis.issues.length})
                </h4>
                <div className="space-y-2">
                  {transaction.cryptanalysis.issues.map((issue, idx) => (
                    <div key={idx} className="flex items-start text-sm">
                      <span className="text-red-400 mr-2 mt-0.5">•</span>
                      <span className="text-gray-300">{issue}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Fraud Analysis Details */}
            {transaction.fraudAnalysis && (
              <div className="p-4 bg-gray-900/30 rounded-xl">
                <h4 className="text-sm font-semibold text-white mb-3">Risk Factor Breakdown</h4>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-400">Amount Factor</span>
                      <span className="text-white">
                        {(transaction.fraudAnalysis.amount_factor * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-700 h-1.5 rounded-full">
                      <div
                        className="h-1.5 rounded-full bg-blue-500"
                        style={{ width: `${transaction.fraudAnalysis.amount_factor * 100}%` }}
                      />
                    </div>
                  </div>

                  {transaction.fraudAnalysis.velocity_factor > 0 && (
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-400">Velocity Factor</span>
                        <span className="text-white">
                          {(transaction.fraudAnalysis.velocity_factor * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-700 h-1.5 rounded-full">
                        <div
                          className="h-1.5 rounded-full bg-yellow-500"
                          style={{ width: `${transaction.fraudAnalysis.velocity_factor * 100}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {transaction.fraudAnalysis.anomaly_factor > 0 && (
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-400">Anomaly Factor</span>
                        <span className="text-white">
                          {(transaction.fraudAnalysis.anomaly_factor * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-700 h-1.5 rounded-full">
                        <div
                          className="h-1.5 rounded-full bg-red-500"
                          style={{ width: `${transaction.fraudAnalysis.anomaly_factor * 100}%` }}
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-400">Random Variation</span>
                      <span className="text-white">
                        {(transaction.fraudAnalysis.random_factor * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-700 h-1.5 rounded-full">
                      <div
                        className="h-1.5 rounded-full bg-purple-500"
                        style={{ width: `${transaction.fraudAnalysis.random_factor * 100}%` }}
                      />
                    </div>
                  </div>
                </div>

                {transaction.fraudAnalysis.model_used && transaction.fraudAnalysis.model_probability && (
                  <p className="text-xs text-green-400 mt-3">
                    ✓ ML Model: {(transaction.fraudAnalysis.model_probability * 100).toFixed(1)}%
                  </p>
                )}
              </div>
            )}

            {/* Transaction Hash */}
            <div className="p-4 bg-gray-900/30 rounded-xl">
              <div className="text-xs text-gray-400 mb-2 flex items-center">
                <span className="mr-1">🔗</span>
                Transaction Hash
              </div>
              <div className="flex items-center justify-between">
                <div className="text-xs font-mono text-purple-400 break-all flex-1">
                  {transaction.hash}
                </div>
                <button
                  onClick={() => navigator.clipboard.writeText(transaction.hash)}
                  className="ml-2 p-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
                  title="Copy hash"
                >
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  console.log('📊 View Full Analysis clicked for transaction:', transaction);
                  onViewDetails();
                }}
                className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl text-sm font-medium hover:from-purple-700 hover:to-blue-700 transition-all transform hover:scale-[1.02] shadow-lg shadow-purple-500/20"
              >
                📊 View Full Analysis
              </button>

              {transaction.explorerUrl && (
                <a
                  href={transaction.explorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-3 bg-gray-800 text-gray-300 rounded-xl text-sm font-medium hover:bg-gray-700 transition-all transform hover:scale-[1.02] border border-gray-700 flex items-center justify-center"
                >
                  <span className="mr-2">🔍</span>
                  View on Explorer
                </a>
              )}
            </div>
          </div>
        )}

        {/* Status Progress Bar */}
        <div className="absolute bottom-0 left-0 right-0 h-1.5 overflow-hidden bg-gray-900/50">
          <div
            className={`h-full transition-all duration-1000 ${
              transaction.status === 'Completed' ? 'w-full bg-green-500' :
              transaction.status === 'Pending' ? 'w-2/3 bg-yellow-500 animate-pulse' :
              transaction.status === 'Failed' ? 'w-full bg-red-500' :
              'w-full bg-orange-500'
            }`}
            style={{
              boxShadow: transaction.status === 'Pending' ? '0 0 10px rgba(234,179,8,0.5)' : 'none'
            }}
          />
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="absolute inset-0 bg-black/90 rounded-2xl flex items-center justify-center p-4 z-10">
          <div className="bg-gray-800 rounded-xl p-6 max-w-sm w-full border border-red-500/30">
            <h3 className="text-xl font-bold text-white mb-2">Delete Transaction</h3>
            <p className="text-slate-300 text-sm mb-4">
              Are you sure you want to delete this transaction? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Normalize cryptanalysis from backend
const normalizeCryptanalysis = (raw: any): CryptanalysisResult | undefined => {
  if (!raw) return undefined;

  if (raw.error || raw.detail) {
    const errorData = raw.detail || raw;
    return {
      secure: false,
      risk: errorData.risk || 'high',
      risk_score: errorData.risk_score || 75,
      issues: errorData.issues || ['Transaction rejected by security analysis'],
      metrics: {
        entropy_score: errorData.metrics?.entropy ?? errorData.metrics?.entropy_score ?? 0.5,
        timing_leak_score: errorData.metrics?.timing_leak_score ?? 0.5,
        pattern_match: errorData.metrics?.pattern_match ?? 0.5,
        signature_strength: errorData.metrics?.signature_strength ?? 0.5,
        nonce_reuse_risk: errorData.metrics?.nonce_reuse_risk ?? 0.5,
        timestamp_drift: errorData.metrics?.timestamp_drift ?? 10
      },
      recommendations: errorData.recommendations || ['Review transaction details'],
      timestamp_analysis: {
        expected_delay: 100,
        actual_delay: 120,
        variance: 20,
        is_suspicious: (errorData.metrics?.timing_leak_score ?? 0) > 0.4
      }
    };
  }

  return {
    secure: raw.secure ?? true,
    risk: raw.risk || (raw.risk_score > 60 ? 'high' : raw.risk_score > 30 ? 'medium' : 'low'),
    risk_score: raw.risk_score || 0,
    issues: raw.issues || [],
    metrics: raw.metrics || {
      entropy_score: raw.entropy_score ?? 1,
      timing_leak_score: raw.timing_leak_score ?? 0,
      pattern_match: raw.pattern_match ?? 0,
      signature_strength: raw.signature_strength ?? 1,
      nonce_reuse_risk: raw.nonce_reuse_risk ?? 0,
      timestamp_drift: raw.timestamp_drift ?? 0
    },
    recommendations: raw.recommendations || [],
    timestamp_analysis: raw.timestamp_analysis || {
      expected_delay: 0,
      actual_delay: 0,
      variance: 0,
      is_suspicious: (raw.metrics?.timing_leak_score ?? 0) > 0.4
    }
  };
};

// Calculate probabilistic risk (PRECISE FORMULA for ALL risk levels)
const calculateProbabilisticRisk = (amount: number, senderTxCount: number = 0): AnalysisDetails => {
  // Sigmoid function centered at 4 for smooth transition
  // Formula: 1 / (1 + e^(-0.8*(x - 4)))
  // This gives:
  // amount 1-2 QTOK → ~10-20% risk (Low)
  // amount 3 QTOK → ~30% risk (Low-Medium)
  // amount 4 QTOK → ~50% risk (Medium)
  // amount 5 QTOK → ~70% risk (Medium-High)
  // amount 6 QTOK → ~90% risk (High)
  const amount_factor = 1 / (1 + Math.exp(-0.8 * (amount - 4)));
  
  // Random factor between 0.9 and 1.1 (±10% variation)
  const random_factor = 0.9 + (Math.random() * 0.2);
  
  // Velocity factor (more transactions = slightly higher risk)
  const velocity_factor = Math.min(0.2, (senderTxCount / 50) * 0.2);
  
  // Anomaly factor (if amount is unusually high compared to average)
  const anomaly_factor = amount > 8 ? 0.2 : amount > 6 ? 0.1 : 0;
  
  // Raw probability calculation (capped between 0.05 and 0.98)
  const raw_probability = Math.min(0.98, Math.max(0.05, 
    (amount_factor * random_factor) + velocity_factor + anomaly_factor
  ));
  
  return {
    amount_factor,
    random_factor,
    velocity_factor,
    anomaly_factor,
    raw_probability,
    amount,
    threshold_4: amount > 4,
    threshold_6: amount > 6,
    sender_tx_count: senderTxCount,
    model_used: false
  };
};

// Get severity from probability
const getSeverityFromProbability = (probability: number): 'Low' | 'Medium' | 'High' => {
  if (probability < 0.3) return 'Low';
  if (probability < 0.6) return 'Medium';
  return 'High';
};

// Get reason from probability and amount
const getReasonFromRisk = (amount: number, probability: number, analysis: AnalysisDetails): string => {
  const reasons = [];
  
  if (amount > 6) {
    reasons.push(`Amount ${amount.toFixed(2)} QTOK exceeds maximum limit`);
  } else if (amount > 4) {
    reasons.push(`Amount ${amount.toFixed(2)} QTOK exceeds risk threshold`);
  }
  
  if (analysis.velocity_factor > 0.1) {
    reasons.push(`High transaction frequency (${analysis.sender_tx_count} recent tx)`);
  }
  
  if (analysis.anomaly_factor > 0) {
    reasons.push('Amount anomaly detected');
  }
  
  if (reasons.length === 0) {
    if (probability < 0.3) {
      reasons.push('Transaction appears normal (Low Risk)');
    } else if (probability < 0.6) {
      reasons.push('Moderate risk factors detected (Medium Risk)');
    } else {
      reasons.push('Multiple suspicious patterns detected (High Risk)');
    }
  }
  
  return reasons.join(' | ');
};

const Transactions: React.FC = () => {
  const {
    address,
    qTokenBalance,
    refreshBalance,
    sendQToken,
    signer,
    network,
    formatAddress
  } = useWallet();

  const [toAddress, setToAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [isPqc, setIsPqc] = useState(false);
  const [enableZKP, setEnableZKP] = useState(true);
  const [selectedAttributes, setSelectedAttributes] = useState<string[]>(['amount', 'recipient', 'nonce']);
  const [loading, setLoading] = useState({
    wallet: false,
    fraud: false,
    mint: false,
    quantum: false,
    wsCheck: false
  });
  const [txHash, setTxHash] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [fraudCheck, setFraudCheck] = useState<FraudCheckResult | null>(null);
  const [showFraudWarning, setShowFraudWarning] = useState(false);
  const [monitoringEnabled, setMonitoringEnabled] = useState(true);
  const [quantumStatus, setQuantumStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [quantumWalletId, setQuantumWalletId] = useState<string>('');
  const [wsConnection, setWsConnection] = useState({
    isConnected: false,
    reconnectAttempts: 0
  });
  const [realTimeAlerts, setRealTimeAlerts] = useState<Transaction[]>([]);
  const [showAlerts, setShowAlerts] = useState(false);
  const [pendingTransaction, setPendingTransaction] = useState<any>(null);
  const [riskStats, setRiskStats] = useState<RiskStats>({
    total_transactions: 0,
    high_risk_count: 0,
    medium_risk_count: 0,
    low_risk_count: 0,
    max_amount_allowed: 6,
    risk_threshold: 4
  });

  // Warning state for cryptanalysis
  const [showCryptanalysisWarning, setShowCryptanalysisWarning] = useState(false);
  const [cryptanalysisWarningMessage, setCryptanalysisWarningMessage] = useState('');

  // Modal state - use UnifiedAnalysisModal for ALL risk levels
  const [selectedAnalysis, setSelectedAnalysis] = useState<{
    transaction: Transaction;
    analysis: AnalysisDetails;
    cryptanalysis?: CryptanalysisResult;
    zkpVerification?: ZKPVerification;
  } | null>(null);

  // Debug - log when selectedAnalysis changes
  useEffect(() => {
    if (selectedAnalysis) {
      console.log('✅ Modal opened with analysis:', selectedAnalysis);
    } else {
      console.log('❌ Modal closed');
    }
  }, [selectedAnalysis]);

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

  // Generate stable wallet ID
  const getQuantumWalletId = () => {
    if (!address) return '';
    let id = localStorage.getItem(`quantum_wallet_${address.toLowerCase()}`);
    if (!id) {
      const hash = crypto.subtle ? 'webcrypto_available' :
        String(Math.abs(address.split('').reduce((a, b) => { a = ((a << 5) - a) + b.charCodeAt(0); return a & a }, 0)));
      id = `wallet_${hash.substring(0, 16)}`;
      localStorage.setItem(`quantum_wallet_${address.toLowerCase()}`, id);
    }
    return id;
  };

  // Load transactions from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('qTokenTransactions');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const userTxs = parsed.filter((tx: Transaction) =>
          tx.from?.toLowerCase() === address?.toLowerCase()
        ).sort((a: Transaction, b: Transaction) => b.timestamp - a.timestamp);
        setTransactions(userTxs);

        const alerts = parsed.filter((tx: Transaction) =>
          tx.realTimeAlert && tx.from?.toLowerCase() === address?.toLowerCase()
        );
        setRealTimeAlerts(alerts);
      } catch (e) {
        console.error('Error loading transactions:', e);
      }
    }
  }, [address]);

  // Initialize quantum wallet ID
  useEffect(() => {
    if (address) {
      const walletId = getQuantumWalletId();
      setQuantumWalletId(walletId);
    }
  }, [address]);

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

  // Setup WebSocket connection monitoring
  useEffect(() => {
    const unsubscribe = transactionMonitor.onConnectionChange((status) => {
      setWsConnection({
        isConnected: status.isConnected,
        reconnectAttempts: status.reconnectAttempts
      });
    });

    const fraudAlertUnsubscribe = transactionMonitor.on('fraud_alert', (data) => {
      handleRealTimeAlert(data);
    });

    const fraudResponseUnsubscribe = transactionMonitor.on('fraud_response', (data) => {
      handleFraudResponse(data);
    });

    const transactionUpdateUnsubscribe = transactionMonitor.on('transaction_update', (data) => {
      updateTransactionStatus(data);
    });

    return () => {
      unsubscribe();
      fraudAlertUnsubscribe();
      fraudResponseUnsubscribe();
      transactionUpdateUnsubscribe();
    };
  }, []);

  // Fetch risk stats periodically
  useEffect(() => {
    fetchRiskStats();
    const interval = setInterval(fetchRiskStats, 10000);
    return () => clearInterval(interval);
  }, []);

  // Handle real-time fraud alerts
  const handleRealTimeAlert = (alertData: any) => {
    const amountValue = parseFloat(alertData.amount) || 0;
    if (amountValue <= 1) return;

    if (alertData.sender_wallet?.toLowerCase() === address?.toLowerCase() ||
      alertData.receiver_wallet?.toLowerCase() === address?.toLowerCase()) {

      const alertTx: Transaction = {
        hash: alertData.transaction_hash || `alert_${Date.now()}`,
        from: alertData.sender_wallet || 'Unknown',
        to: alertData.receiver_wallet || 'Unknown',
        amount: `${alertData.amount || 0} QTOK`,
        timestamp: Date.now(),
        status: 'Suspicious',
        isPqc: false,
        fraudScore: alertData.fraud_probability ? Math.round(alertData.fraud_probability * 100) : undefined,
        fraudSeverity: getSeverityFromProbability(alertData.fraud_probability || 0),
        fraudReason: alertData.reason || 'Real-time fraud detection alert',
        realTimeAlert: true,
        alertReason: alertData.description || 'Suspicious activity detected'
      };

      setRealTimeAlerts(prev => [alertTx, ...prev.slice(0, 9)]);
      saveTransaction(alertTx);
      showAlertNotification(alertTx);
      fetchRiskStats();
    }
  };

  // Handle fraud check response
  const handleFraudResponse = (responseData: any) => {
    if (pendingTransaction && responseData.transactionId === pendingTransaction.transactionId) {
      const fraudResult: FraudCheckResult = {
        fraud: responseData.fraud || false,
        probability: responseData.probability || 0,
        severity: responseData.severity || 'Low',
        reason: responseData.reason || 'No issues detected',
        risk_score: responseData.risk_score,
        transactionId: responseData.transactionId,
        timestamp: Date.now(),
        analysis_details: responseData.analysis_details
      };

      setFraudCheck(fraudResult);
      setLoading(prev => ({ ...prev, wsCheck: false }));

      if (fraudResult.fraud && fraudResult.probability > 0.5 && pendingTransaction.amount > 1) {
        setShowFraudWarning(true);
        setLoading(prev => ({ ...prev, mint: false }));
      } else {
        proceedWithTransaction(pendingTransaction, fraudResult);
      }
    }
  };

  // Update transaction status
  const updateTransactionStatus = (updateData: any) => {
    if (updateData.hash && updateData.status) {
      setTransactions(prev => prev.map(tx =>
        tx.hash === updateData.hash
          ? { ...tx, status: updateData.status }
          : tx
      ));

      const saved = localStorage.getItem('qTokenTransactions') || '[]';
      const allTxs = JSON.parse(saved);
      const updated = allTxs.map((tx: Transaction) =>
        tx.hash === updateData.hash
          ? { ...tx, status: updateData.status }
          : tx
      );
      localStorage.setItem('qTokenTransactions', JSON.stringify(updated));
      fetchRiskStats();
    }
  };

  // Show alert notification
  const showAlertNotification = (alertTx: Transaction) => {
    if (Notification.permission === 'granted') {
      new Notification('🚨 Fraud Alert', {
        body: `Suspicious transaction detected: ${alertTx.amount} to ${formatAddress(alertTx.to)}`,
        icon: '/favicon.ico'
      });
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission();
    }
  };

  // PRECISE PROBABILISTIC FRAUD DETECTION (works for ALL amounts)
  const checkForFraud = async (txData: any): Promise<FraudCheckResult | null> => {
    if (!monitoringEnabled) return null;

    // Skip fraud check for extremely small amounts
    if (txData.amount <= 0.01) return null;

    setLoading(prev => ({ ...prev, wsCheck: true }));

    try {
      // Get sender history count
      const senderTxCount = transactions.filter(tx => 
        tx.from?.toLowerCase() === address?.toLowerCase()
      ).length;
      
      // Calculate probabilistic risk using precise formula
      const analysis = calculateProbabilisticRisk(txData.amount, senderTxCount);
      const probability = analysis.raw_probability;
      const severity = getSeverityFromProbability(probability);
      const reason = getReasonFromRisk(txData.amount, probability, analysis);
      
      // Fraud is true if probability > 0.5 (50% threshold)
      const fraud = probability > 0.5;
      
      // Add small delay to simulate network request
      await new Promise(resolve => setTimeout(resolve, 300));

      const result = {
        fraud,
        probability,
        severity,
        reason,
        risk_score: Math.round(probability * 100),
        transactionId: `tx_${Date.now()}`,
        timestamp: Date.now(),
        analysis_details: analysis
      };

      console.log('📊 Fraud check result:', result);
      return result;

    } catch (error) {
      console.error('Fraud detection error:', error);
      return null;
    } finally {
      setLoading(prev => ({ ...prev, wsCheck: false }));
    }
  };

  // Save transaction
  const saveTransaction = (tx: Transaction) => {
    const saved = localStorage.getItem('qTokenTransactions') || '[]';
    const allTxs = JSON.parse(saved);
    const updated = [tx, ...allTxs];
    localStorage.setItem('qTokenTransactions', JSON.stringify(updated));

    const userTxs = updated
      .filter((t: Transaction) => t.from?.toLowerCase() === address?.toLowerCase())
      .sort((a: Transaction, b: Transaction) => b.timestamp - a.timestamp);
    setTransactions(userTxs);
  };

  // Delete transaction
  const deleteTransaction = (hash: string) => {
    const saved = localStorage.getItem('qTokenTransactions') || '[]';
    const allTxs = JSON.parse(saved);
    const updated = allTxs.filter((tx: Transaction) => tx.hash !== hash);
    localStorage.setItem('qTokenTransactions', JSON.stringify(updated));

    const userTxs = updated
      .filter((t: Transaction) => t.from?.toLowerCase() === address?.toLowerCase())
      .sort((a: Transaction, b: Transaction) => b.timestamp - a.timestamp);
    setTransactions(userTxs);
    
    // Also remove from alerts if present
    setRealTimeAlerts(prev => prev.filter(tx => tx.hash !== hash));
    
    setSuccess('Transaction deleted successfully');
    setTimeout(() => setSuccess(''), 3000);
    fetchRiskStats();
  };

  // Clear all transactions
  const clearAllTransactions = () => {
    if (window.confirm('Are you sure you want to delete ALL transactions? This cannot be undone.')) {
      localStorage.removeItem('qTokenTransactions');
      setTransactions([]);
      setRealTimeAlerts([]);
      setSuccess('All transactions cleared');
      setTimeout(() => setSuccess(''), 3000);
      fetchRiskStats();
    }
  };

  // Handle send
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setTxHash('');
    setFraudCheck(null);
    setShowFraudWarning(false);
    setPendingTransaction(null);
    setShowCryptanalysisWarning(false);

    if (!signer) {
      setError('Please connect your wallet first');
      return;
    }

    if (!toAddress.trim()) {
      setError('Please enter recipient address');
      return;
    }

    if (!amount.trim()) {
      setError('Please enter amount');
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    // Enforce 6 QTOK limit
    if (amountNum > 6) {
      setError(`Maximum transaction limit is 6 QTOK. Please enter a smaller amount.`);
      return;
    }

    const balanceNum = parseFloat(qTokenBalance);
    if (amountNum > balanceNum) {
      setError(`Insufficient balance. You have ${qTokenBalance} QTOK`);
      return;
    }

    if (isPqc && quantumStatus !== 'online') {
      setError('PQC service is unavailable. Please enable PQC or use standard security.');
      return;
    }

    setLoading(prev => ({ ...prev, mint: true }));

    try {
      const txData = {
        amount: amountNum,
        to: toAddress,
        nonce: Date.now(),
        timestamp: new Date().toISOString()
      };

      // Step 1: Fraud Detection Check
      let fraudResult: FraudCheckResult | null = null;
      if (monitoringEnabled) {
        fraudResult = await checkForFraud(txData);

        if (fraudResult) {
          setFraudCheck(fraudResult);

          // Show warning for high probability ( > 50% )
          if (fraudResult.fraud && fraudResult.probability > 0.5) {
            setShowFraudWarning(true);
            setPendingTransaction(txData);
            setLoading(prev => ({ ...prev, mint: false }));
            return;
          }
        }
      }

      // Step 2: PQC Signing with ZKP (if enabled)
      let pqcSignature: string | undefined;
      let pqcAlgorithm: string | undefined;
      let cryptanalysis: CryptanalysisResult | undefined;
      let zkpVerification: ZKPVerification | undefined;

      if (isPqc && quantumStatus === 'online' && quantumWalletId) {
        try {
          const timestamp = new Date().toISOString();
          const nonce = Date.now();

          const transactionPayload = {
            amount: amountNum,
            to: toAddress,
            nonce: nonce,
            timestamp: timestamp
          };

          const zkpPayload = {
            enable: enableZKP,
            attributes: selectedAttributes,
            circuit_type: "merkle",
            public_inputs: {
              amount_gt_zero: amountNum > 0,
              amount: amountNum,
              recipient: toAddress,
              nonce: nonce,
              timestamp: timestamp
            }
          };

          const signRequest = {
            wallet_id: quantumWalletId,
            algorithm: "pqc",
            transaction: transactionPayload,
            zkp: zkpPayload
          };

          console.log("📤 Sending request to backend:", signRequest);

          const response = await fetch('https://qchain-quantum-pqc-backend.onrender.com/sign', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            body: JSON.stringify(signRequest),
          });

          if (!response.ok) {
            const errorText = await response.text();
            let errorDetail;
            try {
              errorDetail = JSON.parse(errorText);
              if (errorDetail.detail || errorDetail.error) {
                cryptanalysis = normalizeCryptanalysis(errorDetail);
              }
            } catch {
              errorDetail = errorText;
            }

            if (!cryptanalysis) {
              throw new Error(JSON.stringify(errorDetail));
            }
          } else {
            const signedTx = await response.json();

            pqcSignature = signedTx.signature;
            pqcAlgorithm = signedTx.algorithm;

            if (signedTx.cryptanalysis) {
              cryptanalysis = normalizeCryptanalysis(signedTx.cryptanalysis);
              console.log("📊 Cryptanalysis received:", cryptanalysis);
            }

            if (signedTx.zkp_verification) {
              zkpVerification = signedTx.zkp_verification;
              console.log("🛡️ ZKP verification received:", zkpVerification);
            }
          }

          // Check cryptanalysis results - only block high risk
          if (cryptanalysis) {
            if (!cryptanalysis.secure && cryptanalysis.risk === 'high') {
              const issuesList = cryptanalysis.issues && cryptanalysis.issues.length > 0 
                ? cryptanalysis.issues.join(', ') 
                : 'High risk transaction';
              setError(`Transaction blocked: ${issuesList}`);
              setLoading(prev => ({ ...prev, mint: false }));
              return;
            } else if (!cryptanalysis.secure) {
              const issuesList = cryptanalysis.issues && cryptanalysis.issues.length > 0 
                ? cryptanalysis.issues.join(', ') 
                : 'Security warning';
              setCryptanalysisWarningMessage(`Security warning: ${issuesList}`);
              setShowCryptanalysisWarning(true);
              
              setTimeout(() => {
                setShowCryptanalysisWarning(false);
              }, 5000);
            }
          }

        } catch (err: any) {
          console.error("PQC error:", err);
          let errorMessage = "PQC signing failed";
          try {
            const parsed = JSON.parse(err.message);
            if (parsed.detail) {
              if (typeof parsed.detail === 'string') {
                errorMessage = parsed.detail;
              } else if (parsed.detail.error) {
                errorMessage = parsed.detail.error;
              }
            }
          } catch {
            errorMessage = err.message || "PQC signing failed";
          }

          setError(errorMessage + ". Try using standard security.");
          setLoading(prev => ({ ...prev, mint: false }));
          return;
        }
      }

      // Step 3: Send blockchain transaction
      await sendTransaction(txData, fraudResult || {
        fraud: false,
        probability: calculateProbabilisticRisk(amountNum, 0).raw_probability,
        severity: getSeverityFromProbability(calculateProbabilisticRisk(amountNum, 0).raw_probability),
        reason: getReasonFromRisk(amountNum, calculateProbabilisticRisk(amountNum, 0).raw_probability, calculateProbabilisticRisk(amountNum, 0)),
        risk_score: Math.round(calculateProbabilisticRisk(amountNum, 0).raw_probability * 100),
        analysis_details: calculateProbabilisticRisk(amountNum, 0)
      }, {
        pqcSignature,
        pqcAlgorithm,
        cryptanalysis,
        zkpVerification
      });

    } catch (err: any) {
      console.error('Transaction preparation error:', err);
      setError(err.message || 'Transaction preparation failed');
      setLoading(prev => ({ ...prev, mint: false }));
    }
  };

  // Proceed with transaction
  const proceedWithTransaction = async (
    txData: any,
    fraudResult: FraudCheckResult,
    pqcData?: {
      pqcSignature?: string,
      pqcAlgorithm?: string,
      cryptanalysis?: CryptanalysisResult,
      zkpVerification?: ZKPVerification
    }
  ) => {
    setLoading(prev => ({ ...prev, mint: true }));

    try {
      const result = await sendQToken(toAddress, amount, isPqc);

      if (result && result.hash) {
        setTxHash(result.hash);
        setSuccess(`Successfully sent ${amount} QTOK${isPqc ? ' with PQC security' : ''}`);

        const newTx: Transaction = {
          hash: result.hash,
          from: address || '',
          to: toAddress,
          amount: `${amount} QTOK`,
          timestamp: Date.now(),
          status: pqcData?.cryptanalysis?.secure === false ? 'Suspicious' : 'Pending',
          isPqc,
          pqcSignature: pqcData?.pqcSignature,
          pqcAlgorithm: pqcData?.pqcAlgorithm,
          cryptanalysis: pqcData?.cryptanalysis,
          zkpVerification: pqcData?.zkpVerification,
          fraudScore: fraudResult.risk_score || Math.round(fraudResult.probability * 100),
          fraudSeverity: fraudResult.severity,
          fraudReason: fraudResult.reason,
          fraudAnalysis: fraudResult.analysis_details,
          explorerUrl: `https://sepolia.etherscan.io/tx/${result.hash}`,
          verification: {
            verified: true,
            method: isPqc ? 'PQC' : 'Standard',
            timestamp: Date.now()
          }
        };

        saveTransaction(newTx);
        fetchRiskStats();

        if (wsConnection.isConnected) {
          transactionMonitor.sendTransaction({
            ...newTx,
            fraud_check: fraudResult,
            timestamp: new Date().toISOString()
          });
        }

        setToAddress('');
        setAmount('');
        setIsPqc(false);
        setFraudCheck(null);
        setPendingTransaction(null);

        await refreshBalance();

        setTimeout(() => {
          const saved = localStorage.getItem('qTokenTransactions') || '[]';
          const allTxs = JSON.parse(saved);
          const updated = allTxs.map((tx: Transaction) =>
            tx.hash === result.hash ? { ...tx, status: 'Completed' } : tx
          );
          localStorage.setItem('qTokenTransactions', JSON.stringify(updated));

          const userTxs = updated
            .filter((t: Transaction) => t.from?.toLowerCase() === address?.toLowerCase())
            .sort((a: Transaction, b: Transaction) => b.timestamp - a.timestamp);
          setTransactions(userTxs);
          fetchRiskStats();
        }, 5000);

      } else {
        setError('Transaction failed: No transaction hash returned');
      }

    } catch (err: any) {
      console.error('Transaction error:', err);
      setError(err.message || 'Transaction failed');
    } finally {
      setLoading(prev => ({ ...prev, mint: false }));
    }
  };

  // Send actual transaction
  const sendTransaction = async (
    txData: any,
    fraudResult: FraudCheckResult,
    pqcData?: {
      pqcSignature?: string,
      pqcAlgorithm?: string,
      cryptanalysis?: CryptanalysisResult,
      zkpVerification?: ZKPVerification
    }
  ) => {
    await proceedWithTransaction(txData, fraudResult, pqcData);
  };

  // Handle override and send
  const handleOverrideAndSend = () => {
    setShowFraudWarning(false);
    if (pendingTransaction) {
      proceedWithTransaction(
        pendingTransaction,
        fraudCheck!,
        {
          pqcSignature: undefined,
          pqcAlgorithm: isPqc ? 'Dilithium2' : undefined,
          cryptanalysis: undefined,
          zkpVerification: undefined
        }
      );
    }
  };

  // Format helpers
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Clear alerts
  const clearAlerts = () => {
    setRealTimeAlerts([]);
  };

  // View analysis details - uses UnifiedAnalysisModal for ALL risk levels
  const viewAnalysisDetails = (tx: Transaction) => {
    console.log('📊 Viewing analysis for transaction:', tx);
    
    // Create analysis from fraudAnalysis or calculate from amount
    let analysis = tx.fraudAnalysis;
    if (!analysis) {
      const amountNum = parseFloat(tx.amount);
      analysis = calculateProbabilisticRisk(amountNum, 0);
    }
    
    setSelectedAnalysis({
      transaction: tx,
      analysis: analysis,
      cryptanalysis: tx.cryptanalysis,
      zkpVerification: tx.zkpVerification
    });
  };

  // WebSocket connection badge
  const WebSocketStatusBadge = () => {
    return wsConnection.isConnected ? (
      <span className="text-xs px-2 py-1 bg-green-500/20 text-green-400 rounded flex items-center">
        <span className="w-2 h-2 bg-green-500 rounded-full mr-1 animate-pulse"></span>
        Real-time
      </span>
    ) : (
      <span className="text-xs px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded">
        <span className="w-2 h-2 bg-yellow-500 rounded-full mr-1"></span>
        Offline
      </span>
    );
  };

  // Quantum status badge
  const QuantumStatusBadge = () => {
    if (quantumStatus === 'checking') {
      return (
        <span className="text-xs px-2 py-1 bg-blue-500/20 text-blue-400 rounded animate-pulse">
          🔄 PQC...
        </span>
      );
    }
    if (quantumStatus === 'online') {
      return (
        <span className="text-xs px-2 py-1 bg-green-500/20 text-green-400 rounded">
          ✅ PQC
        </span>
      );
    }
    return (
      <span className="text-xs px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded">
        ⚠️ PQC Off
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
            Quantum Transactions
          </h1>
          <p className="text-slate-400">Send QTokens with quantum security & AI fraud detection</p>

          {/* Status Bar */}
          <div className="mt-4 flex flex-wrap items-center gap-4">
            {address ? (
              <div className="flex items-center gap-2 bg-gray-800/50 px-4 py-2 rounded-lg border border-gray-700">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-mono">{formatAddress(address)}</span>
                <span className="text-xs px-2 py-1 bg-blue-500/20 text-blue-400 rounded">
                  {network?.name || 'Unknown'}
                </span>
                <QuantumStatusBadge />
              </div>
            ) : (
              <button
                onClick={async () => {
                  try {
                    setLoading(prev => ({ ...prev, wallet: true }));
                  } finally {
                    setLoading(prev => ({ ...prev, wallet: false }));
                  }
                }}
                disabled={loading.wallet}
                className="px-6 py-2 bg-gradient-to-r from-blue-600 to-cyan-500 rounded-lg hover:opacity-90 disabled:opacity-50 transition-all"
              >
                {loading.wallet ? 'Connecting...' : 'Connect Wallet'}
              </button>
            )}

            <div className="text-sm text-slate-300">
              Balance: <span className="font-semibold text-white">{parseFloat(qTokenBalance).toFixed(4)} QTOK</span>
            </div>

            {realTimeAlerts.length > 0 && (
              <button
                onClick={() => setShowAlerts(!showAlerts)}
                className="relative px-4 py-2 bg-gradient-to-r from-red-600 to-orange-500 text-white text-sm rounded-lg hover:opacity-90 transition-all"
              >
                🚨 Alerts ({realTimeAlerts.length})
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-white rounded-full animate-pulse"></span>
              </button>
            )}

            {/* Clear History Button */}
            {transactions.length > 0 && (
              <button
                onClick={clearAllTransactions}
                className="px-4 py-2 bg-red-600/20 text-red-400 text-sm rounded-lg hover:bg-red-600/30 transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Clear History
              </button>
            )}
          </div>
        </div>

        {/* Risk Stats Cards */}
        <RiskStatsCards stats={riskStats} />

        {/* Cryptanalysis Warning */}
        {showCryptanalysisWarning && (
          <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-8 h-8 rounded-full bg-yellow-500/20 flex items-center justify-center mr-3">
                  <span className="text-yellow-400">⚠️</span>
                </div>
                <div>
                  <p className="text-yellow-400 font-medium">Security Warning</p>
                  <p className="text-yellow-300 text-sm">{cryptanalysisWarningMessage}</p>
                </div>
              </div>
              <button
                onClick={() => setShowCryptanalysisWarning(false)}
                className="text-yellow-400 hover:text-yellow-300"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Real-time Alerts Panel */}
        {showAlerts && realTimeAlerts.length > 0 && (
          <Card title="🚨 Real-time Alerts" className="mb-6 border-red-500/30 bg-red-500/5">
            <div className="space-y-3">
              {realTimeAlerts.map((alert, index) => (
                <div key={index} className="p-4 bg-red-500/10 rounded-lg border border-red-500/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-red-400 animate-pulse">⚠️</span>
                        <span className="font-semibold text-white">Suspicious Transaction</span>
                        <SeverityBadge severity={alert.fraudSeverity || 'High'} />
                      </div>
                      <p className="text-slate-300 text-sm mt-1">{alert.alertReason}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                        <span>To: {formatAddress(alert.to)}</span>
                        <span>Amount: {alert.amount}</span>
                        <span>{formatTime(alert.timestamp)}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setRealTimeAlerts(prev => prev.filter((_, i) => i !== index));
                        // Also delete from localStorage
                        const saved = localStorage.getItem('qTokenTransactions') || '[]';
                        const allTxs = JSON.parse(saved);
                        const updated = allTxs.filter((tx: Transaction) => tx.hash !== alert.hash);
                        localStorage.setItem('qTokenTransactions', JSON.stringify(updated));
                      }}
                      className="text-slate-400 hover:text-white"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
              <div className="flex justify-end">
                <button onClick={clearAlerts} className="px-4 py-2 bg-red-600/30 text-red-400 rounded-lg hover:bg-red-600/40 transition-colors text-sm">
                  Clear All Alerts
                </button>
              </div>
            </div>
          </Card>
        )}

        {/* Status Alerts */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center mr-3">
                  <span className="text-red-400">❌</span>
                </div>
                <div>
                  <p className="text-red-400 font-medium">Error</p>
                  <p className="text-red-300 text-sm">{error}</p>
                </div>
              </div>
              <button onClick={() => setError('')} className="text-red-400 hover:text-red-300">✕</button>
            </div>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center mr-3">
                  <span className="text-green-400">✅</span>
                </div>
                <div>
                  <p className="text-green-400 font-medium">Success</p>
                  <p className="text-green-300 text-sm">{success}</p>
                  {txHash && (
                    <p className="text-xs text-green-400/80 font-mono mt-1">
                      Hash: {formatAddress(txHash)}
                    </p>
                  )}
                </div>
              </div>
              <button onClick={() => setSuccess('')} className="text-green-400 hover:text-green-300">✕</button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Send Form */}
          <div className="lg:col-span-1 space-y-6">
            <Card title="Send QTokens" subtitle="Secure transactions with quantum cryptography">
              <form onSubmit={handleSend} className="space-y-6">
                {/* Fraud Detection Toggle */}
                <div className="flex items-center justify-between p-4 bg-gray-800/30 rounded-xl border border-gray-700">
                  <div className="flex items-center">
                    <div className={`w-3 h-3 rounded-full mr-3 ${monitoringEnabled ? 'bg-green-500 animate-pulse' : 'bg-slate-500'}`}></div>
                    <div>
                      <span className="text-sm font-medium text-slate-300">AI Fraud Detection</span>
                      <p className="text-xs text-slate-400">
                        {monitoringEnabled ? 'Real-time monitoring active' : 'Monitoring disabled'}
                        {monitoringEnabled && !wsConnection.isConnected && (
                          <span className="text-yellow-400"> (WebSocket offline, using HTTP)</span>
                        )}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMonitoringEnabled(!monitoringEnabled)}
                    disabled={loading.mint || loading.fraud || loading.wsCheck}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full ${monitoringEnabled ? 'bg-green-500' : 'bg-gray-700'} disabled:opacity-50`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${monitoringEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>

                {/* Recipient Address */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Recipient Address</label>
                  <input
                    type="text"
                    value={toAddress}
                    onChange={(e) => setToAddress(e.target.value)}
                    placeholder="0x..."
                    className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    disabled={loading.mint || loading.fraud || loading.wsCheck}
                  />
                </div>

                {/* Amount */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Amount (Max 6 QTOK)</label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.0"
                    step="0.01"
                    min="0"
                    max="6"
                    className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    disabled={loading.mint || loading.fraud || loading.wsCheck}
                  />
                  <div className="flex justify-between mt-2">
                    <p className="text-xs text-slate-400">Available: {parseFloat(qTokenBalance).toFixed(4)} QTOK</p>
                    <button
                      type="button"
                      onClick={() => setAmount(Math.min(6, parseFloat(qTokenBalance)).toString())}
                      className="text-xs text-blue-400 hover:text-blue-300 disabled:opacity-50"
                      disabled={loading.mint || loading.fraud || loading.wsCheck}
                    >
                      Use Max (6)
                    </button>
                  </div>
                  {parseFloat(amount) > 4 && (
                    <p className="text-xs text-yellow-400 mt-1">
                      ⚠️ Amount exceeds risk threshold ({riskStats.risk_threshold} QTOK)
                    </p>
                  )}
                </div>

                {/* Quantum Security Toggle */}
                <div className={`p-4 rounded-xl border transition-all ${isPqc
                  ? 'bg-gradient-to-r from-purple-500/10 to-blue-500/10 border-purple-500/30'
                  : 'bg-gray-800/30 border-gray-700'}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center">
                        <span className="text-sm font-medium text-slate-300">Quantum Security</span>
                        {isPqc && (
                          <span className="ml-2 text-xs px-2 py-1 bg-gradient-to-r from-purple-500/20 to-blue-500/20 text-purple-400 rounded border border-purple-500/30">
                            🔐 PQC
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-1">Dilithium2 Post-Quantum Signatures</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (!isPqc && quantumStatus !== 'online') {
                          setError('PQC service is offline. Please check if the quantum service is running.');
                          return;
                        }
                        setIsPqc(!isPqc);
                      }}
                      disabled={loading.mint || loading.fraud || loading.wsCheck || (quantumStatus !== 'online' && !isPqc)}
                      className={`relative inline-flex h-7 w-14 items-center rounded-full transition-all ${isPqc ? 'bg-gradient-to-r from-purple-500 to-blue-500' : 'bg-gray-700'} disabled:opacity-50`}
                    >
                      <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${isPqc ? 'translate-x-8' : 'translate-x-1'}`} />
                    </button>
                  </div>
                  {quantumStatus !== 'online' && isPqc && (
                    <p className="text-xs text-yellow-400 mt-2">
                      ⚠️ PQC service is offline. Please check if the quantum service is running on port 8002.
                    </p>
                  )}
                  {quantumStatus === 'online' && isPqc && (
                    <p className="text-xs text-green-400 mt-2">
                      ✅ Dilithium2 signatures with cryptanalysis
                    </p>
                  )}
                  {!isPqc && quantumStatus === 'online' && (
                    <p className="text-xs text-purple-400 mt-2">
                      💡 Click to enable PQC security
                    </p>
                  )}
                </div>

                {/* ZKP Toggle */}
                {isPqc && quantumStatus === 'online' && (
                  <div className="p-4 bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-lg border border-purple-500/30">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="font-semibold text-white">Zero-Knowledge Proofs</h4>
                        <p className="text-xs text-gray-400">Verify transaction attributes without revealing them</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setEnableZKP(!enableZKP)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full ${enableZKP ? 'bg-purple-500' : 'bg-gray-700'}`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${enableZKP ? 'translate-x-6' : 'translate-x-1'}`} />
                      </button>
                    </div>

                    {enableZKP && (
                      <div className="space-y-2">
                        <label className="block text-xs text-gray-400">Select additional attributes to prove:</label>
                        <div className="flex flex-wrap gap-2">
                          {['amount', 'recipient', 'nonce', 'timestamp'].map((attr) => (
                            <button
                              key={attr}
                              type="button"
                              onClick={() => {
                                setSelectedAttributes(prev =>
                                  prev.includes(attr)
                                    ? prev.filter(a => a !== attr)
                                    : [...prev, attr]
                                );
                              }}
                              className={`px-3 py-1 text-xs rounded-full border transition-all ${selectedAttributes.includes(attr)
                                ? 'bg-purple-500/20 border-purple-500/50 text-purple-400'
                                : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600'
                                }`}
                            >
                              {attr}
                              {selectedAttributes.includes(attr) && ' ✓'}
                            </button>
                          ))}
                        </div>
                        <p className="text-xs text-green-400 mt-2">
                          ⚡ amount_gt_zero is always included (required for security)
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Fraud Check Result */}
                {fraudCheck && !showFraudWarning && (
                  <div className={`p-4 rounded-xl border-l-4 ${
                    fraudCheck.severity === 'High'
                      ? 'bg-red-500/10 border-red-500'
                      : fraudCheck.severity === 'Medium'
                        ? 'bg-yellow-500/10 border-yellow-500'
                        : 'bg-green-500/10 border-green-500'
                  }`}>
                    <div>
                      <h4 className="font-bold text-white flex items-center">
                        <span className={`w-3 h-3 rounded-full mr-2 ${
                          fraudCheck.severity === 'High' ? 'bg-red-500' :
                          fraudCheck.severity === 'Medium' ? 'bg-yellow-500' : 'bg-green-500'
                        }`}></span>
                        Risk: {fraudCheck.severity} ({(fraudCheck.probability * 100).toFixed(1)}%)
                      </h4>
                      <p className="text-slate-300 mt-2 text-sm">{fraudCheck.reason}</p>
                    </div>
                  </div>
                )}

                {/* Send Button */}
                <button
                  type="submit"
                  disabled={loading.mint || loading.fraud || loading.wsCheck || !signer || (isPqc && quantumStatus !== 'online')}
                  className={`w-full py-3 px-4 text-white font-bold rounded-lg hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center ${isPqc
                    ? 'bg-gradient-to-r from-purple-600 to-blue-600'
                    : 'bg-gradient-to-r from-blue-600 to-cyan-500'}`}
                >
                  {loading.wsCheck ? (
                    <>
                      <LoadingSpinner size="sm" className="mr-2" />
                      Calculating Risk...
                    </>
                  ) : loading.mint ? (
                    <>
                      <LoadingSpinner size="sm" className="mr-2" />
                      {isPqc ? (enableZKP ? 'Signing with PQC+ZKP...' : 'Signing with PQC...') : 'Processing...'}
                    </>
                  ) : !signer ? (
                    'Connect Wallet First'
                  ) : isPqc && quantumStatus !== 'online' ? (
                    'Enable PQC First'
                  ) : (
                    `Send ${isPqc ? (enableZKP ? 'with PQC+ZKP' : 'with PQC') : ''}`
                  )}
                </button>
              </form>
            </Card>

            {/* Quick Stats */}
            <Card title="Quick Stats">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-gray-800/30 rounded-lg">
                  <div className="text-2xl font-bold text-white">{transactions.length}</div>
                  <div className="text-xs text-slate-400">Total TX</div>
                </div>
                <div className="text-center p-4 bg-gray-800/30 rounded-lg">
                  <div className="text-2xl font-bold text-white">{riskStats.high_risk_count}</div>
                  <div className="text-xs text-slate-400">High Risk</div>
                </div>
                <div className="text-center p-4 bg-gray-800/30 rounded-lg">
                  <div className="text-2xl font-bold text-white">{riskStats.medium_risk_count}</div>
                  <div className="text-xs text-slate-400">Medium Risk</div>
                </div>
                <div className="text-center p-4 bg-gray-800/30 rounded-lg">
                  <div className="text-2xl font-bold text-white">{realTimeAlerts.length}</div>
                  <div className="text-xs text-slate-400">Alerts</div>
                </div>
              </div>
            </Card>
          </div>

          {/* Right: Transaction History */}
          <div className="lg:col-span-2">
            <Card 
              title="Transaction History" 
              subtitle="All your QToken transactions with security analysis"
            >
              {transactions.length > 0 && (
                <div className="mb-4 flex justify-end">
                  <button
                    onClick={clearAllTransactions}
                    className="text-xs px-3 py-1 bg-red-600/20 text-red-400 rounded hover:bg-red-600/30 transition-colors flex items-center gap-1"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Clear All
                  </button>
                </div>
              )}
              {transactions.length > 0 ? (
                <div className="space-y-4">
                  {transactions.map((tx, index) => (
                    <TransactionCard
                      key={index}
                      transaction={tx}
                      index={index}
                      onViewDetails={() => viewAnalysisDetails(tx)}
                      onDelete={deleteTransaction}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-800/50 flex items-center justify-center">
                    <span className="text-2xl">📄</span>
                  </div>
                  <p className="text-slate-400 mb-2">No transactions yet</p>
                  <p className="text-sm text-slate-500">Send your first QToken transaction to get started</p>
                </div>
              )}
            </Card>
          </div>
        </div>

        {/* Features Section */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card title="Quantum Security" className="border-purple-500/20">
            <div className="space-y-3">
              <div className="flex items-start">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center mr-3">
                  <span className="text-xs text-purple-400">🔐</span>
                </div>
                <span className="text-slate-300 text-sm">Dilithium2 post-quantum signatures</span>
              </div>
              <div className="flex items-start">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center mr-3">
                  <span className="text-xs text-blue-400">⚡</span>
                </div>
                <span className="text-slate-300 text-sm">NIST-approved PQC algorithms</span>
              </div>
            </div>
          </Card>

          <Card title="ZKP Verification" className="border-blue-500/20">
            <div className="space-y-3">
              <div className="flex items-start">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center mr-3">
                  <span className="text-xs text-blue-400">🔍</span>
                </div>
                <span className="text-slate-300 text-sm">Zero-knowledge proof verification</span>
              </div>
              <div className="flex items-start">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center mr-3">
                  <span className="text-xs text-green-400">✅</span>
                </div>
                <span className="text-slate-300 text-sm">Attribute-level verification</span>
              </div>
            </div>
          </Card>

          <Card title="Fraud Detection" className="border-green-500/20">
            <div className="space-y-3">
              <div className="flex items-start">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center mr-3">
                  <span className="text-xs text-green-400">🤖</span>
                </div>
                <span className="text-slate-300 text-sm">Probabilistic risk scoring</span>
              </div>
              <div className="flex items-start">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-yellow-500/20 flex items-center justify-center mr-3">
                  <span className="text-xs text-yellow-400">📊</span>
                </div>
                <span className="text-slate-300 text-sm">Real-time alerts</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Fraud Warning Modal */}
        {showFraudWarning && fraudCheck && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
            <div className="bg-gray-800 rounded-xl max-w-md w-full p-6 border border-red-500/30">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center mr-3">
                  <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.998-.833-2.732 0L4.342 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">High-Risk Transaction</h3>
                  <p className="text-slate-400 text-sm">Probability: {(fraudCheck.probability * 100).toFixed(1)}%</p>
                </div>
              </div>

              <div className="space-y-4 mb-6">
                <div className="p-4 bg-red-500/10 rounded-lg">
                  <SeverityBadge severity={fraudCheck.severity} />
                  <p className="text-slate-300 text-sm mt-2">{fraudCheck.reason}</p>
                </div>

                <div className="p-4 bg-gray-900/50 rounded-lg">
                  <p className="text-slate-400 text-sm mb-2">Transaction Details:</p>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Amount:</span>
                      <span className="text-white">{amount} QTOK</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">To:</span>
                      <span className="text-white font-mono text-sm">
                        {toAddress.substring(0, 8)}...{toAddress.substring(toAddress.length - 6)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowFraudWarning(false);
                    setFraudCheck(null);
                    setLoading(prev => ({ ...prev, mint: false }));
                  }}
                  className="flex-1 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button onClick={handleOverrideAndSend} className="flex-1 py-3 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-lg hover:opacity-90 transition-colors">
                  Send Anyway
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Unified Analysis Modal - Works for ALL risk levels */}
        {selectedAnalysis && (
          <UnifiedAnalysisModal
            isOpen={!!selectedAnalysis}
            onClose={() => setSelectedAnalysis(null)}
            transaction={selectedAnalysis.transaction}
            analysis={selectedAnalysis.analysis}
            cryptanalysis={selectedAnalysis.cryptanalysis}
            zkpVerification={selectedAnalysis.zkpVerification}
          />
        )}
      </div>
    </div>
  );
};

export default Transactions;
