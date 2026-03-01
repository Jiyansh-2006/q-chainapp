// services/quantumZKPService.ts

export interface PqcSignature {
  status: string;
  signature: string;
  algorithm: string;
  transaction_hash: string;
  analysis?: any;
  timestamp: string;
  wallet_id: string;
}

export interface SignWithZKPOptions {
  wallet_id: string;
  transaction: {
    amount: number;
    to: string;
    nonce: number;
    timestamp: string;
  };
  algorithm?: "pqc" | "ecdsa";
  zkp?: any;
}

class QuantumZKPService {
  private baseUrl = "https://qchain-quantum-pqc-backend.onrender.com";
  private static instance: QuantumZKPService;

  static getInstance(): QuantumZKPService {
    if (!QuantumZKPService.instance) {
      QuantumZKPService.instance = new QuantumZKPService();
    }
    return QuantumZKPService.instance;
  }

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

  async signWithZKP(options: SignWithZKPOptions): Promise<PqcSignature> {
    const requestBody = {
      wallet_id: options.wallet_id,
      transaction: options.transaction,
      algorithm: options.algorithm || "pqc",
      zkp: options.zkp || null
    };

    const response = await fetch(`${this.baseUrl}/sign`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText);
    }

    return await response.json();
  }
}

export const quantumZKP = QuantumZKPService.getInstance();
