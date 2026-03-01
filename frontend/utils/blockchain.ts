import { ethers } from 'ethers';
import { QTOKEN_ABI, getQTokenAddress } from '../config/blockchain';

// ==================== CONTRACT HELPERS ====================
export const createContract = (
    address: string,
    signerOrProvider: any
): ethers.Contract => {
    return new ethers.Contract(address, QTOKEN_ABI, signerOrProvider);
};

export const getQTokenContract = (
    chainId: number,
    signerOrProvider: any
): ethers.Contract | null => {
    const address = getQTokenAddress(chainId);
    if (!address) return null;
    return createContract(address, signerOrProvider);
};

// ==================== TRANSACTION HELPERS ====================
export const parseTokenAmount = (amount: string, decimals: number = 18): bigint => {
    try {
        return ethers.parseUnits(amount, decimals);
    } catch {
        return 0n;
    }
};

export const formatTokenAmount = (amount: bigint, decimals: number = 18): string => {
    try {
        return ethers.formatUnits(amount, decimals);
    } catch {
        return '0';
    }
};

// ==================== VALIDATION ====================
export const validateAddress = (address: string): {
    isValid: boolean;
    error?: string;
} => {
    if (!address) {
        return { isValid: false, error: 'Address is required' };
    }
    
    if (!ethers.isAddress(address)) {
        return { isValid: false, error: 'Invalid Ethereum address' };
    }
    
    if (address === ethers.ZeroAddress) {
        return { isValid: false, error: 'Zero address not allowed' };
    }
    
    return { isValid: true };
};

export const validateTokenAmount = (
    amount: string,
    balance: string,
    decimals: number = 18
): { isValid: boolean; error?: string } => {
    if (!amount || amount.trim() === '') {
        return { isValid: false, error: 'Amount is required' };
    }
    
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum)) {
        return { isValid: false, error: 'Invalid amount' };
    }
    
    if (amountNum <= 0) {
        return { isValid: false, error: 'Amount must be greater than 0' };
    }
    
    // Check if amount exceeds balance
    const balanceNum = parseFloat(balance);
    if (amountNum > balanceNum) {
        return { isValid: false, error: 'Insufficient balance' };
    }
    
    return { isValid: true };
};

// ==================== ERROR HANDLING ====================
export const parseContractError = (error: any): string => {
    if (!error) return 'Unknown error';
    
    // Common MetaMask errors
    if (error.code === 4001) {
        return 'Transaction rejected by user';
    }
    
    if (error.code === -32603) {
        return 'Internal JSON-RPC error';
    }
    
    // Contract revert errors
    if (error.reason) {
        return error.reason;
    }
    
    // Insufficient gas
    if (error.message?.includes('insufficient funds')) {
        return 'Insufficient funds for gas';
    }
    
    // Network errors
    if (error.message?.includes('network changed')) {
        return 'Network changed. Please try again';
    }
    
    return error.message || 'Transaction failed';
};

// ==================== MOCK DATA (for development) ====================
export const getMockTransactions = (address: string): any[] => {
    return [
        {
            hash: `0x${Math.random().toString(16).substring(2, 42)}`,
            from: address,
            to: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
            amount: '100.0',
            timestamp: Date.now() - 3600000,
            status: 'completed',
            type: 'transfer'
        },
        {
            hash: `0x${Math.random().toString(16).substring(2, 42)}`,
            from: address,
            to: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
            amount: '50.5',
            timestamp: Date.now() - 7200000,
            status: 'completed',
            type: 'pqc_transfer'
        },
        {
            hash: `0x${Math.random().toString(16).substring(2, 42)}`,
            from: address,
            to: '0x90F79bf6EB2c4f870365E785982E1f101E93b906',
            amount: '200.0',
            timestamp: Date.now() - 10800000,
            status: 'pending',
            type: 'transfer'
        }
    ];
};