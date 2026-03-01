import { PeraWalletConnect } from "@perawallet/connect";
import algosdk from "algosdk";

type PeraWalletOptions = NonNullable<
  ConstructorParameters<typeof PeraWalletConnect>[0]
>;
type PeraChainId = NonNullable<PeraWalletOptions["chainId"]>;

const ALGORAND_CHAIN_IDS: Record<"MAINNET" | "TESTNET" | "BETANET", PeraChainId> = {
  MAINNET: 416001,
  TESTNET: 416002,
  BETANET: 416003,
};

type AlgorandNetwork = "mainnet" | "testnet" | "betanet";

class AlgorandWalletService {
  private peraWallet: PeraWalletConnect | null = null;
  private accounts: string[] = [];
  private currentNetwork: AlgorandNetwork = "testnet";
  private isReconnecting: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.currentNetwork = this.getConfiguredNetwork();
      this.initializePeraWallet();
    }
  }

  private getConfiguredNetwork(): AlgorandNetwork {
    try {
      const rawNetwork = String(
        import.meta.env.VITE_ALGORAND_NETWORK ?? "testnet"
      ).toLowerCase();

      if (rawNetwork === "mainnet") return "mainnet";
      if (rawNetwork === "betanet") return "betanet";
      return "testnet";
    } catch (error) {
      console.warn("Error reading network env, defaulting to testnet");
      return "testnet";
    }
  }

  private getConfiguredChainId(): PeraChainId {
    const network = this.currentNetwork;
    if (network === "mainnet") return ALGORAND_CHAIN_IDS.MAINNET;
    if (network === "betanet") return ALGORAND_CHAIN_IDS.BETANET;
    return ALGORAND_CHAIN_IDS.TESTNET;
  }

  private initializePeraWallet() {
    try {
      this.peraWallet = new PeraWalletConnect({
        chainId: this.getConfiguredChainId(),
        shouldShowSignTxnToast: true,
      });
      
      console.log(`✅ Pera Wallet initialized for ${this.getNetworkDisplayName()} (Chain ID: ${this.getConfiguredChainId()})`);
      
      setTimeout(() => {
        this.reconnectSession().catch(() => {});
      }, 1000);
    } catch (error) {
      console.error("Failed to initialize Pera Wallet:", error);
    }
  }

  async connect(): Promise<string> {
    this.ensureInitialized();
    
    try {
      if (this.accounts.length > 0) {
        return this.accounts[0];
      }

      const existingAccount = await this.reconnectSession();
      if (existingAccount) {
        return existingAccount;
      }

      const accounts = await this.peraWallet!.connect();
      
      if (!accounts || !accounts.length) {
        throw new Error("No Algorand account returned by Pera Wallet");
      }
      
      this.accounts = accounts;
      return accounts[0];
    } catch (error: any) {
      console.error("Pera Wallet connection error:", error);
      
      if (error?.message?.includes('cancelled') || error?.data?.type === "CONNECT_MODAL_CLOSED") {
        throw new Error("Connection cancelled by user");
      } else if (error?.message?.includes('Network mismatch') || error?.message?.includes('network')) {
        throw new Error(`Network mismatch! Your Pera Wallet is on a different network. Please switch your Pera Wallet to ${this.getNetworkDisplayName()}.`);
      } else if (error?.message?.includes('timeout') || error?.message?.includes('Failed to fetch')) {
        throw new Error("Connection timeout. Please check your internet connection and try again.");
      }
      
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.peraWallet) {
      try {
        await this.peraWallet.disconnect();
      } catch (error) {
        console.error("Error disconnecting Pera Wallet:", error);
      }
    }
    this.accounts = [];
  }

  async reconnectSession(): Promise<string | null> {
    if (!this.peraWallet || this.isReconnecting) return null;
    
    this.isReconnecting = true;
    
    try {
      const accounts = await this.peraWallet.reconnectSession();
      if (accounts && accounts.length > 0) {
        this.accounts = accounts;
        return accounts[0];
      }
      this.accounts = [];
      return null;
    } catch (error) {
      this.accounts = [];
      return null;
    } finally {
      this.isReconnecting = false;
    }
  }

  getActiveAccount(): string | null {
    return this.accounts.length > 0 ? this.accounts[0] : null;
  }

  async signTransaction(txn: algosdk.Transaction): Promise<Uint8Array> {
    this.ensureInitialized();
    const activeAccount = this.ensureConnected();

    if (!txn) {
      throw new Error("Transaction is required");
    }
    
    try {
      const signedTxns = await this.peraWallet!.signTransaction([
        [{ txn, signers: [activeAccount] }],
      ]);

      if (!signedTxns || !signedTxns.length) {
        throw new Error("No signed transaction returned by Pera Wallet");
      }

      return signedTxns[0];
    } catch (error: any) {
      console.error("Error signing transaction:", error);
      
      if (error?.message?.includes('cancelled')) {
        throw new Error("Transaction signing cancelled by user");
      }
      
      throw error;
    }
  }

  async signGroupedTransactions(txns: algosdk.Transaction[]): Promise<Uint8Array[]> {
    this.ensureInitialized();
    const activeAccount = this.ensureConnected();

    if (!txns.length) {
      throw new Error("At least one transaction is required");
    }
    
    try {
      const txGroup = txns.map((txn) => ({ txn, signers: [activeAccount] }));
      const signedTxns = await this.peraWallet!.signTransaction([txGroup]);
      
      if (!signedTxns || !signedTxns.length) {
        throw new Error("No signed grouped transactions returned by Pera Wallet");
      }
      
      return signedTxns;
    } catch (error: any) {
      console.error("Error signing grouped transactions:", error);
      
      if (error?.message?.includes('cancelled')) {
        throw new Error("Transaction signing cancelled by user");
      }
      
      throw error;
    }
  }

  getCurrentNetwork(): AlgorandNetwork {
    return this.currentNetwork;
  }

  getNetworkDisplayName(): string {
    return this.currentNetwork === 'mainnet' ? 'MainNet' : 'TestNet';
  }

  private ensureInitialized() {
    if (typeof window === 'undefined') {
      throw new Error("Pera Wallet can only be used in browser environment");
    }
    if (!this.peraWallet) {
      this.initializePeraWallet();
      if (!this.peraWallet) {
        throw new Error("Failed to initialize Pera Wallet");
      }
    }
  }

  private ensureConnected(): string {
    if (!this.accounts || !this.accounts.length) {
      throw new Error("No account connected. Please connect your wallet first.");
    }
    return this.accounts[0];
  }

  isAvailable(): boolean {
    return typeof window !== 'undefined' && this.peraWallet !== null;
  }

  async checkConnection(): Promise<boolean> {
    try {
      const account = this.getActiveAccount();
      if (!account) return false;
      const reconnected = await this.reconnectSession();
      return !!reconnected;
    } catch {
      return false;
    }
  }
}

export const algorandWallet = new AlgorandWalletService();
export const connectAlgorandWallet = async (): Promise<string> => {
  return algorandWallet.connect();
};