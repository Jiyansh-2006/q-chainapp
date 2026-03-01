// pages/MintNFT.tsx
import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { quantumService } from '../services/QuantumService';
import { algorandService } from "../services/algorandService";
import { useAlgorandWallet } from '../hooks/useAlgorandWallet';
import { useWallet } from '../hooks/useWallet';

// ==================== CARD COMPONENT ====================
interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
}

const Card: React.FC<CardProps> = ({ children, className = '', title, subtitle }) => {
  return (
    <div className={`bg-gray-800/50 border border-gray-700 rounded-xl p-6 shadow-lg backdrop-blur-sm ${className}`}>
      {(title || subtitle) && (
        <div className="mb-6">
          {title && <h2 className="text-xl font-bold text-white">{title}</h2>}
          {subtitle && <p className="text-gray-400 mt-1 text-sm">{subtitle}</p>}
        </div>
      )}
      {children}
    </div>
  );
};

// ==================== ALERT COMPONENT ====================
interface AlertProps {
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
  onClose?: () => void;
}

const Alert: React.FC<AlertProps> = ({ type, message, onClose }) => {
  const styles = {
    success: 'bg-green-500/10 border-green-500/30 text-green-400',
    error: 'bg-red-500/10 border-red-500/30 text-red-400',
    info: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
    warning: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400'
  };

  const icons = {
    success: '✅',
    error: '❌',
    info: 'ℹ️',
    warning: '⚠️'
  };

  return (
    <div className={`${styles[type]} border rounded-lg p-4 flex items-center justify-between`}>
      <div className="flex items-center space-x-3">
        <span className="text-lg">{icons[type]}</span>
        <span>{message}</span>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white ml-4"
        >
          ✕
        </button>
      )}
    </div>
  );
};

// ==================== CONFIGURATION ====================
const getContractAddresses = () => {
  try {
    const config = require('../config/contract-addresses.json');
    return config;
  } catch (error) {
    console.log('Contract addresses file not found, using environment variables');
    return {
      localhost: {
        qTokenAddress: import.meta.env.VITE_QTOKEN_ADDRESS || "0x5FbDB2315678afecb367f032d93F642f64180aa3",
        quantumNFTAddress: import.meta.env.VITE_QUANTUM_NFT_ADDRESS || "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512"
      },
      sepolia: {
        qTokenAddress: import.meta.env.VITE_QTOKEN_ADDRESS || "0x5FbDB2315678afecb367f032d93F642f64180aa3",
        quantumNFTAddress: import.meta.env.VITE_QUANTUM_NFT_ADDRESS || "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512"
      }
    };
  }
};

const CONTRACT_ADDRESSES = getContractAddresses();

// QuantumNFT ABI
const QUANTUM_NFT_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function balanceOf(address owner) view returns (uint256)",
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function tokenURI(uint256 tokenId) view returns (string)",
  "function mintNFT(string memory name, string memory description, string memory tokenURI, string memory quantumHash) payable returns (uint256)",
  "function getNFTDetails(uint256 tokenId) view returns (string memory name, string memory description, string memory quantumHash, uint256 createdAt, address creator, bool isVerified, string memory uri)",
  "function verifyQuantumHash(uint256 tokenId, string memory quantumHash) view returns (bool)",
  "function totalMinted() view returns (uint256)",
  "function mintPrice() view returns (uint256)",
  "function mintActive() view returns (bool)",
  "event NFTMinted(uint256 indexed tokenId, address indexed owner, string name, string quantumHash, string tokenURI)"
];

const DEFAULT_QUANTUM_NFT_ADDRESS = import.meta.env.VITE_QUANTUM_NFT_ADDRESS;

// ==================== UTILITY FUNCTIONS ====================
const formatAddress = (address: string, startLength: number = 6, endLength: number = 4): string => {
  if (!address || address.length <= startLength + endLength) return address || '';
  return `${address.slice(0, startLength)}...${address.slice(-endLength)}`;
};

const formatPrice = (price: string | number): string => {
  const num = typeof price === 'string' ? parseFloat(price) : price;
  if (isNaN(num)) return '0 ETH';
  return `${num.toFixed(4)} ETH`;
};

const shortenHash = (hash: string, length: number = 16): string => {
  if (!hash || hash.length <= length) return hash;
  return `${hash.slice(0, length / 2)}...${hash.slice(-length / 2)}`;
};

const isSupportedImageFormat = (file: File): boolean => {
  const supported = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
  return supported.includes(file.type);
};

const isFileSizeValid = (file: File): boolean => {
  return file.size <= 10 * 1024 * 1024; // 10MB
};

const generateMockCID = () => {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let cid = 'Qm';
  for (let i = 0; i < 44; i++) {
    cid += chars[Math.floor(Math.random() * chars.length)];
  }
  return cid;
};

// ==================== MAIN COMPONENT ====================
const MintNFT: React.FC = () => {
  // ========== HOOKS ==========
  const { 
    address: ethAccount, 
    isConnected: isEthConnected, 
    network: ethNetwork,
    balance: ethBalance,
    connectWallet: connectEthWallet,
    isLoading: ethLoading
  } = useWallet();

  const { 
    account: algoAccount, 
    isConnected: isAlgoConnected, 
    isLoading: algoLoading,
    connectWallet: connectAlgoWallet,
    disconnectWallet: disconnectAlgoWallet,
    signTransaction: signAlgoTransaction
  } = useAlgorandWallet();

  // ========== STATE ==========
  const [form, setForm] = useState({
    name: '',
    description: '',
    image: null as File | null,
    quantumHash: ''
  });
  const [preview, setPreview] = useState('');
  const [status, setStatus] = useState<{ type: 'success' | 'error' | 'info' | 'warning', message: string } | null>(null);
  const [mintedNFT, setMintedNFT] = useState<any>(null);
  const [ethContract, setEthContract] = useState<ethers.Contract | null>(null);
  const [quantumNFTAddress, setQuantumNFTAddress] = useState(DEFAULT_QUANTUM_NFT_ADDRESS || '');
  const [quantumStatus, setQuantumStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [selectedChain, setSelectedChain] = useState<"ethereum" | "algorand">("ethereum");
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualAddress, setManualAddress] = useState('');
  const [algoBalance, setAlgoBalance] = useState<number | null>(null);
  const [mintPrice, setMintPrice] = useState('0.001');
  const [loading, setLoading] = useState({
    wallet: false,
    hash: false,
    mint: false
  });
  const [pendingTxId, setPendingTxId] = useState<string | null>(null);
  const [pendingNFT, setPendingNFT] = useState<any>(null);
  const [checkInterval, setCheckInterval] = useState<NodeJS.Timeout | null>(null);

  // ========== EFFECTS ==========
  useEffect(() => {
    checkQuantumService();
    setupEthContract();
    
    // Clean up interval on unmount
    return () => {
      if (checkInterval) {
        clearInterval(checkInterval);
      }
    };
  }, []);

  useEffect(() => {
    if (ethAccount) {
      setupEthContract();
    }
  }, [ethAccount]);

  useEffect(() => {
    if (algoAccount) {
      fetchAlgoBalance();
    }
  }, [algoAccount]);

  // ========== PENDING TRANSACTION CHECKER ==========
  useEffect(() => {
    if (pendingTxId && selectedChain === 'algorand') {
      console.log(`🔍 Starting to monitor transaction: ${pendingTxId}`);
      
      // Clear any existing interval
      if (checkInterval) {
        clearInterval(checkInterval);
      }
      
      // Set up new interval to check every 3 seconds
      const interval = setInterval(async () => {
        try {
          console.log(`🔄 Checking transaction: ${pendingTxId}`);
          
          // Try multiple methods to check status
          
          // Method 1: Use checkTransactionStatus
          const status = await algorandService.checkTransactionStatus(pendingTxId);
          console.log("Status check result:", status);
          
          if (status?.confirmed) {
            console.log("✅ Transaction confirmed via checkTransactionStatus!");
            
            // Get asset ID
            let assetId = status.assetId || "N/A";
            
            // If still N/A, try to get from indexer
            if (assetId === "N/A") {
              try {
                const fetchedAssetId = await algorandService.getAssetIdFromTransaction(pendingTxId);
                if (fetchedAssetId) {
                  assetId = fetchedAssetId;
                  console.log("✅ Asset ID fetched from indexer:", assetId);
                }
              } catch (e) {
                console.error("Failed to fetch asset ID:", e);
              }
            }
            
            // Update the UI
            if (pendingNFT) {
              setMintedNFT({
                ...pendingNFT,
                tokenId: assetId,
                isVerified: true,
                status: 'completed',
                explorerUrl: assetId !== "N/A" 
                  ? `https://lora.algokit.io/testnet/asset/${assetId}`
                  : `https://lora.algokit.io/testnet/transaction/${pendingTxId}`
              });
            }
            
            setStatus({ 
              type: "success", 
              message: assetId !== "N/A" 
                ? `🎉 NFT minted successfully! Asset ID: ${assetId}` 
                : "🎉 NFT minted successfully! Check explorer for details."
            });
            
            // Clear monitoring state
            setPendingTxId(null);
            setPendingNFT(null);
            clearInterval(interval);
            setCheckInterval(null);
            
            // Refresh balance
            setTimeout(fetchAlgoBalance, 2000);
            return;
          }
          
          // Method 2: Try direct indexer check
          const indexerStatus = await algorandService.checkTransactionStatusViaIndexer(pendingTxId);
          if (indexerStatus && indexerStatus.confirmed === true) {
            console.log("✅ Transaction confirmed via indexer!");
            
            let assetId = indexerStatus.assetId || "N/A";
            
            if (pendingNFT) {
              setMintedNFT({
                ...pendingNFT,
                tokenId: assetId,
                isVerified: true,
                status: 'completed',
                explorerUrl: assetId !== "N/A" 
                  ? `https://lora.algokit.io/testnet/asset/${assetId}`
                  : `https://lora.algokit.io/testnet/transaction/${pendingTxId}`
              });
            }
            
            setStatus({ type: "success", message: `🎉 NFT minted successfully! Asset ID: ${assetId}` });
            
            setPendingTxId(null);
            setPendingNFT(null);
            clearInterval(interval);
            setCheckInterval(null);
            setTimeout(fetchAlgoBalance, 2000);
            return;
          }
          
          console.log("⏳ Still checking for confirmation...");
          
        } catch (error) {
          console.error("Error checking transaction:", error);
        }
      }, 5000); // Check every 5 seconds
      
      setCheckInterval(interval);
    }
    
    return () => {
      if (checkInterval) {
        clearInterval(checkInterval);
      }
    };
  }, [pendingTxId, selectedChain, pendingNFT]);

  
  // ========== ETHEREUM FUNCTIONS ==========
  const setupEthContract = async () => {
    if (!window.ethereum || !ethAccount) return;

    try {
      const savedAddress = localStorage.getItem('quantumNFTAddress');
      if (savedAddress && savedAddress !== 'undefined' && savedAddress !== 'null' && savedAddress.length === 42) {
        setQuantumNFTAddress(savedAddress);
      } else {
        const addresses = getContractAddresses();
        const address = addresses.sepolia?.quantumNFTAddress || 
                       addresses.localhost?.quantumNFTAddress ||
                       import.meta.env.VITE_QUANTUM_NFT_ADDRESS;
        
        if (address && address.length === 42) {
          setQuantumNFTAddress(address);
          localStorage.setItem('quantumNFTAddress', address);
        }
      }
    } catch (e) {
      console.log('Error loading contract address:', e);
    }

    if (!quantumNFTAddress || quantumNFTAddress.length !== 42) {
      setStatus({
        type: 'error',
        message: 'NFT contract not configured. Please set contract address using the "Update Contract" button.'
      });
      return;
    }

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const nftContract = new ethers.Contract(quantumNFTAddress, QUANTUM_NFT_ABI, signer);
      setEthContract(nftContract);

      try {
        const name = await nftContract.name();
        console.log('Contract loaded:', name);
        
        try {
          const price = await nftContract.mintPrice();
          setMintPrice(ethers.formatEther(price));
        } catch (error) {
          console.warn('Could not get mint price, using default');
        }
        
        setStatus({ type: 'success', message: 'Contract loaded successfully!' });
        setTimeout(() => setStatus(null), 3000);
      } catch (error) {
        setStatus({
          type: 'error',
          message: 'Contract exists but may not be the right type. Check address.'
        });
      }
    } catch (error) {
      console.error('Error setting up contract:', error);
      setStatus({
        type: 'error',
        message: 'Failed to setup contract. Make sure contract is deployed at: ' + quantumNFTAddress
      });
    }
  };

  // ========== ALGORAND FUNCTIONS ==========
  const fetchAlgoBalance = async () => {
    if (algoAccount) {
      try {
        const balance = await algorandService.getBalance(algoAccount);
        setAlgoBalance(balance);
      } catch (error) {
        console.error("Error fetching balance:", error);
      }
    }
  };

  // ========== QUANTUM SERVICE ==========
  const checkQuantumService = async () => {
    setQuantumStatus('checking');
    try {
      const isHealthy = await quantumService.checkHealth();
      setQuantumStatus(isHealthy ? 'online' : 'offline');
      if (isHealthy) {
        console.log('✅ Quantum service connected');
      }
    } catch (error) {
      setQuantumStatus('offline');
      console.error('Quantum service error:', error);
    }
  };

  // ========== FILE HANDLING ==========
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!isSupportedImageFormat(file)) {
      setStatus({ type: 'error', message: 'Unsupported file format. Use JPEG, PNG, GIF, WebP, or SVG' });
      return;
    }

    if (!isFileSizeValid(file)) {
      setStatus({ type: 'error', message: 'File too large (max 10MB)' });
      return;
    }

    setForm({ ...form, image: file });
    const url = URL.createObjectURL(file);
    setPreview(url);

    if (form.quantumHash) {
      setForm(prev => ({ ...prev, quantumHash: '' }));
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64String = reader.result as string;
        const base64Data = base64String.split(',')[1];
        resolve(base64Data);
      };
      reader.onerror = reject;
    });
  };

  // ========== QUANTUM HASH GENERATION ==========
  const generateHash = async () => {
    if (!form.image) {
      setStatus({ type: 'error', message: 'Please select an image first' });
      return;
    }

    if (!form.name.trim() || !form.description.trim()) {
      setStatus({ type: 'error', message: 'Fill name and description' });
      return;
    }

    try {
      setLoading(prev => ({ ...prev, hash: true }));
      setStatus({ type: 'info', message: 'Generating quantum hash...' });

      const base64Data = await fileToBase64(form.image);

      const response = await fetch(
        "https://qchain-quantum-pqc-backend.onrender.com/generate-hash",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json"
          },
          body: JSON.stringify({
            image_data: base64Data,
            name: form.name.trim(),
            description: form.description.trim()
          })
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText);
      }

      const data = await response.json();

      if (!data.quantum_hash) {
        throw new Error("Invalid response from backend");
      }

      setForm(prev => ({
        ...prev,
        quantumHash: data.quantum_hash
      }));

      setQuantumStatus('online');
      setStatus({ type: 'success', message: '✅ Quantum hash generated!' });

    } catch (err: any) {
      console.error("Hash error:", err);
      setQuantumStatus('offline');
      setStatus({ type: 'error', message: err.message || 'Hash generation failed' });
    } finally {
      setLoading(prev => ({ ...prev, hash: false }));
    }
  };

  // ========== ETHEREUM MINTING ==========
  const mintEthereumNFT = async () => {
    if (!form.name.trim() || !form.description.trim() || !form.image || !form.quantumHash) {
      setStatus({ type: 'error', message: 'Please fill all fields and generate hash' });
      return;
    }

    if (!ethContract) {
      setStatus({ type: 'error', message: 'Contract not loaded. Please connect wallet and set contract address.' });
      return;
    }

    if (ethNetwork?.chainId !== 11155111) {
      setStatus({ type: 'error', message: 'Please switch to Sepolia network (Chain ID 11155111)' });
      return;
    }

    try {
      setLoading({ ...loading, mint: true });
      setStatus({ type: 'info', message: 'Starting Ethereum mint process...' });

      const mockCID = generateMockCID();
      const tokenURI = `ipfs://${mockCID}`;

      const mintPriceWei = ethers.parseEther(mintPrice);
      
      const gasEstimate = await ethContract.mintNFT.estimateGas(
        form.name,
        form.description,
        tokenURI,
        form.quantumHash,
        { value: mintPriceWei }
      );
      
      const gasLimit = (gasEstimate * 150n) / 100n;

      const tx = await ethContract.mintNFT(
        form.name,
        form.description,
        tokenURI,
        form.quantumHash,
        {
          value: mintPriceWei,
          gasLimit: gasLimit
        }
      );

      setStatus({ type: 'info', message: 'Transaction submitted. Waiting for confirmation...' });
      const receipt = await tx.wait();

      let tokenId = '0';
      try {
        const totalMinted = await ethContract.totalMinted();
        tokenId = (BigInt(totalMinted) - 1n).toString();
      } catch (error) {
        const event = receipt.logs.find((log: any) => 
          log.topics[0] === ethers.id("NFTMinted(uint256,address,string,string,string)")
        );
        if (event) {
          tokenId = ethers.AbiCoder.defaultAbiCoder().decode(['uint256'], event.topics[1])[0].toString();
        } else {
          tokenId = '1';
        }
      }

      setMintedNFT({
        tokenId,
        name: form.name,
        description: form.description,
        quantumHash: form.quantumHash,
        createdAt: new Date().toLocaleString(),
        creator: ethAccount,
        isVerified: true,
        transactionHash: receipt.hash,
        quantumEnhanced: quantumStatus === 'online',
        network: 'Ethereum',
        explorerUrl: `https://sepolia.etherscan.io/tx/${receipt.hash}`,
        status: 'completed'
      });

      setStatus({ type: 'success', message: '🎉 Ethereum NFT minted successfully!' });

      setForm({ name: '', description: '', image: null, quantumHash: '' });
      setPreview('');
      if (preview) URL.revokeObjectURL(preview);

    } catch (error: any) {
      console.error('Minting error:', error);
      let message = 'Minting failed';
      let statusType = 'error';

      if (error.code === 'ACTION_REJECTED') {
        message = 'Transaction cancelled by user';
        statusType = 'warning';
      } else if (error.message?.includes('insufficient funds')) {
        message = 'Insufficient funds for transaction';
      } else if (error.message?.includes('gas')) {
        message = 'Gas estimation failed. Try increasing gas limit manually.';
      } else if (error.message?.includes('reverted')) {
        message = 'Contract reverted transaction. Check contract deployment.';
      } else if (error.message) {
        message = error.message;
      }

      setStatus({ type: statusType as any, message });
    } finally {
      setLoading({ ...loading, mint: false });
    }
  };

  // ========== ALGORAND MINTING (FIXED - NO PENDING) ==========
  const mintAlgorandNFT = async () => {
    if (!algoAccount) {
      setStatus({ type: "error", message: "Connect Algorand wallet first" });
      return;
    }

    if (!form.name || !form.quantumHash) {
      setStatus({ type: "error", message: "Generate quantum hash first" });
      return;
    }

    try {
      setLoading({ ...loading, mint: true });
      setStatus({ type: "info", message: "Creating Algorand transaction..." });

      const txn = await algorandService.createNFTTransaction(
        algoAccount,
        form.name,
        form.quantumHash
      );

      setStatus({ type: "info", message: "Please sign in Pera Wallet..." });

      const signedTxn = await signAlgoTransaction(txn);

      setStatus({ type: "info", message: "Submitting to Algorand network..." });

      const response = await algorandService.sendTransaction(signedTxn);
      const txId = response.txId;

      console.log("✅ Transaction sent with ID:", txId);

      setStatus({ 
        type: "success", 
        message: `Transaction submitted! ID: ${txId}. The page will update when confirmed.` 
      });

      // Set up monitoring for confirmation
      setPendingTxId(txId);
      
      // Don't set a pending NFT - we'll wait for confirmation to show it
      // Instead, just store the data to use when confirmed
      setPendingNFT({
        name: form.name,
        description: form.description,
        quantumHash: form.quantumHash,
        creator: algoAccount,
        quantumEnhanced: quantumStatus === 'online',
        network: 'Algorand',
        transactionHash: txId
      });

      // Don't set mintedNFT yet - wait for confirmation

    } catch (error: any) {
      console.error("Algorand minting error:", error);
      
      let message = "Algorand mint failed";
      let type = "error";
      
      if (error.message.includes('overspend') || error.message.includes('insufficient')) {
        message = "Insufficient funds for transaction. Please get test ALGO from faucet.";
      } else if (error.message.includes('cancelled')) {
        message = "Transaction cancelled by user";
        type = "warning";
      } else {
        message = error.message || "Algorand mint failed. Please try again.";
      }
      
      setStatus({ type: type as any, message });
    } finally {
      setLoading({ ...loading, mint: false });
    }
  };

  // ========== UTILITY FUNCTIONS ==========
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setStatus({ type: 'success', message: 'Copied to clipboard!' });
      setTimeout(() => setStatus(null), 2000);
    });
  };

  const updateContractAddress = () => {
    setShowManualInput(true);
    setManualAddress(quantumNFTAddress || '');
  };

  const saveManualAddress = () => {
    if (manualAddress && manualAddress.startsWith('0x') && manualAddress.length === 42) {
      setQuantumNFTAddress(manualAddress);
      localStorage.setItem('quantumNFTAddress', manualAddress);
      setShowManualInput(false);
      setStatus({ type: 'success', message: 'Contract address updated!' });
      setupEthContract();
    } else {
      setStatus({ type: 'error', message: 'Invalid Ethereum address' });
    }
  };

  const checkTransactionNow = async () => {
    if (pendingTxId) {
      setStatus({ type: "info", message: "Checking transaction status..." });
      
      try {
        // Try multiple methods
        const status = await algorandService.checkTransactionStatus(pendingTxId);
        
        if (status && status.confirmed) {
          let assetId = status.assetId || "N/A";
          
          if (assetId === "N/A") {
            const fetchedAssetId = await algorandService.getAssetIdFromTransaction(pendingTxId);
            if (fetchedAssetId) assetId = fetchedAssetId;
          }
          
          if (pendingNFT) {
            setMintedNFT({
              ...pendingNFT,
              tokenId: assetId,
              isVerified: true,
              status: 'completed',
              explorerUrl: assetId !== "N/A" 
                ? `https://lora.algokit.io/testnet/asset/${assetId}`
                : `https://lora.algokit.io/testnet/transaction/${pendingTxId}`
            });
          }
          
          setStatus({ type: "success", message: `✅ NFT minted successfully! Asset ID: ${assetId}` });
          setPendingTxId(null);
          setPendingNFT(null);
          
          if (checkInterval) {
            clearInterval(checkInterval);
            setCheckInterval(null);
          }

          // Reset form
          setForm({ name: '', description: '', image: null, quantumHash: '' });
          setPreview('');
          if (preview) URL.revokeObjectURL(preview);
          
        } else {
          setStatus({ type: "info", message: "Transaction still processing. Will continue checking." });
        }
      } catch (error) {
        console.error("Manual check error:", error);
        setStatus({ type: "error", message: "Error checking transaction status." });
      }
    }
  };

  // ========== RENDER UI ==========
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-500">
            Mint Quantum NFT
          </h1>
          <p className="text-slate-400">Create quantum-resistant NFTs on Ethereum or Algorand</p>

          {/* Chain Toggle */}
          <div className="flex gap-3 mt-4">
            <button
              onClick={() => setSelectedChain("ethereum")}
              className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                selectedChain === "ethereum"
                  ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white"
                  : "bg-gray-700 text-gray-300 hover:bg-gray-600"
              }`}
            >
              🟣 Ethereum (Sepolia)
            </button>
            <button
              onClick={() => setSelectedChain("algorand")}
              className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                selectedChain === "algorand"
                  ? "bg-gradient-to-r from-green-600 to-emerald-500 text-white"
                  : "bg-gray-700 text-gray-300 hover:bg-gray-600"
              }`}
            >
              🟢 Algorand (TestNet)
            </button>
          </div>

          {/* Wallet Connection Status */}
          <div className="mt-4 flex flex-wrap items-center gap-4">
            {selectedChain === "ethereum" ? (
              ethAccount ? (
                <div className="flex items-center gap-2 bg-gray-800/50 px-4 py-2 rounded-lg border border-purple-500/30">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-mono">{formatAddress(ethAccount)}</span>
                  <span className="text-xs px-2 py-1 bg-purple-500/20 text-purple-400 rounded">
                    Sepolia
                  </span>
                  <span className="text-xs text-gray-400">
                    {parseFloat(ethBalance?.native || '0').toFixed(4)} ETH
                  </span>
                </div>
              ) : (
                <button
                  onClick={connectEthWallet}
                  disabled={ethLoading}
                  className="px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg hover:opacity-90 disabled:opacity-50 transition-all"
                >
                  {ethLoading ? 'Connecting...' : 'Connect MetaMask'}
                </button>
              )
            ) : (
              algoAccount ? (
                <div className="bg-gray-800/50 px-4 py-2 rounded-lg border border-green-500/30">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-sm font-mono">{formatAddress(algoAccount)}</span>
                    <span className="text-xs px-2 py-1 bg-green-500/20 text-green-400 rounded">
                      TestNet
                    </span>
                    <button
                      onClick={disconnectAlgoWallet}
                      className="text-xs px-2 py-1 bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 ml-2"
                    >
                      Disconnect
                    </button>
                  </div>
                  {algoBalance !== null && (
                    <div className="mt-2 text-xs flex items-center justify-between">
                      <span className="text-gray-400">Balance:</span>
                      <span className={algoBalance < 0.1 ? 'text-red-400 font-medium' : 'text-green-400 font-medium'}>
                        {algoBalance.toFixed(4)} ALGO
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={connectAlgoWallet}
                  disabled={algoLoading}
                  className="px-6 py-2 bg-gradient-to-r from-green-600 to-emerald-500 rounded-lg hover:opacity-90 disabled:opacity-50 transition-all"
                >
                  {algoLoading ? 'Connecting...' : 'Connect Pera Wallet'}
                </button>
              )
            )}
            
            {selectedChain === "ethereum" && (
              <>
                <div className="text-sm text-slate-300">
                  Mint Price: <span className="font-semibold text-white">{formatPrice(mintPrice)}</span>
                </div>
                <button
                  onClick={updateContractAddress}
                  className="text-xs px-3 py-1 bg-gray-700 rounded hover:bg-gray-600 transition-colors"
                >
                  Update Contract
                </button>
              </>
            )}
          </div>

          {/* Manual Contract Input */}
          {showManualInput && selectedChain === "ethereum" && (
            <div className="mt-4 p-4 bg-gray-800 rounded-lg border border-gray-700">
              <label className="block text-sm font-medium mb-2">Enter Contract Address</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={manualAddress}
                  onChange={(e) => setManualAddress(e.target.value)}
                  placeholder="0x..."
                  className="flex-1 px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white font-mono text-sm"
                />
                <button
                  onClick={saveManualAddress}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Save
                </button>
                <button
                  onClick={() => setShowManualInput(false)}
                  className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Quantum Status */}
          <div className="mt-4">
            <span className={`text-xs px-3 py-1 rounded-full ${
              quantumStatus === 'online'
                ? 'bg-green-500/20 text-green-400'
                : quantumStatus === 'checking'
                  ? 'bg-blue-500/20 text-blue-400 animate-pulse'
                  : 'bg-yellow-500/20 text-yellow-400'
            }`}>
              {quantumStatus === 'online' ? '🔐 Quantum Ready' :
               quantumStatus === 'checking' ? '🔄 Checking Quantum Service...' : '⚠️ Quantum Service Offline'}
            </span>
          </div>
        </div>

        {/* Status Alert */}
        {status && (
          <div className="mb-6">
            <Alert
              type={status.type}
              message={status.message}
              onClose={() => setStatus(null)}
            />
          </div>
        )}

        {/* Transaction Monitoring Status - Only shown when transaction is being processed */}
        {pendingTxId && !mintedNFT && (
          <div className="mb-4 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="animate-spin h-4 w-4 border-2 border-blue-400 border-t-transparent rounded-full"></div>
                <span className="text-blue-400">
                  Processing your transaction - checking every 5 seconds
                </span>
              </div>
              <button
                onClick={checkTransactionNow}
                className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-lg"
              >
                Check Now
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Transaction ID: {pendingTxId.substring(0, 20)}...
            </p>
          </div>
        )}

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left: Mint Form */}
          <Card title="Create Your Quantum NFT" subtitle="Fill in all required fields to mint your NFT">
            <div className="space-y-6">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium mb-2">NFT Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="My Quantum NFT"
                  maxLength={50}
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium mb-2">Description *</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                  rows={3}
                  placeholder="Describe your NFT..."
                  maxLength={500}
                />
              </div>

              {/* Image Upload */}
              <div>
                <label className="block text-sm font-medium mb-2">Image *</label>
                <div
                  className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all
                    ${preview ? 'border-green-500' : 'border-gray-700 hover:border-purple-500'}`}
                  onClick={() => document.getElementById('fileInput')?.click()}
                >
                  <input
                    id="fileInput"
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  {preview ? (
                    <div>
                      <img
                        src={preview}
                        alt="Preview"
                        className="max-h-48 mx-auto rounded-lg mb-2 object-cover"
                      />
                      <p className="text-sm text-green-400">Click to change image</p>
                    </div>
                  ) : (
                    <div>
                      <div className="text-4xl mb-2">🖼️</div>
                      <p className="text-gray-400">Click to upload image</p>
                      <p className="text-xs text-gray-500 mt-1">
                        PNG, JPG, GIF, WebP, SVG • Max 10MB
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Quantum Hash */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium">Quantum Hash *</label>
                  <button
                    type="button"
                    onClick={generateHash}
                    disabled={!form.image || !form.name || !form.description || loading.hash}
                    className="text-xs px-3 py-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded hover:opacity-90 disabled:opacity-50 transition-all"
                  >
                    {loading.hash ? 'Generating...' : 'Generate Quantum Hash'}
                  </button>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={form.quantumHash}
                    readOnly
                    className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-lg font-mono text-sm"
                    placeholder="Click 'Generate Quantum Hash' to create hash"
                  />
                  {form.quantumHash && (
                    <div className="absolute right-3 top-3 text-purple-400">🔐</div>
                  )}
                </div>
              </div>

              {/* Mint Button */}
              <button
                onClick={selectedChain === "ethereum" ? mintEthereumNFT : mintAlgorandNFT}
                disabled={
                  (selectedChain === "ethereum"
                    ? loading.mint || !ethAccount || !form.quantumHash
                    : loading.mint || !algoAccount || !form.quantumHash) || loading.hash
                }
                className={`w-full py-3 rounded-lg font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all ${
                  selectedChain === "ethereum"
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600'
                    : 'bg-gradient-to-r from-green-600 to-emerald-500'
                }`}
              >
                {loading.mint ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                    Minting...
                  </span>
                ) : (
                  `Mint on ${selectedChain === 'ethereum' ? 'Ethereum' : 'Algorand'}`
                )}
              </button>
            </div>
          </Card>

          {/* Right: Info & Minted NFT */}
          <div className="space-y-6">
            {/* Network Info */}
            <Card title="Network Information">
              <div className="space-y-3">
                {selectedChain === "ethereum" ? (
                  <>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Network:</span>
                      <span className="text-purple-400">Sepolia Testnet</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Chain ID:</span>
                      <span>11155111</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Currency:</span>
                      <span>ETH</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Status:</span>
                      <span className={ethAccount ? 'text-green-400' : 'text-yellow-400'}>
                        {ethAccount ? '✓ Connected' : '⚠️ Not Connected'}
                      </span>
                    </div>
                    {quantumNFTAddress && (
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">Contract:</span>
                        <span
                          className="text-xs font-mono cursor-pointer hover:text-blue-400"
                          onClick={() => copyToClipboard(quantumNFTAddress)}
                        >
                          {formatAddress(quantumNFTAddress, 4, 4)}
                        </span>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Network:</span>
                      <span className="text-green-400">Algorand TestNet</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Currency:</span>
                      <span>ALGO</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Status:</span>
                      <span className={algoAccount ? 'text-green-400' : 'text-yellow-400'}>
                        {algoAccount ? '✓ Connected' : '⚠️ Not Connected'}
                      </span>
                    </div>
                    {algoBalance !== null && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Balance:</span>
                        <span className={algoBalance < 0.1 ? 'text-red-400' : 'text-green-400'}>
                          {algoBalance.toFixed(4)} ALGO
                        </span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </Card>

            {/* Features */}
            <Card title="Quantum-Secured Features">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-gray-900/30 rounded-lg">
                  <div className="text-2xl mb-2">🔐</div>
                  <h4 className="font-semibold text-sm mb-1">Quantum Security</h4>
                  <p className="text-xs text-gray-400">PQC hashing with lattice-based algorithms</p>
                </div>
                <div className="p-3 bg-gray-900/30 rounded-lg">
                  <div className="text-2xl mb-2">⚡</div>
                  <h4 className="font-semibold text-sm mb-1">Low Cost</h4>
                  <p className="text-xs text-gray-400">
                    {selectedChain === 'algorand' ? 'Micro-transaction fees on Algorand' : 'Optimized gas fees'}
                  </p>
                </div>
              </div>
            </Card>

            {/* Minted NFT Display - Only shown when minted successfully */}
            {mintedNFT && (
              <Card title={`🎉 Minted on ${mintedNFT.network}!`}>
                <div className="space-y-4">
                  <div>
                    <h3 className="font-bold text-lg">{mintedNFT.name}</h3>
                    <p className="text-gray-400 text-sm mt-1">{mintedNFT.description}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <div className="text-gray-400">
                        {mintedNFT.network === 'Algorand' ? 'Asset ID' : 'Token ID'}
                      </div>
                      <div className="font-mono">#{mintedNFT.tokenId}</div>
                    </div>
                    <div>
                      <div className="text-gray-400">Creator</div>
                      <div className="font-mono text-xs">{formatAddress(mintedNFT.creator)}</div>
                    </div>
                  </div>

                  <div className="text-sm">
                    <div className="text-gray-400 mb-1">Quantum Hash</div>
                    <div className="font-mono text-xs truncate bg-gray-900/50 p-2 rounded">
                      {shortenHash(mintedNFT.quantumHash, 24)}
                    </div>
                  </div>

                  {mintedNFT.explorerUrl && (
                    <a
                      href={mintedNFT.explorerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-center bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg transition-all"
                    >
                      View on Explorer
                    </a>
                  )}

                  <button
                    onClick={() => setMintedNFT(null)}
                    className="w-full py-2 bg-gray-700 text-white rounded hover:bg-gray-600"
                  >
                    Close
                  </button>
                </div>
              </Card>
            )}

            {/* No pending state - either we show minted NFT or nothing */}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MintNFT;
