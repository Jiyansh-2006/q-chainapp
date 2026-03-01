import axios from "axios";
import { FraudAlert } from '../types';

/**
 * Fetch AI fraud alerts using the trained Python Random Forest model.
 * The Python backend should be running on http://localhost:8000
 */
export const getFraudAlerts = async (): Promise<FraudAlert[]> => {
    try {
        // Example: fetch latest transactions from user's wallet or your database
        // Replace this with real wallet transaction fetch
        const transactions = [
            { amount: 2.5, fee: 0.01, sender_wallet: "0xABC", timestamp: new Date().toISOString(), transactionHash: "0x123abc456def7890abcdef1234567890abcdef1234567890abcdef1234567890" },
            { amount: 10, fee: 0.05, sender_wallet: "0xDEF", timestamp: new Date().toISOString(), transactionHash: "0x456def7890abcdef1234567890abcdef1234567890abcdef1234567890abcdef" },
            { amount: 0.1, fee: 0.001, sender_wallet: "0xGHI", timestamp: new Date().toISOString(), transactionHash: "0x789abc123def4567890abcdef1234567890abcdef1234567890abcdef123456" }
        ];

        const alerts: FraudAlert[] = [];

        for (const tx of transactions) {
            const res = await axios.post("https://qchain-ai-backend.onrender.com/predict-fraud", {
                amount: tx.amount,
                fee: tx.fee,
                sender_wallet: tx.sender_wallet,
                timestamp: tx.timestamp
            });

            const data = res.data;
            if (data.fraud) {
                alerts.push({
                    transactionHash: tx.transactionHash,
                    reason: data.reason,
                    severity: data.severity,
                    timestamp: tx.timestamp
                });
            }
        }

        return alerts;

    } catch (error) {
        console.error("Error fetching fraud alerts from Python backend:", error);
        return getMockFraudAlerts();
    }
};

/**
 * Fallback mock alerts in case API fails
 */
const getMockFraudAlerts = (): FraudAlert[] => {
    return [
        {
            transactionHash: '0x1a2b3c...',
            reason: 'High volume transfer to a newly created wallet address.',
            severity: 'High',
            timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString()
        },
        {
            transactionHash: '0x4d5e6f...',
            reason: 'Transaction originates from an address associated with phishing scams.',
            severity: 'Medium',
            timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString()
        },
        {
            transactionHash: '0x7g8h9i...',
            reason: 'Unusually small, rapid-fire transactions (dusting attempt).',
            severity: 'Low',
            timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString()
        }
    ];
};
