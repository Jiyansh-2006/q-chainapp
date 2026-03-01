// pages/TestConnection.tsx
import React, { useState } from 'react';
import { useWallet } from '../hooks/useWallet';
import Card from '../components/Card';

const TestConnection: React.FC = () => {
    const { 
        address, 
        qTokenBalance, 
        nativeBalance,
        network, 
        isConnected,
        isLoading,
        error,
        connectWallet,
        disconnectWallet,
        refreshBalance,
        sendQToken,
        formatAddress
    } = useWallet();

    const [testToAddress, setTestToAddress] = useState('0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266');
    const [testAmount, setTestAmount] = useState('10');
    const [testResult, setTestResult] = useState<any>(null);
    const [testLoading, setTestLoading] = useState(false);

    const handleTestSend = async () => {
        try {
            setTestLoading(true);
            setTestResult('Sending...');
            const result = await sendQToken(testToAddress, testAmount, false);
            setTestResult(result);
            await refreshBalance();
        } catch (err: any) {
            setTestResult(`Error: ${err.message}`);
        } finally {
            setTestLoading(false);
        }
    };

    if (!isConnected) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <h2 className="text-2xl font-bold text-white mb-4">Wallet Not Connected</h2>
                <button
                    onClick={connectWallet}
                    className="px-6 py-3 bg-gradient-to-r from-brand-primary to-brand-secondary text-white rounded-lg"
                >
                    Connect Wallet
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-white">Connection Test</h1>
                <button
                    onClick={disconnectWallet}
                    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                >
                    Disconnect
                </button>
            </div>

            {/* Status Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card title="Wallet Status">
                    <div className="space-y-3">
                        <div className="flex justify-between items-center p-2 bg-dark-bg/50 rounded">
                            <span className="text-slate-400">Connected</span>
                            <span className={`font-bold ${isConnected ? 'text-green-400' : 'text-red-400'}`}>
                                {isConnected ? 'Yes ✅' : 'No ❌'}
                            </span>
                        </div>
                        <div className="flex justify-between items-center p-2 bg-dark-bg/50 rounded">
                            <span className="text-slate-400">Address</span>
                            <span className="font-mono text-sm text-white">
                                {formatAddress(address)}
                            </span>
                        </div>
                        <div className="flex justify-between items-center p-2 bg-dark-bg/50 rounded">
                            <span className="text-slate-400">Network</span>
                            <span className="font-bold text-white">
                                {network?.name || 'Unknown'}
                            </span>
                        </div>
                    </div>
                </Card>

                <Card title="QToken Balance">
                    <div className="text-center p-4">
                        <div className="text-4xl font-bold text-white mb-2">
                            {parseFloat(qTokenBalance).toFixed(4)}
                        </div>
                        <div className="text-xl text-brand-primary">QTOK</div>
                        <div className="mt-4 text-sm text-slate-400">
                            Available for transfers
                        </div>
                    </div>
                </Card>

                <Card title="ETH Balance">
                    <div className="text-center p-4">
                        <div className="text-4xl font-bold text-white mb-2">
                            {parseFloat(nativeBalance).toFixed(4)}
                        </div>
                        <div className="text-xl text-purple-400">ETH</div>
                        <div className="mt-4 text-sm text-slate-400">
                            For gas fees
                        </div>
                    </div>
                </Card>
            </div>

            {/* Test Transaction */}
            <Card title="Test QToken Transfer">
                <div className="space-y-4">
                    <div>
                        <label className="block text-slate-300 mb-2">Recipient Address</label>
                        <input
                            type="text"
                            value={testToAddress}
                            onChange={(e) => setTestToAddress(e.target.value)}
                            className="w-full p-3 bg-dark-bg border border-dark-border text-white rounded focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                            placeholder="0x..."
                        />
                        <p className="text-xs text-slate-400 mt-1">
                            Default: Hardhat test account #0
                        </p>
                    </div>
                    
                    <div>
                        <label className="block text-slate-300 mb-2">Amount (QTOK)</label>
                        <input
                            type="number"
                            value={testAmount}
                            onChange={(e) => setTestAmount(e.target.value)}
                            className="w-full p-3 bg-dark-bg border border-dark-border text-white rounded focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                            placeholder="10"
                        />
                    </div>
                    
                    <button
                        onClick={handleTestSend}
                        disabled={testLoading || isLoading}
                        className="w-full py-3 px-4 bg-gradient-to-r from-brand-primary to-brand-secondary text-white font-bold rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {testLoading ? 'Processing...' : 'Test Send QToken'}
                    </button>
                    
                    {testResult && (
                        <div className={`p-4 rounded border ${testResult.success ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
                            <p className={`font-mono text-sm ${testResult.success ? 'text-green-400' : 'text-red-400'}`}>
                                {typeof testResult === 'string' 
                                    ? testResult 
                                    : `✅ Success! Transaction hash: ${testResult.hash}`
                                }
                            </p>
                        </div>
                    )}
                </div>
            </Card>

            {/* Actions */}
            <Card title="Wallet Actions">
                <div className="flex gap-4">
                    <button
                        onClick={refreshBalance}
                        disabled={isLoading}
                        className="flex-1 py-3 px-4 bg-dark-card border border-dark-border text-white rounded hover:border-brand-primary transition-colors disabled:opacity-50"
                    >
                        Refresh Balance
                    </button>
                    <button
                        onClick={() => window.location.reload()}
                        className="flex-1 py-3 px-4 bg-dark-card border border-dark-border text-white rounded hover:border-brand-primary transition-colors"
                    >
                        Reload Page
                    </button>
                </div>
            </Card>

            {/* Error Display */}
            {error && (
                <Card title="Error">
                    <div className="p-4 bg-red-500/10 border border-red-500/20 rounded">
                        <p className="text-red-400">{error}</p>
                    </div>
                </Card>
            )}

            {/* Debug Info */}
            <Card title="Debug Information">
                <div className="space-y-2">
                    <div className="flex justify-between">
                        <span className="text-slate-400">Loading State:</span>
                        <span className="text-white">{isLoading ? 'true' : 'false'}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-400">Network Chain ID:</span>
                        <span className="text-white">{network?.chainId || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-400">Full Address:</span>
                        <span className="font-mono text-sm text-white break-all">{address}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-400">Contract Address:</span>
                        <span className="font-mono text-sm text-white">
                            0x5FbDB2315678afecb367f032d93F642f64180aa3
                        </span>
                    </div>
                </div>
            </Card>

            {/* Network Setup Guide */}
            <Card title="Setup Instructions">
                <div className="space-y-4">
                    <div className="p-3 bg-dark-bg/50 rounded">
                        <h4 className="font-bold text-white mb-2">1. Start Hardhat Node</h4>
                        <code className="block p-2 bg-black text-green-400 rounded text-sm">
                            npx hardhat node
                        </code>
                    </div>
                    <div className="p-3 bg-dark-bg/50 rounded">
                        <h4 className="font-bold text-white mb-2">2. Connect MetaMask</h4>
                        <ul className="text-slate-300 space-y-1">
                            <li>• Network: Localhost 8545</li>
                            <li>• Chain ID: 31337</li>
                            <li>• Currency: ETH</li>
                        </ul>
                    </div>
                    <div className="p-3 bg-dark-bg/50 rounded">
                        <h4 className="font-bold text-white mb-2">3. Import Test Account</h4>
                        <p className="text-slate-300">
                            Private Key: <code className="bg-black px-2 py-1 rounded text-xs">0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80</code>
                        </p>
                    </div>
                </div>
            </Card>
        </div>
    );
};

export default TestConnection;