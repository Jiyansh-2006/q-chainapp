import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { algorandWallet } from '../services/algorandWallet';

interface AlgorandWalletContextType {
  account: string | null;
  isConnected: boolean;
  isLoading: boolean;
  networkName: string;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => Promise<void>;
  signTransaction: (txn: any) => Promise<Uint8Array>;
  signGroupedTransactions: (txns: any[]) => Promise<Uint8Array[]>;
}

export const AlgorandWalletContext = createContext<AlgorandWalletContextType | undefined>(undefined);

export const AlgorandWalletProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [account, setAccount] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [networkName, setNetworkName] = useState('TestNet');

  useEffect(() => {
    const checkConnection = async () => {
      try {
        const activeAccount = algorandWallet.getActiveAccount();
        if (activeAccount) {
          setAccount(activeAccount);
        } else {
          const reconnectedAccount = await algorandWallet.reconnectSession();
          if (reconnectedAccount) {
            setAccount(reconnectedAccount);
          }
        }
        setNetworkName(algorandWallet.getNetworkDisplayName());
      } catch (error) {
        console.error('Error checking Algorand connection:', error);
      }
    };
    
    checkConnection();
  }, []);

  const connectWallet = async () => {
    setIsLoading(true);
    try {
      const address = await algorandWallet.connect();
      setAccount(address);
      setNetworkName(algorandWallet.getNetworkDisplayName());
    } catch (error: any) {
      console.error('Error connecting to Algorand wallet:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const disconnectWallet = async () => {
    setIsLoading(true);
    try {
      await algorandWallet.disconnect();
      setAccount(null);
    } catch (error: any) {
      console.error('Error disconnecting Algorand wallet:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signTransaction = async (txn: any): Promise<Uint8Array> => {
    if (!account) {
      throw new Error("No account connected");
    }
    return await algorandWallet.signTransaction(txn);
  };

  const signGroupedTransactions = async (txns: any[]): Promise<Uint8Array[]> => {
    if (!account) {
      throw new Error("No account connected");
    }
    return await algorandWallet.signGroupedTransactions(txns);
  };

  const contextValue: AlgorandWalletContextType = {
    account,
    isConnected: !!account,
    isLoading,
    networkName,
    connectWallet,
    disconnectWallet,
    signTransaction,
    signGroupedTransactions
  };

  return (
    <AlgorandWalletContext.Provider value={contextValue}>
      {children}
    </AlgorandWalletContext.Provider>
  );
};