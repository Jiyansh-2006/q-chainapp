import { ethers } from 'ethers';
import { NetworkConfig } from '../types/blockchain';
import { NETWORKS, DEFAULT_NETWORK } from './networks';

// ==================== CONTRACT ADDRESSES ====================
export const QTOKEN_CONTRACT_ADDRESSES: Record<number, string> = {
    31337: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
    11155111: import.meta.env.VITE_QTOKEN_ADDRESS,
    1: '',
};

export const QUANTUM_NFT_CONTRACT_ADDRESSES: Record<number, string> = {
    31337: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
    11155111: import.meta.env.VITE_QUANTUM_NFT_ADDRESS, // Add your deployed contract address here
    1: '',
};

// ==================== CONTRACT ABIs ====================
export const QTOKEN_ABI = [
    "function name() view returns (string)",
    "function symbol() view returns (string)",
    "function decimals() view returns (uint8)",
    "function totalSupply() view returns (uint256)",
    "function balanceOf(address owner) view returns (uint256)",
    "function transfer(address to, uint256 amount) returns (bool)",
    "function allowance(address owner, address spender) view returns (uint256)",
    "function approve(address spender, uint256 amount) returns (bool)",
    "function transferFrom(address sender, address to, uint256 amount) returns (bool)",
    "function transferWithPQC(address to, uint256 amount) returns (bool)",
    "function pqcEnabled() view returns (bool)",
    "function setPQCStatus(bool enabled)",
    "function mint(address to, uint256 amount)",
    "function owner() view returns (address)",
    "event Transfer(address indexed from, address indexed to, uint256 value)",
    "event Approval(address indexed owner, address indexed spender, uint256 value)",
    "event PQCTransaction(address indexed from, address indexed to, uint256 amount)",
    "event PQCStatusChanged(bool enabled)"
];

export const QUANTUM_NFT_ABI = [
    // ERC721 Standard
    "function name() view returns (string)",
    "function symbol() view returns (string)",
    "function balanceOf(address owner) view returns (uint256)",
    "function ownerOf(uint256 tokenId) view returns (address)",
    "function safeTransferFrom(address from, address to, uint256 tokenId)",
    "function safeTransferFrom(address from, address to, uint256 tokenId, bytes data)",
    "function transferFrom(address from, address to, uint256 tokenId)",
    "function approve(address to, uint256 tokenId)",
    "function setApprovalForAll(address operator, bool approved)",
    "function getApproved(uint256 tokenId) view returns (address)",
    "function isApprovedForAll(address owner, address operator) view returns (bool)",
    
    // ERC721URIStorage
    "function tokenURI(uint256 tokenId) view returns (string)",
    
    // QuantumNFT Custom Functions
    "function mintNFT(string name, string description, string tokenURI, string quantumHash) payable returns (uint256)",
    "function batchMint(string[] names, string[] descriptions, string[] tokenURIs, string[] quantumHashes) payable returns (uint256[])",
    "function getNFTDetails(uint256 tokenId) view returns (string name, string description, string quantumHash, uint256 createdAt, address creator, bool isVerified, string tokenURI)",
    "function getOwnedNFTs(address owner) view returns (uint256[])",
    "function verifyQuantumHash(uint256 tokenId, string quantumHash) view returns (bool)",
    "function totalMinted() view returns (uint256)",
    "function mintPrice() view returns (uint256)",
    "function mintActive() view returns (bool)",
    "function setMintPrice(uint256 newPrice)",
    "function setMintActive(bool isActive)",
    "function withdraw()",
    
    // Events
    "event NFTMinted(uint256 indexed tokenId, address indexed owner, string name, string quantumHash, string tokenURI)",
    "event MintPriceUpdated(uint256 newPrice)",
    "event MintActiveUpdated(bool isActive)",
    "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)",
    "event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId)",
    "event ApprovalForAll(address indexed owner, address indexed operator, bool approved)"
];

// ==================== IPFS & MINTING CONFIG ====================
export const IPFS_CONFIG = {
    gateway: 'https://ipfs.io/ipfs/',
    maxFileSize: 10 * 1024 * 1024, // 10MB
    supportedFormats: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
};

export const MINTING_CONFIG = {
    defaultPrice: "0.001",
    maxBatchSize: 5,
    quantumHashLength: 32,
    maxNameLength: 50,
    maxDescriptionLength: 500,
};

// ==================== HELPER FUNCTIONS ====================
export const getNetworkConfig = (chainId: number): NetworkConfig | null => {
    return NETWORKS[chainId.toString()] || null;
};

export const getCurrentNetwork = async (): Promise<NetworkConfig | null> => {
    if (typeof window.ethereum === 'undefined') return DEFAULT_NETWORK;
    
    try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const network = await provider.getNetwork();
        return getNetworkConfig(Number(network.chainId));
    } catch {
        return DEFAULT_NETWORK;
    }
};

export const getQTokenAddress = (chainId: number): string => {
    return QTOKEN_CONTRACT_ADDRESSES[chainId] || '';
};

export const getQuantumNFTAddress = (chainId: number): string => {
    return QUANTUM_NFT_CONTRACT_ADDRESSES[chainId] || '';
};

export const getContractAddress = (chainId: number, contractType: 'qtoken' | 'quantum-nft'): string => {
    return contractType === 'qtoken' 
        ? getQTokenAddress(chainId)
        : getQuantumNFTAddress(chainId);
};

export const formatAddress = (address: string, startLength: number = 6, endLength: number = 4): string => {
    if (!address || address.length <= startLength + endLength) return address || '';
    return `${address.slice(0, startLength)}...${address.slice(-endLength)}`;
};

export const formatBalance = (balance: string | number, decimals: number = 4): string => {
    const num = typeof balance === 'string' ? parseFloat(balance) : balance;
    if (isNaN(num)) return '0';
    
    if (num < 0.0001) {
        return num.toFixed(8);
    }
    
    return num.toFixed(decimals);
};

export const formatPrice = (price: string | number): string => {
    const num = typeof price === 'string' ? parseFloat(price) : price;
    if (isNaN(num)) return '0 ETH';
    
    if (num < 0.001) {
        return `${(num * 1000).toFixed(3)} gwei`;
    }
    
    return `${num.toFixed(4)} ETH`;
};

export const shortenHash = (hash: string, length: number = 16): string => {
    if (!hash || hash.length <= length) return hash;
    return `${hash.slice(0, length / 2)}...${hash.slice(-length / 2)}`;
};

// ==================== VALIDATION FUNCTIONS ====================
export const isValidAddress = (address: string): boolean => {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
};

export const isValidNetwork = (chainId: number): boolean => {
    return chainId.toString() in NETWORKS;
};

export const isTestnet = (chainId: number): boolean => {
    const network = getNetworkConfig(chainId);
    return network ? network.isTestnet : true;
};

export const isSupportedImageFormat = (file: File): boolean => {
    return IPFS_CONFIG.supportedFormats.includes(file.type);
};

export const isFileSizeValid = (file: File): boolean => {
    return file.size <= IPFS_CONFIG.maxFileSize;
};

// ==================== NETWORK SWITCHING ====================
export const switchToNetwork = async (chainId: number): Promise<boolean> => {
    if (typeof window.ethereum === 'undefined') {
        console.error('MetaMask is not installed');
        return false;
    }

    const network = getNetworkConfig(chainId);
    if (!network) {
        console.error('Network not supported');
        return false;
    }

    try {
        await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: `0x${chainId.toString(16)}` }],
        });
        return true;
    } catch (switchError: any) {
        if (switchError.code === 4902) {
            try {
                await window.ethereum.request({
                    method: 'wallet_addEthereumChain',
                    params: [{
                        chainId: `0x${chainId.toString(16)}`,
                        chainName: network.name,
                        nativeCurrency: {
                            name: network.currency,
                            symbol: network.currencySymbol,
                            decimals: 18,
                        },
                        rpcUrls: [network.rpcUrl],
                        blockExplorerUrls: network.explorer ? [network.explorer] : [],
                    }],
                });
                return true;
            } catch (addError) {
                console.error('Failed to add network:', addError);
                return false;
            }
        }
        console.error('Failed to switch network:', switchError);
        return false;
    }
};

// ==================== CONTRACT HELPERS ====================
export const getContract = (
    contractType: 'qtoken' | 'quantum-nft', 
    signerOrProvider?: ethers.Signer | ethers.Provider
): ethers.Contract | null => {
    if (typeof window.ethereum === 'undefined') {
        console.error('Ethereum provider not found');
        return null;
    }

    try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = signerOrProvider || provider;
        
        const chainId = parseInt((window as any).ethereum.chainId, 16) || DEFAULT_NETWORK.chainId;
        let address: string;
        let abi: string[];

        if (contractType === 'qtoken') {
            address = getQTokenAddress(chainId);
            abi = QTOKEN_ABI;
        } else {
            address = getQuantumNFTAddress(chainId);
            abi = QUANTUM_NFT_ABI;
        }

        if (!address) {
            console.error(`${contractType} contract not deployed on this network`);
            return null;
        }

        return new ethers.Contract(address, abi, signer);
    } catch (error) {
        console.error('Failed to create contract instance:', error);
        return null;
    }
};

// ==================== ENVIRONMENT HELPERS ====================
export const isDevelopment = (): boolean => {
    return import.meta.env?.DEV || process.env.NODE_ENV === 'development';
};

export const getInfuraUrl = (network: string = 'sepolia'): string => {
    const apiKey = import.meta.env?.VITE_INFURA_API_KEY || '';
    return `https://${network}.infura.io/v3/${apiKey}`;
};

// Export NETWORKS for direct access
export { NETWORKS, DEFAULT_NETWORK };


