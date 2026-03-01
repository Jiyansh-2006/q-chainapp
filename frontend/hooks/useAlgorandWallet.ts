import { useContext } from 'react';
import { AlgorandWalletContext } from '../contexts/AlgorandWalletContext';

export const useAlgorandWallet = () => {
  const context = useContext(AlgorandWalletContext);
  
  if (!context) {
    throw new Error('useAlgorandWallet must be used within an AlgorandWalletProvider');
  }
  
  return context;
};