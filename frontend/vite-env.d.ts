/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_INFURA_API_KEY: string
    readonly VITE_SEPOLIA_RPC_URL: string
    readonly VITE_QUANTUM_NFT_ADDRESS: string
    // add more env variables here...
}

interface ImportMeta {
    readonly env: ImportMetaEnv
}