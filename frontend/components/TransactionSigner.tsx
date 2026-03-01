// components/TransactionSigner.tsx
import React, { useState } from 'react';
import { quantumZKP } from '../services/quantumZKPService';
import { CryptanalysisDashboard } from './CryptanalysisDashboard';
import { ZKPAttributeVerifier } from './ZKPAttributeVerifier';
import { PqcSignature } from '../types/quantum.types';

interface TransactionSignerProps {
  walletId: string;
  onSigned?: (signature: PqcSignature) => void;
  onError?: (error: Error) => void;
}

export const TransactionSigner: React.FC<TransactionSignerProps> = ({
  walletId,
  onSigned,
  onError
}) => {
  const [amount, setAmount] = useState('');
  const [recipient, setRecipient] = useState('');
  const [algorithm, setAlgorithm] = useState<'pqc' | 'ecdsa'>('pqc');
  const [enableZKP, setEnableZKP] = useState(true);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PqcSignature | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedAttributes, setSelectedAttributes] = useState<string[]>([
    'amount', 'recipient', 'nonce'
  ]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const amountNum = parseFloat(amount);
      if (isNaN(amountNum) || amountNum <= 0) {
        throw new Error('Invalid amount');
      }

      const signature = await quantumZKP.signWithZKP({
        wallet_id: walletId,
        transaction: {
          amount: amountNum,
          to: recipient,
          nonce: Date.now(),
          timestamp: new Date().toISOString()
        },
        algorithm,
        zkp: enableZKP ? {
          enable: true,
          attributes: selectedAttributes,
          circuit_type: 'merkle'
        } : undefined
      });

      setResult(signature);
      onSigned?.(signature);
    } catch (err: any) {
      setError(err.message);
      onError?.(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Amount Input */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Amount (QTOK)
          </label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            step="0.01"
            min="0"
            required
            className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-purple-500"
            disabled={loading}
          />
        </div>

        {/* Recipient Input */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Recipient Address
          </label>
          <input
            type="text"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            placeholder="0x..."
            required
            className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-purple-500 font-mono"
            disabled={loading}
          />
        </div>

        {/* Algorithm Selection */}
        <div className="grid grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => setAlgorithm('pqc')}
            className={`p-3 rounded-lg border transition-all ${
              algorithm === 'pqc'
                ? 'border-purple-500 bg-purple-500/20 text-purple-400'
                : 'border-gray-700 hover:border-gray-600'
            }`}
            disabled={loading}
          >
            <div className="font-semibold">🔐 PQC</div>
            <div className="text-xs mt-1 opacity-70">Dilithium2</div>
          </button>

          <button
            type="button"
            onClick={() => setAlgorithm('ecdsa')}
            className={`p-3 rounded-lg border transition-all ${
              algorithm === 'ecdsa'
                ? 'border-blue-500 bg-blue-500/20 text-blue-400'
                : 'border-gray-700 hover:border-gray-600'
            }`}
            disabled={loading}
          >
            <div className="font-semibold">🔑 ECDSA</div>
            <div className="text-xs mt-1 opacity-70">SHA256</div>
          </button>
        </div>

        {/* ZKP Toggle */}
        <div className="p-4 bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-lg border border-purple-500/30">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h4 className="font-semibold text-white">Zero-Knowledge Proofs</h4>
              <p className="text-xs text-gray-400">Verify transaction attributes without revealing them</p>
            </div>
            <button
              type="button"
              onClick={() => setEnableZKP(!enableZKP)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full ${
                enableZKP ? 'bg-purple-500' : 'bg-gray-700'
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                enableZKP ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>

          {enableZKP && (
            <div className="space-y-2">
              <label className="block text-xs text-gray-400">Select attributes to prove:</label>
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
                    className={`px-3 py-1 text-xs rounded-full border transition-all ${
                      selectedAttributes.includes(attr)
                        ? 'bg-purple-500/20 border-purple-500/50 text-purple-400'
                        : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600'
                    }`}
                  >
                    {attr}
                    {selectedAttributes.includes(attr) && ' ✓'}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold rounded-lg hover:opacity-90 disabled:opacity-50 transition-all"
        >
          {loading ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Signing with ZKP...
            </span>
          ) : (
            `Sign Transaction (${algorithm.toUpperCase()})`
          )}
        </button>

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
            ❌ {error}
          </div>
        )}
      </form>

      {/* Results */}
      {result && (
        <div className="space-y-6 mt-8 pt-6 border-t border-gray-700">
          <h3 className="text-lg font-bold text-white">Signature Result</h3>
          
          <div className="p-4 bg-gray-800/30 rounded-lg border border-gray-700">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <div className="text-xs text-gray-400">Algorithm</div>
                <div className="text-sm font-mono text-purple-400">{result.algorithm}</div>
              </div>
              <div>
                <div className="text-xs text-gray-400">Transaction Hash</div>
                <div className="text-sm font-mono text-green-400">
                  {result.transaction_hash.substring(0, 16)}...
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-400">Signature</div>
                <div className="text-xs font-mono text-gray-300 break-all">
                  {result.signature.substring(0, 64)}...
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-400">Timestamp</div>
                <div className="text-sm">{new Date(result.timestamp).toLocaleString()}</div>
              </div>
            </div>

            {/* ZKP Verification */}
            {result.zkp_verification && (
              <div className="mt-4 p-4 bg-purple-500/10 rounded-lg">
                <h4 className="font-semibold text-purple-400 mb-3">ZKP Verification</h4>
                <ZKPAttributeVerifier attributes={result.zkp_verification.attributes} />
              </div>
            )}

            {/* Cryptanalysis Dashboard */}
            <div className="mt-4">
              <h4 className="font-semibold text-white mb-3">Security Analysis</h4>
              <CryptanalysisDashboard analysis={result.cryptanalysis} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};