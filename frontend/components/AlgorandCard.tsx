import React, { useState } from 'react';
import { useAlgorandWallet } from '../hooks/useAlgorandWallet';
import { useAlgorandData } from '../hooks/useAlgorandData';
import { algorandService } from '../services/algorandService';
import LoadingSpinner from './LoadingSpinner';

interface AlgorandCardProps {
  collapsed?: boolean;
  onViewAll?: () => void;
}

const AlgorandCard: React.FC<AlgorandCardProps> = ({ collapsed = false, onViewAll }) => {
  const { account, isConnected, connectWallet, disconnectWallet } = useAlgorandWallet();
  const { algoBalance, assets, transactions, loading, refreshAll } = useAlgorandData();
  const [isExpanded, setIsExpanded] = useState(!collapsed);
  const [sending, setSending] = useState(false);

  const formatAddress = (addr: string) => {
    if (!addr) return '';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'pay': return '💸';
      case 'acfg': return '🎨';
      case 'axfer': return '🔄';
      default: return '📝';
    }
  };

  const handleSendAlgo = async () => {
    if (!account) return;
    
    const receiver = prompt('Enter receiver address:');
    if (!receiver) return;
    
    const amountStr = prompt('Enter amount (ALGO):', '1');
    if (!amountStr) return;
    
    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0) return;
    
    try {
      setSending(true);
      
      const params = await algorandService.getSuggestedParams();
      const txn = await algorandService.createPaymentTransaction(account, receiver, amount);
      const signed = await (await import('../services/algorandWallet')).algorandWallet.signTransaction(txn);
      const response = await algorandService.sendTransaction(signed);
      
      alert(`Transaction sent! ID: ${response.txId}`);
      refreshAll();
    } catch (error: any) {
      console.error('Send failed:', error);
      alert(`Failed: ${error.message}`);
    } finally {
      setSending(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="bg-gradient-to-br from-green-900/30 to-emerald-900/30 rounded-xl p-6 border border-green-500/30">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-white flex items-center">
            <span className="mr-2">🟢</span> Algorand Wallet
          </h3>
        </div>
        <button
          onClick={connectWallet}
          className="w-full py-3 bg-gradient-to-r from-green-600 to-emerald-500 text-white rounded-lg hover:opacity-90 transition-all"
        >
          Connect Pera Wallet
        </button>
        <p className="text-xs text-gray-400 mt-3 text-center">
          Connect to manage your Algorand assets
        </p>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-green-900/20 to-emerald-900/20 rounded-xl p-6 border border-green-500/30">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center mr-3">
            <span className="text-green-400 text-xl">🟢</span>
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Algorand</h3>
            <p className="text-xs text-gray-400 font-mono">{formatAddress(account)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={refreshAll}
            disabled={loading}
            className="p-2 hover:bg-green-500/20 rounded-lg transition-colors"
            title="Refresh"
          >
            <svg className={`w-4 h-4 text-green-400 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
          <button
            onClick={disconnectWallet}
            className="p-2 hover:bg-red-500/20 rounded-lg transition-colors"
            title="Disconnect"
          >
            <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 hover:bg-green-500/20 rounded-lg transition-colors"
          >
            <svg className={`w-4 h-4 text-green-400 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Balance */}
      <div className="mb-4 p-4 bg-green-500/10 rounded-lg border border-green-500/20">
        <div className="text-xs text-gray-400 mb-1">Balance</div>
        <div className="text-2xl font-bold text-white">
          {algoBalance !== null ? `${algoBalance.toFixed(4)} ALGO` : '...'}
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="space-y-4">
          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleSendAlgo}
              disabled={sending}
              className="p-3 bg-green-600/20 hover:bg-green-600/30 rounded-lg border border-green-500/30 transition-colors text-center"
            >
              <div className="text-lg mb-1">💸</div>
              <div className="text-xs text-green-400">Send ALGO</div>
            </button>
            <button
              onClick={() => window.open(`https://lora.algokit.io/testnet/address/${account}`, '_blank')}
              className="p-3 bg-blue-600/20 hover:bg-blue-600/30 rounded-lg border border-blue-500/30 transition-colors text-center"
            >
              <div className="text-lg mb-1">🔍</div>
              <div className="text-xs text-blue-400">Explorer</div>
            </button>
          </div>

          {/* Assets */}
          {assets.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-white mb-2">Assets ({assets.length})</h4>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {assets.map((asset) => (
                  <div key={asset['asset-id']} className="flex justify-between items-center p-2 bg-gray-800/50 rounded-lg">
                    <span className="text-xs font-mono text-purple-400">#{asset['asset-id']}</span>
                    <span className="text-xs text-white">{asset.amount}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Transactions */}
          {transactions.length > 0 && (
            <div>
              <div className="flex justify-between items-center mb-2">
                <h4 className="text-sm font-semibold text-white">Recent Transactions</h4>
                {onViewAll && (
                  <button onClick={onViewAll} className="text-xs text-green-400 hover:underline">
                    View All →
                  </button>
                )}
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {transactions.slice(0, 5).map((tx) => (
                  <div key={tx.id} className="p-2 bg-gray-800/30 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <span className="text-lg mr-2">{getTransactionIcon(tx.type)}</span>
                        <div>
                          <div className="text-xs text-gray-300">
                            {tx.type === 'pay' && `${tx.amount.toFixed(3)} ALGO`}
                            {tx.type === 'acfg' && `NFT Created: #${tx.assetId}`}
                            {tx.type === 'axfer' && `Transferred ${tx.amount} units`}
                          </div>
                          <div className="text-xs text-gray-500">
                            {formatTime(tx.timestamp)}
                          </div>
                        </div>
                      </div>
                      <a
                        href={`https://lora.algokit.io/testnet/transaction/${tx.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-400 hover:underline"
                      >
                        View
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Network Info */}
          <div className="text-xs text-gray-500 border-t border-green-500/20 pt-3">
            <div className="flex justify-between">
              <span>Network:</span>
              <span className="text-green-400">TestNet</span>
            </div>
            <div className="flex justify-between mt-1">
              <span>Node:</span>
              <span className="text-white">algonode.cloud</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AlgorandCard;
