// services/quantumService.ts

export interface QuantumSignature {
  signature: string;
  algorithm: string;
  transaction_hash: string;
  timestamp: string;
  wallet_id: string;
}

class QuantumService {
  private baseUrl = "https://qchain-quantum-pqc-backend.onrender.com";
  private static instance: QuantumService;

  static getInstance(): QuantumService {
    if (!QuantumService.instance) {
      QuantumService.instance = new QuantumService();
    }
    return QuantumService.instance;
  }

  // ✅ Health Check
  async checkHealth(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/health`);
      if (!res.ok) return false;

      const data = await res.json();
      return data.status === "healthy";
    } catch {
      return false;
    }
  }

  // ✅ Sign Transaction (PQC)
  async signTransaction(
    walletId: string,
    amount: number,
    to: string
  ): Promise<QuantumSignature> {

    const body = {
      wallet_id: walletId,
      transaction: {
        amount,
        to,
        nonce: Date.now(),
        timestamp: new Date().toISOString()
      },
      algorithm: "pqc"
    };

    const res = await fetch(`${this.baseUrl}/sign`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(errorText);
    }

    const result = await res.json();

    return {
      signature: result.signature,
      algorithm: result.algorithm,
      transaction_hash: result.transaction_hash,
      timestamp: result.timestamp,
      wallet_id: result.wallet_id
    };
  }
}

export const quantumService = QuantumService.getInstance();
