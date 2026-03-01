// src/frontend/services/fraudService.ts
import axios from "axios";
import { FraudAlert } from "../types";

export const checkTransactionFraud = async (tx: {
  amount: number;
  fee: number;
  sender_wallet: string;
  receiver_wallet: string;
  timestamp: string;
}) => {
  try {
    const res = await axios.post("https://qchain-ai-backend.onrender.com/predict-fraud-real-time", tx);
    const data = res.data;
    const alert: FraudAlert = {
      transactionHash: "0x" + Math.random().toString(16).substring(2, 66),
      reason: data.reason,
      severity: data.severity,
      timestamp: tx.timestamp
    };
    return { ...alert, fraud: data.fraud, probability: data.probability };
  } catch (err) {
    console.error("AI fraud API error:", err);
    return { fraud: false, probability: 0, severity: "Low", reason: "Error", transactionHash: tx.sender_wallet };
  }
};
