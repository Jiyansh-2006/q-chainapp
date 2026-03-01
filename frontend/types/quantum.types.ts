// types/quantum.types.ts
export interface CryptanalysisMetrics {
  entropy_score: number;
  timing_leak_score: number;
  pattern_match: number;
  signature_strength: number;
  nonce_reuse_risk: number;
  timestamp_drift: number;
}

export interface CryptanalysisResult {
  secure: boolean;
  risk: 'low' | 'medium' | 'high';
  risk_score: number;
  issues: string[];
  metrics: CryptanalysisMetrics;
  recommendations: string[];
  timestamp_analysis: {
    expected_delay: number;
    actual_delay: number;
    variance: number;
    is_suspicious: boolean;
  };
}

export interface ZKPAttribute {
  name: string;
  value: string | number;
  verified: boolean;
  proof: string;
  public_inputs?: Record<string, any>;
  circuit_type?: string;
}

export interface ZKPVerification {
  verified: boolean;
  proof_id: string;
  timestamp: number;
  attributes: ZKPAttribute[];
  overall_score: number;
  validation_method: string;
  circuit?: {
    name: string;
    constraints: number;
    proving_time_ms: number;
    verification_time_ms: number;
  };
}

export interface PqcSignature {
  signature: string;
  algorithm: string;
  pqc: boolean;
  transaction_hash: string;
  cryptanalysis: CryptanalysisResult;
  zkp_verification?: ZKPVerification;
  status: 'success' | 'warning' | 'error';
  timestamp: string;
  wallet_id: string;
}