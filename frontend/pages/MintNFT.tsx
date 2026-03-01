// pages/MintNFT.tsx
import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { quantumService } from '../services/QuantumService';

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
    console.log('Using default contract addresses');
    return {
      localhost: {
        qTokenAddress: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
        quantumNFTAddress: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512"
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

// Generate stable wallet ID from address
const getQuantumWalletId = (address: string): string => {
  if (!address) return '';
  let id = localStorage.getItem(`quantum_wallet_${address.toLowerCase()}`);
  if (!id) {
    // Generate a deterministic ID from the address
    const hash = address.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    id = `wallet_${Math.abs(hash).toString(16).substring(0, 16)}`;
    localStorage.setItem(`quantum_wallet_${address.toLowerCase()}`, id);
  }
  return id;
};

// ==================== MAIN COMPONENT ====================
const MintNFT: React.FC = () => {
  const [form, setForm] = useState({
    name: '',
    description: '',
    image: null as File | null,
    quantumHash: ''
  });
  const [preview, setPreview] = useState('');
  const [status, setStatus] = useState<{ type: 'success' | 'error' | 'info' | 'warning', message: string } | null>(null);
  const [mintedNFT, setMintedNFT] = useState<any>(null);
  const [account, setAccount] = useState('');
  const [network, setNetwork] = useState({ name: 'Sepolia', chainId: 11155111, currencySymbol: 'ETH' });
  const [mintPrice, setMintPrice] = useState('0.001');
  const [loading, setLoading] = useState({
    wallet: false,
    hash: false,
    mint: false,
    quantum: false
  });
  const [contract, setContract] = useState<ethers.Contract | null>(null);
  const [quantumNFTAddress, setQuantumNFTAddress] = useState(DEFAULT_QUANTUM_NFT_ADDRESS);
  const [quantumStatus, setQuantumStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [quantumWalletId, setQuantumWalletId] = useState<string>('');

  // Initialize
  useEffect(() => {
    init();
    const t = setTimeout(checkQuantumService, 1500);
    return () => clearTimeout(t);
  }, []);

  // Update quantum wallet ID when account changes
  useEffect(() => {
    if (account) {
      const walletId = getQuantumWalletId(account);
      setQuantumWalletId(walletId);
    } else {
      setQuantumWalletId('');
    }
  }, [account]);

  const init = async () => {
    const ethereum = (window as any).ethereum;
    if (!ethereum) {
      setStatus({ type: 'warning', message: 'Please install MetaMask to mint NFTs' });
      return;
    }

    // Setup event listeners
    ethereum.on('accountsChanged', (accounts: string[]) => {
      setAccount(accounts[0] || '');
      if (accounts[0]) {
        setupContract();
      } else {
        setContract(null);
      }
    });

    ethereum.on('chainChanged', () => {
      checkNetwork();
    });

    // Check if already connected
    try {
      const accounts = await ethereum.request({ method: 'eth_accounts' });
      if (accounts.length > 0) {
        setAccount(accounts[0]);
        await setupContract();
      }

      await checkNetwork();
    } catch (error) {
      console.error('Error initializing:', error);
    }

    // Check quantum service
    checkQuantumService();
  };

  const checkNetwork = async () => {
    const ethereum = (window as any).ethereum;
    if (!ethereum) return;

    try {
      const chainId = await ethereum.request({ method: 'eth_chainId' });
      const chainIdNum = parseInt(chainId, 16);

      if (chainIdNum === 11155111) {
        setNetwork({ name: 'Sepolia', chainId: 11155111, currencySymbol: 'ETH' });
      } else {
        setNetwork({ name: 'Unknown', chainId: chainIdNum, currencySymbol: 'ETH' });
        setStatus({ type: 'warning', message: 'Please switch to Sepolia network (Chain ID 11155111)' });
      }
    } catch (error) {
      console.error('Error checking network:', error);
    }
  };

  const checkQuantumService = async () => {
    setQuantumStatus('checking');
    const isHealthy = await quantumService.checkHealth();
    setQuantumStatus(isHealthy ? 'online' : 'offline');

    if (isHealthy) {
  console.log('✅ Quantum service connected');
    }
  };

  const connectWallet = async () => {
    const ethereum = (window as any).ethereum;
    if (!ethereum) {
      setStatus({ type: 'error', message: 'MetaMask not installed' });
      return;
    }

    try {
      setLoading({ ...loading, wallet: true });

      const chainId = await ethereum.request({ method: 'eth_chainId' });
      const currentChainId = parseInt(chainId, 16);

      if (currentChainId !== 11155111) {
        const shouldSwitch = window.confirm('Switch to Sepolia network for minting?');
        if (shouldSwitch) {
          try {
            await ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [{
                chainId: '0xaa36a7', // 11155111 in hex
                chainName: 'Sepolia',
                nativeCurrency: {
                  name: 'Ether',
                  symbol: 'ETH',
                  decimals: 18
                },
                rpcUrls: ['https://rpc.sepolia.org'],
                blockExplorerUrls: ['https://sepolia.etherscan.io']
              }]
            });
          } catch (error) {
            console.error('Error adding network:', error);
          }
        }
      }

      const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
      setAccount(accounts[0]);
      setStatus({ type: 'success', message: 'Wallet connected!' });

      await setupContract();
    } catch (error: any) {
      setStatus({ type: 'error', message: error.message || 'Failed to connect wallet' });
    } finally {
      setLoading({ ...loading, wallet: false });
    }
  };

  const setupContract = async () => {
    const ethereum = (window as any).ethereum;
    if (!ethereum) return;

    try {
      const savedAddress = localStorage.getItem('quantumNFTAddress');
      if (savedAddress) {
        setQuantumNFTAddress(savedAddress);
      }
    } catch (e) {
      console.log('No saved contract address');
    }

    if (!quantumNFTAddress) {
  setStatus({
    type: 'error',
    message: 'NFT contract not configured.'
  });
  return;
}

const provider = new ethers.BrowserProvider(ethereum);
const signer = await provider.getSigner();

const nftContract = new ethers.Contract(
  quantumNFTAddress,
  QUANTUM_NFT_ABI,
  signer
);

    try {
      const provider = new ethers.BrowserProvider(ethereum);
      const signer = await provider.getSigner();
      const nftContract = new ethers.Contract(quantumNFTAddress, QUANTUM_NFT_ABI, signer);
      setContract(nftContract);

      // Get mint price
      try {
        const price = await nftContract.mintPrice();
        setMintPrice(ethers.formatEther(price));
      } catch (error) {
        console.warn('Could not get mint price, using default');
      }
    } catch (error) {
      console.error('Error setting up contract:', error);
      setStatus({
        type: 'error',
        message: 'Failed to setup contract. Make sure contract is deployed.'
      });
    }
  };

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

    // Clear existing hash when image changes
    if (form.quantumHash) {
      setForm(prev => ({ ...prev, quantumHash: '' }));
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        // Get the full data URL including the prefix
        const base64String = reader.result as string;
        // Extract just the base64 data without the prefix
        const base64Data = base64String.split(',')[1];
        resolve(base64Data);
      };
      reader.onerror = reject;
    });
  };

  // FIXED: Generate hash using query parameters (as backend expects)
  const compressImage = (base64: string, maxSize: number = 1000): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = `data:image/jpeg;base64,${base64}`;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // Calculate new dimensions (max 100px width)
      const MAX_WIDTH = 100;
      const scale = MAX_WIDTH / img.width;
      canvas.width = MAX_WIDTH;
      canvas.height = img.height * scale;
      
      ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
      const compressedBase64 = canvas.toDataURL('image/jpeg', 0.5).split(',')[1];
      resolve(compressedBase64);
    };
    img.onerror = reject;
  });
};

// Updated generateHash with compression
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

  // pages/MintNFT.tsx - Replace your mintNFT function with this

const mintNFT = async () => {
  if (!form.name.trim() || !form.description.trim() || !form.image || !form.quantumHash) {
    setStatus({ type: 'error', message: 'Please fill all fields and generate hash' });
    return;
  }

  if (!contract) {
    setStatus({ type: 'error', message: 'Contract not loaded. Please connect wallet and deploy contract.' });
    return;
  }

  if (network.chainId !== 11155111) {
    setStatus({ type: 'error', message: 'Please switch to Sepolia network (Chain ID 11155111)' });
    return;
  }

  try {
    setLoading({ ...loading, mint: true });
    setStatus({ type: 'info', message: 'Starting mint process...' });

    // Generate token URI
    const mockCID = generateMockCID();
    const tokenURI = `ipfs://${mockCID}`;

    // Get mint price
    const mintPriceWei = ethers.parseEther(mintPrice);
    
    // Estimate gas first
    const gasEstimate = await contract.mintNFT.estimateGas(
      form.name,
      form.description,
      tokenURI,
      form.quantumHash,
      { value: mintPriceWei }
    );
    
    // Add 50% buffer for safety
    const gasLimit = (gasEstimate * 150n) / 100n;
    
    console.log('Gas estimate:', gasEstimate.toString());
    console.log('Using gas limit:', gasLimit.toString());

    // Mint NFT with estimated gas
    const tx = await contract.mintNFT(
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

    // Get token ID
    let tokenId = '0';
    try {
      const totalMinted = await contract.totalMinted();
      tokenId = (BigInt(totalMinted) - 1n).toString();
    } catch (error) {
      // Try to get token ID from events
      const event = receipt.logs.find((log: any) => 
        log.topics[0] === ethers.id("NFTMinted(uint256,address,string,string,string)")
      );
      if (event) {
        tokenId = ethers.AbiCoder.defaultAbiCoder().decode(['uint256'], event.topics[1])[0].toString();
      } else {
        tokenId = '1'; // Fallback
      }
    }

    // Get details
    let details;
    try {
      details = await contract.getNFTDetails(tokenId);
    } catch (error) {
      details = [form.name, form.description, form.quantumHash, Math.floor(Date.now() / 1000), account, true, tokenURI];
    }

    setMintedNFT({
      tokenId,
      name: details[0] || form.name,
      description: details[1] || form.description,
      quantumHash: details[2] || form.quantumHash,
      createdAt: details[3] ? new Date(Number(details[3]) * 1000).toLocaleString() : new Date().toLocaleString(),
      creator: details[4] || account,
      isVerified: details[5] || true,
      tokenURI: details[6] || tokenURI,
      transactionHash: receipt.hash,
      quantumEnhanced: quantumStatus === 'online'
    });

    setStatus({ type: 'success', message: '🎉 NFT minted successfully!' });

    // Reset form
    setForm({ name: '', description: '', image: null, quantumHash: '' });
    setPreview('');
    if (preview) URL.revokeObjectURL(preview);

  } catch (error: any) {
    console.error('Minting error:', error);
    let message = 'Minting failed';

    if (error.code === 'ACTION_REJECTED') {
      message = 'Transaction rejected by user';
    } else if (error.message?.includes('insufficient funds')) {
      message = 'Insufficient funds for transaction';
    } else if (error.message?.includes('gas')) {
      message = 'Gas estimation failed. Try increasing gas limit manually.';
    } else if (error.message?.includes('reverted')) {
      // Try to decode revert reason
      try {
        const reason = error.reason || error.message.match(/reverted: (.*?)$/)?.[1];
        if (reason) {
          message = `Contract error: ${reason}`;
        }
      } catch {
        message = 'Contract reverted transaction. Check contract deployment.';
      }
    } else if (error.message) {
      message = error.message;
    }

    setStatus({ type: 'error', message });
  } finally {
    setLoading({ ...loading, mint: false });
  }
};

  const verifyNFT = async () => {
    if (!mintedNFT || !contract) return;

    try {
      setLoading({ ...loading, hash: true });
      const isValid = await contract.verifyQuantumHash(mintedNFT.tokenId, mintedNFT.quantumHash);
      setStatus({
        type: isValid ? 'success' : 'error',
        message: isValid ? '✅ Quantum hash verified successfully!' : '❌ Verification failed'
      });
    } catch (error) {
      setStatus({ type: 'error', message: 'Verification error. Contract might not have verify function.' });
    } finally {
      setLoading({ ...loading, hash: false });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setStatus({ type: 'success', message: 'Copied to clipboard!' });
      setTimeout(() => setStatus(null), 2000);
    });
  };

  const updateContractAddress = () => {
    const newAddress = prompt('Enter new contract address:', quantumNFTAddress);
    if (newAddress && newAddress.startsWith('0x') && newAddress.length === 42) {
      setQuantumNFTAddress(newAddress);
      localStorage.setItem('quantumNFTAddress', newAddress);
      setStatus({ type: 'success', message: 'Contract address updated!' });
      setupContract();
    } else if (newAddress) {
      setStatus({ type: 'error', message: 'Invalid Ethereum address' });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-500">
            Mint Quantum NFT
          </h1>
          <p className="text-slate-400">Create quantum-resistant NFTs with post-quantum cryptography</p>

          {/* Status Bar */}
          <div className="mt-4 flex flex-wrap items-center gap-4">
            {account ? (
              <div className="flex items-center gap-2 bg-gray-800/50 px-4 py-2 rounded-lg border border-gray-700">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-mono">{formatAddress(account)}</span>
                <span className="text-xs px-2 py-1 bg-blue-500/20 text-blue-400 rounded">
                  {network.name}
                </span>
                <span className={`text-xs px-2 py-1 rounded ${quantumStatus === 'online'
                    ? 'bg-green-500/20 text-green-400'
                    : quantumStatus === 'checking'
                      ? 'bg-blue-500/20 text-blue-400 animate-pulse'
                      : 'bg-yellow-500/20 text-yellow-400'
                  }`}>
                  {quantumStatus === 'online' ? '🔐 Quantum Ready' :
                    quantumStatus === 'checking' ? '🔄 Checking...' : '⚠️ Quantum Offline'}
                </span>
              </div>
            ) : (
              <button
                onClick={connectWallet}
                disabled={loading.wallet}
                className="px-6 py-2 bg-gradient-to-r from-blue-600 to-cyan-500 rounded-lg hover:opacity-90 disabled:opacity-50 transition-all"
              >
                {loading.wallet ? 'Connecting...' : 'Connect Wallet'}
              </button>
            )}
            <div className="text-sm text-slate-300">
              Mint Price: <span className="font-semibold text-white">{formatPrice(mintPrice)}</span>
            </div>
            <button
              onClick={updateContractAddress}
              className="text-xs px-3 py-1 bg-gray-700 rounded hover:bg-gray-600 transition-colors"
              title="Update contract address"
            >
              Update Contract
            </button>
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
                <div className="text-xs text-gray-500 mt-1 text-right">
                  {form.name.length}/50
                </div>
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
                <div className="text-xs text-gray-500 mt-1 text-right">
                  {form.description.length}/500
                </div>
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
                    className="text-xs px-3 py-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded hover:opacity-90 disabled:opacity-50 transition-all flex items-center gap-1"
                  >
                    {loading.hash ? (
                      <>
                        <div className="animate-spin h-3 w-3 border-2 border-white border-t-transparent rounded-full"></div>
                        Generating...
                      </>
                    ) : (
                      <>
                        {quantumStatus === 'online' ? '🔐 Generate Quantum Hash' : '🔒 Generate Hash'}
                      </>
                    )}
                  </button>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={form.quantumHash}
                    readOnly
                    className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-lg font-mono text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Click 'Generate Hash' to create quantum-resistant hash"
                  />
                  {form.quantumHash && (
                    <div className="absolute right-3 top-3 text-purple-400">
                      🔐
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  {quantumStatus === 'online'
                    ? 'Quantum-resistant hash using post-quantum cryptography'
                    : 'Secure hash for your NFT'}
                </p>
              </div>

              {/* Mint Button */}
              <button
                onClick={mintNFT}
                disabled={loading.mint || !account || !form.quantumHash || network.chainId !== 11155111}
                className={`w-full py-3 rounded-lg font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all ${quantumStatus === 'online'
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600'
                    : 'bg-gradient-to-r from-blue-600 to-cyan-500'
                  }`}
              >
                {loading.mint ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                    Minting...
                  </span>
                ) : network.chainId !== 11155111 ? (
                  'Switch to Localhost Network'
                ) : (
                  `Mint NFT ${quantumStatus === 'online' ? '(Quantum)' : ''} (${formatPrice(mintPrice)})`
                )}
              </button>
            </div>
          </Card>

          {/* Right: Info & Minted NFT */}
          <div className="space-y-6">
            {/* Features */}
            <Card title="Quantum-Secured Features">
              <div className="grid sm:grid-cols-2 gap-4">
                {[
                  {
                    icon: '🔐',
                    title: 'Quantum Security',
                    desc: quantumStatus === 'online'
                      ? 'PQC hashing with lattice-based algorithms'
                      : 'Secure SHA3-256 hashing'
                  },
                  { icon: '⚡', title: 'Low Cost', desc: 'Optimized for minimal gas fees' },
                  { icon: '🌐', title: 'IPFS Storage', desc: 'Decentralized metadata storage' },
                  { icon: '🔍', title: 'Verifiable', desc: 'On-chain hash verification' },
                ].map((feat, i) => (
                  <div key={i} className="p-4 bg-gray-900/30 rounded-lg border border-gray-700 hover:border-purple-500/30 transition-colors">
                    <div className="text-2xl mb-2">{feat.icon}</div>
                    <h4 className="font-semibold mb-1">{feat.title}</h4>
                    <p className="text-sm text-gray-400">{feat.desc}</p>
                  </div>
                ))}
              </div>
            </Card>

            {/* Network Info */}
            <Card title="Network Information">
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400">Network:</span>
                  <span>{network.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Chain ID:</span>
                  <span>{network.chainId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Currency:</span>
                  <span>{network.currencySymbol}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Status:</span>
                  <span className={network.chainId === 11155111 ? 'text-green-400' : 'text-yellow-400'}>
                    {network.chainId === 11155111 ? '✓ Ready' : '⚠️ Switch to Sepolia'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Contract:</span>
                  <span
                    className="text-xs font-mono cursor-pointer hover:text-blue-400"
                    onClick={() => copyToClipboard(quantumNFTAddress)}
                    title="Click to copy"
                  >
                    {formatAddress(quantumNFTAddress, 4, 4)}
                  </span>
                </div>
              </div>
            </Card>

            {/* Minted NFT Display */}
            {mintedNFT && (
              <Card title="🎉 Successfully Minted!" className={`border ${mintedNFT.quantumEnhanced ? 'border-purple-500/30' : 'border-green-500/30'
                }`}>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-lg">{mintedNFT.name}</h3>
                      {mintedNFT.quantumEnhanced && (
                        <span className="text-xs px-2 py-1 bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-400 rounded">
                          🔐 Quantum Enhanced
                        </span>
                      )}
                    </div>
                    <p className="text-gray-400 text-sm mt-1">{mintedNFT.description}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <div className="text-gray-400">Token ID</div>
                      <div className="font-mono">#{mintedNFT.tokenId}</div>
                    </div>
                    <div>
                      <div className="text-gray-400">Creator</div>
                      <div
                        className="font-mono cursor-pointer hover:text-blue-400"
                        onClick={() => copyToClipboard(mintedNFT.creator)}
                        title="Click to copy"
                      >
                        {formatAddress(mintedNFT.creator)}
                      </div>
                    </div>
                  </div>

                  <div className="text-sm">
                    <div className="text-gray-400 mb-1">Quantum Hash</div>
                    <div
                      className="font-mono text-xs truncate cursor-pointer hover:text-blue-400 p-2 bg-gray-900/50 rounded"
                      onClick={() => copyToClipboard(mintedNFT.quantumHash)}
                      title="Click to copy"
                    >
                      {shortenHash(mintedNFT.quantumHash, 24)}
                    </div>
                  </div>

                  <div className="text-sm">
                    <div className="text-gray-400 mb-1">Transaction Hash</div>
                    <div
                      className="font-mono text-xs truncate cursor-pointer hover:text-blue-400 p-2 bg-gray-900/50 rounded"
                      onClick={() => copyToClipboard(mintedNFT.transactionHash)}
                      title="Click to copy"
                    >
                      {formatAddress(mintedNFT.transactionHash, 8, 8)}
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={verifyNFT}
                      disabled={loading.hash}
                      className="flex-1 py-2 bg-gradient-to-r from-green-600 to-emerald-500 text-white rounded hover:opacity-90 disabled:opacity-50 transition-all"
                    >
                      {loading.hash ? 'Verifying...' : 'Verify Hash'}
                    </button>
                    <button
                      onClick={() => setMintedNFT(null)}
                      className="flex-1 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 transition-colors"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </Card>
            )}
          </div>
        </div>

        {/* How It Works Section */}
        <div className="mt-8">
          <Card title="How It Works" subtitle="Step-by-step guide to minting quantum NFTs">
            <div className="grid md:grid-cols-4 gap-4">
              {[
                { step: '1', title: 'Connect Wallet', desc: 'Connect your MetaMask wallet to Localhost network' },
                { step: '2', title: 'Fill Details', desc: 'Enter NFT name, description, and upload image' },
                {
                  step: '3', title: quantumStatus === 'online' ? 'Generate Quantum Hash' : 'Generate Hash',
                  desc: quantumStatus === 'online'
                    ? 'Create quantum-resistant hash using PQC algorithms'
                    : 'Create secure hash for your NFT'
                },
                { step: '4', title: 'Mint NFT', desc: 'Pay minting fee and deploy NFT to blockchain' },
              ].map((item, i) => (
                <div key={i} className="text-center p-4 bg-gray-900/30 rounded-lg border border-gray-700">
                  <div className="w-10 h-10 mx-auto mb-3 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 flex items-center justify-center text-white font-bold">
                    {item.step}
                  </div>
                  <h4 className="font-bold mb-1">{item.title}</h4>
                  <p className="text-xs text-gray-400">{item.desc}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default MintNFT;
