// hooks/useAlgorandData.ts
import { useState, useEffect, useCallback } from 'react';
import { algorandService } from '../services/algorandService';
import { useAlgorandWallet } from './useAlgorandWallet';

export interface AlgorandTransaction {
    id: string;
    type: 'pay' | 'acfg' | 'axfer' | 'unknown';
    sender: string;
    receiver?: string;
    amount: number;
    assetId?: number;
    assetName?: string;
    timestamp: number;
    round: number;
    fee: number;
    note?: string;
    confirmed: boolean;
    explorerUrl: string;
    
}

export interface AlgorandAsset {
    'asset-id': number;
    amount: number;
    'is-frozen': boolean;
    params?: {
        name?: string;
        'unit-name'?: string;
        url?: string;
        total?: number;
        decimals?: number;
    };
}

export const useAlgorandData = () => {
    const { account: algoAccount, isConnected } = useAlgorandWallet();
    const [algoBalance, setAlgoBalance] = useState<number | null>(null);
    const [assets, setAssets] = useState<AlgorandAsset[]>([]);
    const [transactions, setTransactions] = useState<AlgorandTransaction[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Load cached data on mount
    useEffect(() => {
        const cachedBalance = localStorage.getItem('algorandBalance');
        const cachedAssets = localStorage.getItem('algorandAssets');
        const cachedTransactions = localStorage.getItem('algorandTransactions');

        if (cachedBalance) {
            setAlgoBalance(parseFloat(cachedBalance));
        }
        if (cachedAssets) {
            try {
                setAssets(JSON.parse(cachedAssets));
            } catch (e) {
                console.error('Error loading cached assets:', e);
            }
        }
        if (cachedTransactions) {
            try {
                setTransactions(JSON.parse(cachedTransactions));
            } catch (e) {
                console.error('Error loading cached transactions:', e);
            }
        }
    }, []);

    const fetchBalance = useCallback(async () => {
        if (!algoAccount) return;
        try {
            const balance = await algorandService.getBalance(algoAccount);
            setAlgoBalance(balance);
            localStorage.setItem('algorandBalance', balance.toString());
        } catch (err) {
            console.error('Error fetching Algorand balance:', err);
        }
    }, [algoAccount]);

    const fetchAssets = useCallback(async () => {
        if (!algoAccount) return;
        try {
            const accountAssets = await algorandService.getAccountAssets(algoAccount);
            setAssets(accountAssets);
            localStorage.setItem('algorandAssets', JSON.stringify(accountAssets));
        } catch (err) {
            console.error('Error fetching Algorand assets:', err);
        }
    }, [algoAccount]);

    const fetchTransactions = useCallback(async () => {
        if (!algoAccount) return;
        try {
            setLoading(true);
            const txs = await algorandService.lookupAccountTransactions(algoAccount, 50);

            const formattedTxs: AlgorandTransaction[] = txs.map((tx: any) => {
                const isConfirmed = tx['confirmed-round'] && tx['confirmed-round'] > 0;
                const txType = tx['tx-type'];
                let amount = 0;
                let receiver = '';
                let assetId = undefined;
                let assetName = '';

                // In the transaction mapping section:
                if (txType === 'pay' && tx['payment-transaction']) {
                    amount = tx['payment-transaction'].amount / 1_000_000; // This should be correct
                    receiver = tx['payment-transaction'].receiver || '';
                } else if (txType === 'acfg' && tx['asset-config-transaction']) {
                    assetId = tx['created-asset-index'] || tx['asset-index'];
                    assetName = tx['asset-config-transaction'].params?.name || 'Unknown Asset';
                    // For NFT creation, amount is 0 (the NFT itself is the asset)
                    amount = 0;
                } else if (txType === 'axfer' && tx['asset-transfer-transaction']) {
                    amount = tx['asset-transfer-transaction'].amount; // This is usually in whole units
                    receiver = tx['asset-transfer-transaction'].receiver || '';
                    assetId = tx['asset-transfer-transaction']['asset-id'];
                }

                return {
                    id: tx.id,
                    type: txType as any,
                    sender: tx.sender,
                    receiver,
                    amount,
                    assetId,
                    assetName,
                    timestamp: tx['round-time'] * 1000,
                    round: tx['confirmed-round'] || 0,
                    fee: tx.fee / 1_000_000,
                    note: tx.note ? new TextDecoder().decode(new Uint8Array(tx.note)) : undefined,
                    confirmed: isConfirmed,
                    explorerUrl: `https://lora.algokit.io/testnet/transaction/${tx.id}`
                };
            });

            setTransactions(formattedTxs);
            localStorage.setItem('algorandTransactions', JSON.stringify(formattedTxs));
        } catch (err) {
            console.error('Error fetching Algorand transactions:', err);
            setError('Failed to fetch transactions');
        } finally {
            setLoading(false);
        }
    }, [algoAccount]);

    const refreshAll = useCallback(async () => {
        if (!algoAccount) return;
        setLoading(true);
        setError(null);
        try {
            await Promise.all([
                fetchBalance(),
                fetchAssets(),
                fetchTransactions()
            ]);
        } catch (err) {
            console.error('Error refreshing Algorand data:', err);
            setError('Failed to refresh data');
        } finally {
            setLoading(false);
        }
    }, [algoAccount, fetchBalance, fetchAssets, fetchTransactions]);

    useEffect(() => {
        if (isConnected && algoAccount) {
            refreshAll();

            const interval = setInterval(refreshAll, 30000);
            return () => clearInterval(interval);
        }
    }, [isConnected, algoAccount, refreshAll]);

    return {
        algoAccount,
        algoBalance,
        assets,
        transactions,
        loading,
        error,
        refreshAll,
        fetchBalance,
        fetchAssets,
        fetchTransactions
    };
};