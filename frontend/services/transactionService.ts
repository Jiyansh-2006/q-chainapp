export interface Transaction {
    hash: string;
    from: string;
    to: string;
    amount: string;
    timestamp: number;
    status: 'Pending' | 'Completed' | 'Failed';
    isPqc?: boolean;
}

class TransactionService {
    private storageKey = 'qtoken_transactions';
    private listeners: ((transactions: Transaction[]) => void)[] = [];

    // Get all transactions from localStorage
    getTransactions(): Transaction[] {
        if (typeof window === 'undefined') return [];
        const stored = localStorage.getItem(this.storageKey);
        return stored ? JSON.parse(stored) : [];
    }

    // Save transaction to localStorage
    addTransaction(transaction: Transaction) {
        const transactions = this.getTransactions();
        transactions.unshift(transaction);
        localStorage.setItem(this.storageKey, JSON.stringify(transactions));
        
        // Notify listeners
        this.notifyListeners(transactions);
    }

    // Update transaction status
    updateTransactionStatus(hash: string, status: 'Completed' | 'Failed') {
        const transactions = this.getTransactions();
        const updated = transactions.map(tx => 
            tx.hash === hash ? { ...tx, status } : tx
        );
        localStorage.setItem(this.storageKey, JSON.stringify(updated));
        
        // Notify listeners
        this.notifyListeners(updated);
    }

    // Subscribe to transaction updates
    subscribe(callback: (transactions: Transaction[]) => void) {
        this.listeners.push(callback);
        return () => {
            this.listeners = this.listeners.filter(cb => cb !== callback);
        };
    }

    private notifyListeners(transactions: Transaction[]) {
        this.listeners.forEach(callback => callback(transactions));
    }

    // Clear all transactions (for testing)
    clearTransactions() {
        localStorage.removeItem(this.storageKey);
        this.notifyListeners([]);
    }
}

export const transactionService = new TransactionService();