import algosdk from "algosdk";

class AlgorandService {
  private algodClient: algosdk.Algodv2;
  private indexerClient: algosdk.Indexer | null = null;
  private network: 'mainnet' | 'testnet' | 'betanet' = 'testnet';

  constructor() {
    // Get network from environment variable
    const configuredNetwork = (import.meta.env.VITE_ALGORAND_NETWORK || "testnet").toLowerCase();
    
    // Set the network based on environment
    if (configuredNetwork === "mainnet") {
      this.setNetwork("mainnet");
    } else if (configuredNetwork === "betanet") {
      this.setNetwork("betanet");
    } else {
      this.setNetwork("testnet");
    }
    
    console.log(`🔧 AlgorandService initialized with network: ${this.network}`);
  }

  // ================= GETTERS =================

  get client() {
    return this.algodClient;
  }

  get indexer() {
    return this.indexerClient;
  }

  // ================= NETWORK MANAGEMENT =================

  setNetwork(network: 'mainnet' | 'testnet' | 'betanet') {
    this.network = network;
    
    const endpoints: Record<string, { algod: string; indexer: string }> = {
      mainnet: {
        algod: "https://mainnet-api.algonode.cloud",
        indexer: "https://mainnet-idx.algonode.cloud"
      },
      testnet: {
        algod: "https://testnet-api.algonode.cloud",
        indexer: "https://testnet-idx.algonode.cloud"
      },
      betanet: {
        algod: "https://betanet-api.algonode.cloud",
        indexer: "https://betanet-idx.algonode.cloud"
      }
    };

    this.algodClient = new algosdk.Algodv2(
      "",
      endpoints[network].algod,
      ""
    );

    this.indexerClient = new algosdk.Indexer(
      "",
      endpoints[network].indexer,
      ""
    );
    
    console.log(`✅ Switched to Algorand ${network}`);
  }

  getNetwork(): string {
    return this.network;
  }

  // ================= ACCOUNT OPERATIONS =================

  async getAccountInfo(address: string) {
    try {
      return await this.algodClient.accountInformation(address).do();
    } catch (error) {
      console.error(`Error fetching account info for ${address}:`, error);
      throw new Error(`Failed to fetch account info: ${error}`);
    }
  }

  async getBalance(address: string): Promise<number> {
    try {
      const account = await this.getAccountInfo(address);
      return Number(account.amount) / 1_000_000; // microAlgo → ALGO
    } catch (error) {
      console.error(`Error fetching balance for ${address}:`, error);
      return 0;
    }
  }

  async getAssetBalance(address: string, assetId: number): Promise<number> {
    try {
      const account = await this.getAccountInfo(address);
      const asset = account.assets?.find((a: any) => a['asset-id'] === assetId);
      return asset ? Number(asset.amount) : 0;
    } catch (error) {
      console.error(`Error fetching asset balance:`, error);
      return 0;
    }
  }

  // ================= ASSET (NFT) OPERATIONS =================

  async getAssetInfo(assetId: number) {
    try {
      return await this.algodClient.getAssetByID(assetId).do();
    } catch (error) {
      console.error(`Error fetching asset info for ${assetId}:`, error);
      throw new Error(`Failed to fetch asset info: ${error}`);
    }
  }

  async getAccountAssets(address: string) {
    try {
      const account = await this.getAccountInfo(address);
      return account.assets || [];
    } catch (error) {
      console.error(`Error fetching account assets:`, error);
      return [];
    }
  }

  // ================= TRANSACTION CREATION =================

  async getSuggestedParams() {
    try {
      return await this.algodClient.getTransactionParams().do();
    } catch (error) {
      console.error('Error getting suggested params:', error);
      throw new Error(`Failed to get suggested params: ${error}`);
    }
  }

  async createNFTTransaction(
    creatorAddress: string,
    name: string,
    quantumHash: string,
    unitName: string = "QNFT",
    total: number = 1,
    decimals: number = 0,
    defaultFrozen: boolean = false,
    metadataHash?: string | Uint8Array
  ) {
    try {
      const params = await this.getSuggestedParams();

      const txnObj: any = {
        sender: creatorAddress,
        total: total,
        decimals: decimals,
        assetName: name,
        unitName: unitName,
        assetURL: quantumHash,
        defaultFrozen: defaultFrozen,
        suggestedParams: params,
      };

      if (metadataHash) {
        txnObj.metadataHash = typeof metadataHash === 'string' 
          ? new Uint8Array(Buffer.from(metadataHash, 'base64'))
          : metadataHash;
      }

      const txn = algosdk.makeAssetCreateTxnWithSuggestedParamsFromObject(txnObj);

      return txn;
    } catch (error) {
      console.error('Error creating NFT transaction:', error);
      throw new Error(`Failed to create NFT transaction: ${error}`);
    }
  }

  async createOptInTransaction(account: string, assetId: number) {
    try {
      const params = await this.getSuggestedParams();
      
      const txn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
        sender: account,
        receiver: account,
        assetIndex: assetId,
        amount: 0,
        suggestedParams: params,
      });

      return txn;
    } catch (error) {
      console.error('Error creating opt-in transaction:', error);
      throw new Error(`Failed to create opt-in transaction: ${error}`);
    }
  }

  async createTransferTransaction(
    from: string,
    to: string,
    assetId: number,
    amount: number
  ) {
    try {
      const params = await this.getSuggestedParams();
      
      const txn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
        sender: from,
        receiver: to,
        assetIndex: assetId,
        amount: amount,
        suggestedParams: params,
      });

      return txn;
    } catch (error) {
      console.error('Error creating transfer transaction:', error);
      throw new Error(`Failed to create transfer transaction: ${error}`);
    }
  }

  async createPaymentTransaction(
    from: string,
    to: string,
    amount: number,
    note?: string
  ) {
    try {
      const params = await this.getSuggestedParams();
      const noteUint8Array = note ? new Uint8Array(Buffer.from(note)) : undefined;
      
      const txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        sender: from,
        receiver: to,
        amount: amount * 1_000_000, // Convert ALGO to microAlgo
        note: noteUint8Array,
        suggestedParams: params,
      });

      return txn;
    } catch (error) {
      console.error('Error creating payment transaction:', error);
      throw new Error(`Failed to create payment transaction: ${error}`);
    }
  }

  // ================= TRANSACTION SUBMISSION =================
  async sendTransaction(signedTxn: Uint8Array) {
    try {
      const response = await this.algodClient.sendRawTransaction(signedTxn).do();
      const txId = response.txid;
      
      if (!txId) {
        console.error('Could not extract txId from response:', response);
        throw new Error('Failed to get transaction ID from response');
      }
      
      console.log(`✅ Transaction sent with ID: ${txId} on ${this.network}`);
      return { txId };
    } catch (error) {
      console.error('Error sending transaction:', error);
      throw new Error(`Failed to send transaction: ${error}`);
    }
  }

  // ================= EXPLORER URLS =================
  getExplorerUrls(id: string, type: 'transaction' | 'asset' = 'transaction'): {
    lora: string;
    allo: string;
    algoscan: string;
    goalseeker: string;
    indexer: string;
  } {
    const baseNetwork = this.network === 'mainnet' ? '' : 'testnet.';
    const path = type === 'asset' ? 'asset' : 'transaction';
    
    return {
      lora: `https://lora.algokit.io/${this.network}/${path}/${id}`,
      allo: `https://allo.info/${path === 'asset' ? 'asset' : 'tx'}/${id}`,
      algoscan: `https://${baseNetwork}algoscan.app/${path}/${id}`,
      goalseeker: `https://goalseeker.purestake.io/algorand/${this.network}/${path}/${id}`,
      indexer: `https://${this.network}-idx.algonode.cloud/v2/${path}s/${id}`
    };
  }

  // ================= INDEXER STATUS CHECK =================
  async checkTransactionStatusViaIndexer(txId: string): Promise<any> {
    if (!this.indexerClient) {
      throw new Error('Indexer client not initialized');
    }

    try {
      const response = await this.indexerClient.lookupTransactionByID(txId).do();
      const transaction = response.transaction;
      
      if (transaction) {
        let assetId = "N/A";
        if (transaction["created-asset-index"]) {
          assetId = transaction["created-asset-index"].toString();
        } else if (transaction["asset-index"]) {
          assetId = transaction["asset-index"].toString();
        }
        
        const isConfirmed = transaction["confirmed-round"] && transaction["confirmed-round"] > 0;
        
        return {
          confirmed: isConfirmed,
          round: transaction["confirmed-round"],
          transaction: transaction,
          assetId: assetId,
          message: isConfirmed ? "Transaction confirmed (found via indexer)" : "Transaction found but not confirmed",
          explorerUrls: this.getExplorerUrls(assetId !== "N/A" ? assetId : txId, assetId !== "N/A" ? 'asset' : 'transaction')
        };
      }
      
      return { confirmed: false, found: false };
    } catch (error: any) {
      if (error.status === 404) {
        return { confirmed: false, found: false };
      }
      console.error('Error checking transaction via indexer:', error);
      return { confirmed: false, found: false, error: error.message };
    }
  }

  // ================= WAIT FOR CONFIRMATION =================
  async waitForConfirmation(
    txId: string, 
    timeoutRounds: number = 100,
    checkInterval: number = 2
  ): Promise<any> {
    try {
      console.log(`⏳ Waiting for confirmation of transaction: ${txId} on ${this.network} (timeout: ${timeoutRounds} rounds)`);
      
      const status = await this.algodClient.status().do();
      let currentRound = status["last-round"];
      const maxRound = currentRound + timeoutRounds;
      let attempts = 0;

      while (currentRound < maxRound) {
        attempts++;
        try {
          const pendingInfo = await this.algodClient
            .pendingTransactionInformation(txId)
            .do();

          if (pendingInfo["confirmed-round"] && pendingInfo["confirmed-round"] > 0) {
            console.log(`✅ Transaction confirmed in round ${pendingInfo["confirmed-round"]} on ${this.network}`);
            
            let assetId = "N/A";
            if (pendingInfo["created-asset-index"]) {
              assetId = pendingInfo["created-asset-index"].toString();
            } else if (pendingInfo["asset-index"]) {
              assetId = pendingInfo["asset-index"].toString();
            }

            return {
              confirmed: true,
              round: pendingInfo["confirmed-round"],
              transaction: pendingInfo,
              assetId: assetId,
              message: "Transaction confirmed successfully",
              explorerUrls: this.getExplorerUrls(assetId !== "N/A" ? assetId : txId, assetId !== "N/A" ? 'asset' : 'transaction')
            };
          }
        } catch (pendingError: any) {
          if (pendingError.status === 404) {
            try {
              const indexerResult = await this.checkTransactionStatusViaIndexer(txId);
              if (indexerResult.confirmed) {
                console.log(`✅ Transaction confirmed (found via indexer) on ${this.network}`);
                return indexerResult;
              }
            } catch (indexerError) {
              // Ignore
            }
          }
        }

        if (attempts % 5 === 0) {
          try {
            const indexerResult = await this.checkTransactionStatusViaIndexer(txId);
            if (indexerResult.confirmed) {
              return indexerResult;
            }
          } catch (indexerError) {
            // Ignore
          }
        }

        if (attempts % 10 === 0) {
          console.log(`⏳ Still waiting on ${this.network}... (round ${currentRound}/${maxRound})`);
        }

        currentRound += checkInterval;
        await this.algodClient.statusAfterBlock(currentRound).do();
      }

      // Final check
      try {
        const finalCheck = await this.checkTransactionStatusViaIndexer(txId);
        if (finalCheck.confirmed) {
          return finalCheck;
        }
      } catch (error) {
        // Ignore
      }

      const explorerUrls = this.getExplorerUrls(txId, 'transaction');
      console.warn(`⚠️ Transaction not confirmed after ${timeoutRounds} rounds on ${this.network}. Check at: ${explorerUrls.lora}`);

      return {
        confirmed: false,
        timedOut: true,
        message: `Transaction not confirmed after ${timeoutRounds} rounds on ${this.network}. Check status at the explorer.`,
        txId: txId,
        explorerUrls: explorerUrls
      };

    } catch (error) {
      console.error('Error in waitForConfirmation:', error);
      return {
        confirmed: false,
        error: String(error),
        message: `Failed to wait for confirmation: ${error}`,
        explorerUrls: this.getExplorerUrls(txId, 'transaction')
      };
    }
  }

  async getTransactionInfo(txId: string) {
    try {
      return await this.algodClient.pendingTransactionInformation(txId).do();
    } catch (error) {
      console.error('Error getting transaction info:', error);
      throw new Error(`Failed to get transaction info: ${error}`);
    }
  }

  async checkTransactionStatus(txId: string): Promise<{
    confirmed: boolean;
    round?: number;
    error?: string;
    found?: boolean;
    assetId?: string;
    explorerUrls?: any;
  }> {
    try {
      const pendingInfo = await this.algodClient
        .pendingTransactionInformation(txId)
        .do();
      
      if (pendingInfo["confirmed-round"] && pendingInfo["confirmed-round"] > 0) {
        let assetId = "N/A";
        if (pendingInfo["asset-index"]) {
          assetId = pendingInfo["asset-index"].toString();
        } else if (pendingInfo["created-asset-index"]) {
          assetId = pendingInfo["created-asset-index"].toString();
        }
        
        return { 
          confirmed: true, 
          round: pendingInfo["confirmed-round"], 
          found: true,
          assetId: assetId,
          explorerUrls: this.getExplorerUrls(assetId !== "N/A" ? assetId : txId, assetId !== "N/A" ? 'asset' : 'transaction')
        };
      }
      
      if (pendingInfo["pool-error"]) {
        return { 
          confirmed: false, 
          error: pendingInfo["pool-error"], 
          found: true,
          explorerUrls: this.getExplorerUrls(txId, 'transaction')
        };
      }
      
      return { confirmed: false, found: true };
    } catch (error) {
      try {
        const indexerResult = await this.checkTransactionStatusViaIndexer(txId);
        return indexerResult;
      } catch (indexerError) {
        return { confirmed: false, found: false };
      }
    }
  }

  // ================= INDEXER QUERIES =================

  async lookupAccountTransactions(address: string, limit: number = 100) {
    if (!this.indexerClient) {
      throw new Error('Indexer client not initialized');
    }

    try {
      const response = await this.indexerClient
        .lookupAccountTransactions(address)
        .limit(limit)
        .do();
      return response.transactions;
    } catch (error) {
      console.error('Error looking up account transactions:', error);
      return [];
    }
  }

  async lookupAssetTransactions(assetId: number, limit: number = 100) {
    if (!this.indexerClient) {
      throw new Error('Indexer client not initialized');
    }

    try {
      const response = await this.indexerClient
        .lookupAssetTransactions(assetId)
        .limit(limit)
        .do();
      return response.transactions;
    } catch (error) {
      console.error('Error looking up asset transactions:', error);
      return [];
    }
  }

  async searchAccounts(assetId?: number, limit: number = 100) {
    if (!this.indexerClient) {
      throw new Error('Indexer client not initialized');
    }

    try {
      let query = this.indexerClient.searchAccounts();
      if (assetId) {
        query = query.assetID(assetId);
      }
      const response = await query.limit(limit).do();
      return response.accounts;
    } catch (error) {
      console.error('Error searching accounts:', error);
      return [];
    }
  }

  async getAssetBalances(assetId: number, limit: number = 100) {
    if (!this.indexerClient) {
      throw new Error('Indexer client not initialized');
    }

    try {
      const response = await this.indexerClient
        .lookupAssetBalances(assetId)
        .limit(limit)
        .do();
      return response.balances;
    } catch (error) {
      console.error('Error getting asset balances:', error);
      return [];
    }
  }

  // ================= UTILITY FUNCTIONS =================

  async getStatus() {
    try {
      return await this.algodClient.status().do();
    } catch (error) {
      console.error('Error getting node status:', error);
      throw new Error(`Failed to get node status: ${error}`);
    }
  }

  async getBlock(round: number) {
    try {
      return await this.algodClient.block(round).do();
    } catch (error) {
      console.error('Error getting block:', error);
      throw new Error(`Failed to get block: ${error}`);
    }
  }

  async getSupply() {
    try {
      return await this.algodClient.supply().do();
    } catch (error) {
      console.error('Error getting supply:', error);
      throw new Error(`Failed to get supply: ${error}`);
    }
  }

  async checkHealth(): Promise<boolean> {
    try {
      await this.algodClient.status().do();
      return true;
    } catch (error) {
      console.error('Algorand node health check failed:', error);
      return false;
    }
  }

  decodeAddress(address: string): Uint8Array {
    return algosdk.decodeAddress(address).publicKey;
  }

  encodeAddress(publicKey: Uint8Array): string {
    return algosdk.encodeAddress(publicKey);
  }

  calculateTransactionFee(txn: any): number {
    const feePerByte = 1000;
    const estimatedSize = 200;
    return Math.max(txn.fee || 0, feePerByte * estimatedSize);
  }

  estimateTransactionSize(txn: any): number {
    return 200;
  }

  formatAddress(address: string, startChars: number = 6, endChars: number = 4): string {
    if (!address) return '';
    if (address.length <= startChars + endChars) return address;
    return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
  }

  isValidAddress(address: string): boolean {
    try {
      algosdk.decodeAddress(address);
      return true;
    } catch {
      return false;
    }
  }

  async getAssetIdFromTransaction(txId: string): Promise<string | null> {
    try {
      const indexerResult = await this.checkTransactionStatusViaIndexer(txId);
      if (indexerResult.assetId && indexerResult.assetId !== "N/A") {
        return indexerResult.assetId;
      }
      return null;
    } catch (error) {
      console.error('Error getting asset ID from transaction:', error);
      return null;
    }
  }

  async isTransactionConfirmed(txId: string): Promise<boolean> {
    try {
      const status = await this.checkTransactionStatus(txId);
      return status.confirmed;
    } catch {
      return false;
    }
  }
}

export const algorandService = new AlgorandService();
