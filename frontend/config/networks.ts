import { NetworkConfig } from '../types/blockchain';

export const NETWORKS: { [key: string]: NetworkConfig } = {
    '3131115511137': {
        chainId: 31337,
        name: 'Localhost',
        rpcUrl: 'http://127.0.0.1:8545',
        explorer: '',
        currency: 'ETH',
        currencySymbol: 'ETH',
        isTestnet: true
    },
    '11155111': {
        chainId: 11155111,
        name: 'Sepolia Testnet',
        rpcUrl: 'https://sepolia.infura.io/v3/5b14f5b4f5764ca2b2d6149096cd39e3',
        explorer: 'https://sepolia.etherscan.io',
        currency: 'ETH',
        currencySymbol: 'ETH',
        isTestnet: true
    },
    '1': {
        chainId: 1,
        name: 'Ethereum Mainnet',
        rpcUrl: 'https://mainnet.infura.io/v3/YOUR_INFURA_KEY',
        explorer: 'https://etherscan.io',
        currency: 'ETH',
        currencySymbol: 'ETH',
        isTestnet: false
    }
};

export const DEFAULT_NETWORK = NETWORKS['11155111'];
