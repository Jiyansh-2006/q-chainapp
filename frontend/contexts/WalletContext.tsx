
import React, { createContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { ethers } from 'ethers';
import { WalletState, NFT } from '../types';
import { QTOKEN_CONTRACT_ADDRESS, QTOKEN_ABI, QUANTUMID_CONTRACT_ADDRESS, QUANTUMID_ABI } from '../constants/contracts';

interface WalletContextType extends WalletState {
    loading: boolean;
    connectWallet: () => Promise<void>;
    disconnectWallet: () => void;
    refreshBalance: () => Promise<void>;
}

const defaultState: WalletState = {
    provider: null,
    signer: null,
    address: null,
    network: null,
    qTokenBalance: '0',
    nfts: [],
};

export const WalletContext = createContext<WalletContextType>({
    ...defaultState,
    loading: false,
    connectWallet: async () => { },
    disconnectWallet: () => { },
    refreshBalance: async () => { },
});

export const WalletProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [wallet, setWallet] = useState<WalletState>(defaultState);
    const [loading, setLoading] = useState<boolean>(false);

    const fetchWalletData = useCallback(async (provider: ethers.BrowserProvider, signer: ethers.JsonRpcSigner, address: string) => {
        try {
            setLoading(true);
            const network = await provider.getNetwork();

            if (network.chainId !== 11155111n) {
                alert("Please switch to Sepolia network");
                setLoading(false);
                return;
            }
            const qTokenContract = new ethers.Contract(
                QTOKEN_CONTRACT_ADDRESS,
                QTOKEN_ABI,
                provider
            );

            const rawBalance = await qTokenContract.balanceOf(address);
            const decimals = await qTokenContract.decimals();
            const qTokenBalance = ethers.formatUnits(rawBalance, decimals);

            const nfts: NFT[] = [];

            try {
                const nftContract = new ethers.Contract(
                    QUANTUMID_CONTRACT_ADDRESS,
                    QUANTUMID_ABI,
                    provider
                );

                const balance = await nftContract.balanceOf(address);

                for (let i = 0; i < Number(balance); i++) {
                    const tokenId = await nftContract.tokenOfOwnerByIndex(address, i);
                    const tokenURI = await nftContract.tokenURI(tokenId);

                    nfts.push({
                        id: tokenId.toString(),
                        name: `Quantum NFT #${tokenId}`,
                        description: "Quantum secured NFT",
                        image: tokenURI,
                    });
                }

            } catch (err) {
                console.warn("NFT fetch skipped:", err);
            }

            setWallet({
                provider,
                signer,
                address,
                network,
                qTokenBalance,
                nfts,
            });
        } catch (error) {
            console.error("Error fetching wallet data:", error);
        } finally {
            setLoading(false);
        }
    }, []);


    const connectWallet = async () => {
        // Fix: Property 'ethereum' does not exist on type 'Window & typeof globalThis'.
        if (typeof (window as any).ethereum === 'undefined') {
            alert("Please install MetaMask!");
            return;
        }

        try {
            setLoading(true);
            // Fix: Property 'ethereum' does not exist on type 'Window & typeof globalThis'.
            const provider = new ethers.BrowserProvider((window as any).ethereum);
            await provider.send("eth_requestAccounts", []);
            const signer = await provider.getSigner();
            const address = await signer.getAddress();
            await fetchWalletData(provider, signer, address);
        } catch (error) {
            console.error("Failed to connect wallet:", error);
            setLoading(false);
        }
    };

    const disconnectWallet = () => {
        setWallet(defaultState);
        // In a real app you might want to call a disconnect method from the wallet provider if available
    };

    const refreshBalance = useCallback(async () => {
        if (wallet.provider && wallet.signer && wallet.address) {
            await fetchWalletData(wallet.provider, wallet.signer, wallet.address);
        }
    }, [wallet.provider, wallet.signer, wallet.address, fetchWalletData]);


    useEffect(() => {
        const handleAccountsChanged = (accounts: string[]) => {
            if (accounts.length === 0) {
                disconnectWallet();
            } else if (wallet.address !== accounts[0]) {
                connectWallet();
            }
        };

        const handleChainChanged = () => {
            window.location.reload();
        };

        // Fix: Property 'ethereum' does not exist on type 'Window & typeof globalThis'.
        if ((window as any).ethereum) {
            (window as any).ethereum.on('accountsChanged', handleAccountsChanged);
            (window as any).ethereum.on('chainChanged', handleChainChanged);
        }

        return () => {
            // Fix: Property 'ethereum' does not exist on type 'Window & typeof globalThis'.
            if ((window as any).ethereum) {
                (window as any).ethereum.removeListener('accountsChanged', handleAccountsChanged);
                (window as any).ethereum.removeListener('chainChanged', handleChainChanged);
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [wallet.address]);

    return (
        <WalletContext.Provider value={{ ...wallet, loading, connectWallet, disconnectWallet, refreshBalance }}>
            {children}
        </WalletContext.Provider>
    );
};
