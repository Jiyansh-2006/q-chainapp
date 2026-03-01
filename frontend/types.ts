
import { ethers } from 'ethers';

export interface WalletState {
  provider: ethers.BrowserProvider | null;
  signer: ethers.JsonRpcSigner | null;
  address: string | null;
  network: ethers.Network | null;
  qTokenBalance: string;
  nfts: NFT[];
}

export interface NFT {
  id: string;
  name: string;
  description: string;
  image: string;
}

export interface Transaction {
  hash: string;
  from: string;
  to: string;
  amount: string;
  timestamp: number;
  status: 'Completed' | 'Pending' | 'Failed';
}
export interface FraudAlert {
  transactionHash: string;
  reason: string;
  severity: 'Low' | 'Medium' | 'High';
  timestamp: string;
}

// Extended type for real-time prediction
export interface RealTimeFraudAlert extends FraudAlert {
  fraud: boolean;
  probability: number;
}