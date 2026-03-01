// pages/TestTransactions.tsx
import React, { useState, useEffect } from 'react';
import { useWallet } from '../hooks/useWallet';
import Card from '../components/Card';
import LoadingSpinner from '../components/LoadingSpinner';

const TestTransactions: React.FC = () => {
    const { 
        address, 
        qTokenBalance, 
        nativeBalance,
        sendQToken, 
        refreshBalance,
        getAllTestAccountBalances,
        formatAddress 
    } = useWallet();
    
    const [selectedToAccount, setSelectedToAccount] = useState(TEST_ACCOUNTS[1].address);
    const [amount, setAmount] = useState('');
    const [isPqc, setIsPqc] = useState(false);
    const [loading, setLoading] = useState(false);
    const [txHash, setTxHash] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [testAccountBalances, setTestAccountBalances] = useState<any[]>([]);
    const [refreshingBalances, setRefreshingBalances] = useState(false);
    
    // Load all test account balances
    const loadTestAccountBalances = async () => {
        setRefreshingBalances(true);
        try {
            const balances = await getAllTestAccountBalances();
            setTestAccountBalances(balances);
        } catch (err) {
            console.error('Error loading test account balances:', err);
        } finally {
            setRefreshingBalances(false);
        }
    };

    useEffect(() => {
        if (address) {
            loadTestAccountBalances();
        }
    }, [address]);

    // Handle send transaction
    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setTxHash('');

        if (!selectedToAccount) {
            setError('Please select a recipient account');
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

        // Check balance (you can adjust this logic)
        const balanceNum = parseFloat(qTokenBalance);
        if (amountNum > balanceNum) {
            setError(`Insufficient balance. You have ${qTokenBalance} QTOK`);
            return;
        }

        setLoading(true);

        try {
            console.log(`Sending ${amount} QTOK to ${selectedToAccount}...`);
            
            const result = await sendQToken(selectedToAccount, amount, isPqc);
            
            if (result && result.hash) {
                setTxHash(result.hash);
                setSuccess(`✅ Successfully sent ${amount} QTOK to Account ${TEST_ACCOUNTS.find(acc => acc.address === selectedToAccount)?.name}`);
                
                // Clear form
                setAmount('');
                setIsPqc(false);
                
                // Refresh all balances
                await refreshBalance();
                await loadTestAccountBalances();
                
            } else {
                setError('Transaction failed: No transaction hash returned');
            }
            
        } catch (err: any) {
            console.error('Transaction error:', err);
            setError(err.message || 'Transaction failed');
        } finally {
            setLoading(false);
        }
    };

    // Quick send buttons
    const quickSendAmounts = [10, 50, 100, 500, 1000];
    
    const handleQuickSend = async (amount: number) => {
        setAmount(amount.toString());
        // Auto-select a different account for variety
        const otherAccounts = TEST_ACCOUNTS.filter(acc => 
            acc.address.toLowerCase() !== address?.toLowerCase()
        );
        const randomAccount = otherAccounts[Math.floor(Math.random() * otherAccounts.length)];
        setSelectedToAccount(randomAccount.address);
        
        // You can auto-submit or just fill the form
    };

    // Get account name by address
    const getAccountName = (addr: string) => {
        const account = TEST_ACCOUNTS.find(acc => 
            acc.address.toLowerCase() === addr.toLowerCase()
        );
        return account ? account.name : 'Unknown Account';
    };

    // Format balance
    const formatNumber = (num: string) => {
        const n = parseFloat(num);
        return n.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 4
        });
    };

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-white">Test Transactions</h1>
                <div className="text-sm text-slate-400">
                    {address ? `Connected: ${formatAddress(address)} (Account #0)` : 'Not connected'}
                </div>
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Send Form */}
                <div className="lg:col-span-1 space-y-6">
                    <Card title="Send QTokens">
                        <form onSubmit={handleSend} className="space-y-6">
                            {/* Select Recipient */}
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    Select Recipient Account
                                </label>
                                <select
                                    value={selectedToAccount}
                                    onChange={(e) => setSelectedToAccount(e.target.value)}
                                    className="w-full px-4 py-3 bg-dark-bg border border-dark-border rounded-lg text-white focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                                    disabled={loading}
                                >
                                    {TEST_ACCOUNTS.filter(acc => 
                                        acc.address.toLowerCase() !== address?.toLowerCase()
                                    ).map((account) => (
                                        <option key={account.address} value={account.address}>
                                            {account.name} ({formatAddress(account.address)})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Amount */}
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    Amount (QTOK)
                                </label>
                                <input
                                    type="number"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    placeholder="0.0"
                                    step="0.01"
                                    min="0"
                                    max={qTokenBalance}
                                    className="w-full px-4 py-3 bg-dark-bg border border-dark-border rounded-lg text-white focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                                    disabled={loading}
                                />
                                <div className="flex justify-between mt-2">
                                    <span className="text-xs text-slate-400">
                                        Your Balance: {formatNumber(qTokenBalance)} QTOK
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => setAmount(qTokenBalance)}
                                        className="text-xs text-brand-primary hover:text-brand-secondary"
                                        disabled={loading}
                                    >
                                        Use Max
                                    </button>
                                </div>
                            </div>

                            {/* Quick Send Buttons */}
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    Quick Send Amounts
                                </label>
                                <div className="grid grid-cols-5 gap-2">
                                    {quickSendAmounts.map((quickAmount) => (
                                        <button
                                            key={quickAmount}
                                            type="button"
                                            onClick={() => handleQuickSend(quickAmount)}
                                            className="px-3 py-2 bg-dark-border text-white text-sm rounded hover:bg-dark-border/80 transition-colors"
                                            disabled={loading}
                                        >
                                            {quickAmount}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* PQC Toggle */}
                            <div className="flex items-center justify-between p-4 bg-dark-bg/50 rounded-lg border border-dark-border">
                                <div>
                                    <span className="text-sm font-medium text-slate-300">PQC-Secured</span>
                                    <p className="text-xs text-slate-400 mt-1">Post-Quantum Cryptography</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setIsPqc(!isPqc)}
                                    disabled={loading}
                                    className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors ${
                                        isPqc ? 'bg-brand-primary' : 'bg-dark-border'
                                    }`}
                                >
                                    <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                                        isPqc ? 'translate-x-8' : 'translate-x-1'
                                    }`} />
                                </button>
                            </div>

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3 px-4 bg-gradient-to-r from-brand-primary to-brand-secondary text-white font-bold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                            >
                                {loading ? (
                                    <>
                                        <LoadingSpinner size="sm" className="mr-2" />
                                        Sending...
                                    </>
                                ) : (
                                    'Send QTokens'
                                )}
                            </button>

                            {/* Status Messages */}
                            {error && (
                                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                                    <p className="text-sm text-red-400">{error}</p>
                                </div>
                            )}

                            {success && (
                                <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                                    <p className="text-sm text-green-400">{success}</p>
                                    {txHash && (
                                        <div className="mt-2">
                                            <p className="text-xs text-green-400/80 font-mono">
                                                Tx Hash: {formatAddress(txHash)}
                                            </p>
                                            <a
                                                href={`http://localhost:8545/tx/${txHash}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-xs text-brand-primary underline mt-1 inline-block"
                                            >
                                                View in Local Explorer
                                            </a>
                                        </div>
                                    )}
                                </div>
                            )}
                        </form>
                    </Card>

                    {/* Your Account Info */}
                    <Card title="Your Account Info">
                        <div className="space-y-3">
                            <div className="flex justify-between items-center p-3 bg-dark-bg/50 rounded">
                                <span className="text-slate-400">Account</span>
                                <span className="text-white font-medium">Account #0</span>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-dark-bg/50 rounded">
                                <span className="text-slate-400">QToken Balance</span>
                                <span className="text-white font-bold">{formatNumber(qTokenBalance)} QTOK</span>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-dark-bg/50 rounded">
                                <span className="text-slate-400">ETH Balance</span>
                                <span className="text-white font-bold">{formatNumber(nativeBalance)} ETH</span>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-dark-bg/50 rounded">
                                <span className="text-slate-400">Address</span>
                                <span className="text-white font-mono text-sm">{formatAddress(address || '')}</span>
                            </div>
                        </div>
                    </Card>
                </div>

                {/* Test Account Balances */}
                <div className="lg:col-span-2">
                    <Card 
                        title={ // FIX: Wrap in a string or remove complex structure
                            <div className="flex justify-between items-center w-full">
                                <span>Test Account Balances</span>
                                <button
                                    onClick={loadTestAccountBalances}
                                    disabled={refreshingBalances}
                                    className="px-3 py-1 bg-dark-border text-sm text-white rounded hover:bg-dark-border/80 transition-colors flex items-center"
                                >
                                    {refreshingBalances ? (
                                        <>
                                            <LoadingSpinner size="sm" className="mr-2" />
                                            Refreshing...
                                        </>
                                    ) : (
                                        'Refresh Balances'
                                    )}
                                </button>
                            </div>
                        }
                    >
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-dark-border">
                                <thead>
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                                            Account
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                                            Address
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                                            QToken Balance
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                                            Status
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-dark-border">
                                    {testAccountBalances.map((account, index) => (
                                        <tr 
                                            key={account.address}
                                            className={`hover:bg-dark-bg/50 transition-colors ${
                                                account.address.toLowerCase() === address?.toLowerCase() 
                                                    ? 'bg-brand-primary/10' 
                                                    : ''
                                            }`}
                                        >
                                            <td className="px-4 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <div className={`w-3 h-3 rounded-full mr-3 ${
                                                        account.address.toLowerCase() === address?.toLowerCase() 
                                                            ? 'bg-green-500' 
                                                            : account.balance === '0.0000' 
                                                            ? 'bg-gray-500' 
                                                            : 'bg-blue-500'
                                                    }`}></div>
                                                    <span className="font-medium text-white">
                                                        {account.name}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap">
                                                <code className="text-sm font-mono text-slate-300">
                                                    {formatAddress(account.address)}
                                                </code>
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap">
                                                <div className="text-lg font-bold text-white">
                                                    {formatNumber(account.balance)} QTOK
                                                </div>
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap">
                                                {account.address.toLowerCase() === address?.toLowerCase() ? (
                                                    <span className="px-3 py-1 bg-green-500/20 text-green-400 text-xs font-medium rounded-full">
                                                        Connected
                                                    </span>
                                                ) : account.balance === '0.0000' ? (
                                                    <span className="px-3 py-1 bg-gray-500/20 text-gray-400 text-xs font-medium rounded-full">
                                                        No QTokens
                                                    </span>
                                                ) : (
                                                    <span className="px-3 py-1 bg-blue-500/20 text-blue-400 text-xs font-medium rounded-full">
                                                        Has QTokens
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        
                        <div className="mt-6 p-4 bg-dark-bg/50 rounded-lg">
                            <h4 className="font-semibold text-white mb-2">How to Test:</h4>
                            <ol className="text-sm text-slate-400 space-y-2">
                                <li>1. Select a recipient account from the dropdown</li>
                                <li>2. Enter amount (or use Quick Send buttons)</li>
                                <li>3. Toggle PQC if you want quantum-secured transfer</li>
                                <li>4. Click "Send QTokens" and confirm in MetaMask</li>
                                <li>5. Watch balances update in real-time!</li>
                            </ol>
                        </div>
                    </Card>

                    {/* Recent Transactions */}
                    <Card title="Recent Test Transactions">
                        <div className="space-y-3">
                            <div className="p-4 bg-dark-bg/50 rounded-lg">
                                <p className="text-slate-400 text-center">
                                    Send your first transaction to see it here!
                                </p>
                            </div>
                            <div className="p-4 bg-brand-primary/10 rounded-lg border border-brand-primary/20">
                                <h4 className="font-semibold text-white mb-2">💡 Testing Tips:</h4>
                                <ul className="text-sm text-slate-300 space-y-1">
                                    <li>• Try different amounts: 10, 50, 100 QTOK</li>
                                    <li>• Send to different accounts to see balance changes</li>
                                    <li>• Toggle PQC on/off to test quantum security</li>
                                    <li>• Watch transaction in local explorer: http://localhost:8545</li>
                                    <li>• Refresh balances after each transaction</li>
                                </ul>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>

            {/* Network Info */}
            <Card title="Quick Test Commands">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <h4 className="font-semibold text-white mb-3">Test Transactions</h4>
                        <div className="space-y-3">
                            <div className="p-3 bg-dark-bg/50 rounded">
                                <p className="text-sm text-slate-300">Send 10 QTOK to Account #1:</p>
                                <code className="text-xs text-slate-400 block mt-1">
                                    Recipient: 0x70997970C51812dc3A010C7d01b50e0d17dc79C8
                                </code>
                            </div>
                            <div className="p-3 bg-dark-bg/50 rounded">
                                <p className="text-sm text-slate-300">Send 100 QTOK to Account #2 (PQC):</p>
                                <code className="text-xs text-slate-400 block mt-1">
                                    Recipient: 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC
                                </code>
                            </div>
                        </div>
                    </div>
                    <div>
                        <h4 className="font-semibold text-white mb-3">Verify in Hardhat Console</h4>
                        <div className="space-y-3">
                            <div className="p-3 bg-dark-bg/50 rounded">
                                <p className="text-sm text-slate-300">Check QToken balance:</p>
                                <code className="text-xs text-brand-primary block mt-1 font-mono">
                                    npx hardhat balance --account 0
                                </code>
                            </div>
                            <div className="p-3 bg-dark-bg/50 rounded">
                                <p className="text-sm text-slate-300">Transfer from CLI:</p>
                                <code className="text-xs text-brand-primary block mt-1 font-mono">
                                    npx hardhat transfer --from 0 --to 1 --amount 50
                                </code>
                            </div>
                        </div>
                    </div>
                </div>
            </Card>
        </div>
    );
};

export default TestTransactions;
