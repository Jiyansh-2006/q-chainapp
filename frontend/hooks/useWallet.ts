import { useState, useEffect } from 'react';
import { ethers } from 'ethers';

/* ================= CONFIG ================= */

// 🔥 PUT YOUR REAL SEPOLIA CONTRACT HERE
const SEPOLIA_QTOKEN_ADDRESS = import.meta.env.VITE_QTOKEN_ADDRESS;

const QTOKEN_ABI = [
    "function balanceOf(address) view returns (uint256)",
    "function decimals() view returns (uint8)",
    "function transfer(address to, uint256 amount) returns (bool)",
];

/* ================= HOOK ================= */

export const useWallet = () => {

    const [address, setAddress] = useState<string>('');
    const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
    const [signer, setSigner] = useState<ethers.Signer | null>(null);
    const [network, setNetwork] = useState<any>(null);
    const [balance, setBalance] = useState({
        native: '0',
        qToken: '0'
    });

    const [isConnected, setIsConnected] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string>('');


    /* ================= CONNECT WALLET ================= */

    const connectWallet = async (): Promise<boolean> => {
        if (!window.ethereum) {
            setError("MetaMask not installed");
            return false;
        }

        try {
            setIsLoading(true);
            setError('');

            const web3Provider = new ethers.BrowserProvider(window.ethereum);
            const accounts = await web3Provider.send("eth_requestAccounts", []);

            if (!accounts || accounts.length === 0) {
                throw new Error("No accounts found");
            }

            const signer = await web3Provider.getSigner();
            const address = await signer.getAddress();
            const networkInfo = await web3Provider.getNetwork();

            const chainId = Number(networkInfo.chainId);

            // 🔥 ENSURE SEPOLIA
            if (chainId !== 11155111) {
                await window.ethereum.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: '0xaa36a7' }]
                });
            }

            const nativeBalance = await web3Provider.getBalance(address);
            const formattedNative = ethers.formatEther(nativeBalance);

            const qTokenBalance = await getQTokenBalance(
                web3Provider,
                address
            );

            setAddress(address);
            setProvider(web3Provider);
            setSigner(signer);
            setNetwork({
                name: networkInfo.name,
                chainId
            });

            setBalance({
                native: formattedNative,
                qToken: qTokenBalance
            });

            setIsConnected(true);

            console.log("✅ Wallet Connected:", address);

            return true;

        } catch (err: any) {
            console.error("❌ Connection Error:", err);
            setError(err.message || "Connection failed");
            return false;
        } finally {
            setIsLoading(false);
        }
    };


    /* ================= SEND QTOKEN ================= */

    /* ================= SEND QTOKEN ================= */

    const sendQToken = async (
        toAddress: string,
        amount: string,
        isPqc: boolean = false
    ) => {
        if (!signer || !address) {
            throw new Error("Wallet not connected");
        }

        if (!ethers.isAddress(toAddress)) {
            throw new Error("Invalid address");
        }

        const amountInWei = ethers.parseUnits(amount, 18);

        const contract = new ethers.Contract(
            SEPOLIA_QTOKEN_ADDRESS,
            QTOKEN_ABI,
            signer
        );

        const tx = await contract.transfer(toAddress, amountInWei);

        const receipt = await tx.wait();

        return {
            hash: tx.hash,
            receipt,
            success: true
        };
    };
    /* ================= GET QTOKEN BALANCE ================= */

    const getQTokenBalance = async (
        provider: ethers.BrowserProvider,
        userAddress: string
    ): Promise<string> => {

        if (!SEPOLIA_QTOKEN_ADDRESS) {
            console.warn("⚠️ No contract address set");
            return "0";
        }

        try {
            const contract = new ethers.Contract(
                SEPOLIA_QTOKEN_ADDRESS,
                QTOKEN_ABI,
                provider
            );

            const balance = await contract.balanceOf(userAddress);
            const decimals = await contract.decimals();

            return ethers.formatUnits(balance, decimals);

        } catch (err) {
            console.warn("⚠️ Could not fetch QToken balance");
            return "0";
        }
    };
    const formatAddress = (addr: string, start = 6, end = 4) => {
        if (!addr) return "";
        return `${addr.slice(0, start)}...${addr.slice(-end)}`;
    };

    /* ================= REFRESH BALANCE ================= */

    const refreshBalance = async () => {
        if (!provider || !address) return;

        try {
            const nativeBalance = await provider.getBalance(address);
            const formattedNative = ethers.formatEther(nativeBalance);

            const qTokenBalance = await getQTokenBalance(provider, address);

            setBalance({
                native: formattedNative,
                qToken: qTokenBalance
            });

        } catch (err) {
            console.warn("⚠️ Refresh failed");
        }
    };


    /* ================= DISCONNECT ================= */

    const disconnectWallet = () => {
        setAddress('');
        setProvider(null);
        setSigner(null);
        setNetwork(null);
        setBalance({ native: '0', qToken: '0' });
        setIsConnected(false);
    };


    /* ================= AUTO CONNECT ================= */

    useEffect(() => {
        const autoConnect = async () => {
            if (!window.ethereum) return;

            try {
                const provider = new ethers.BrowserProvider(window.ethereum);
                const accounts = await provider.send("eth_accounts", []);

                if (accounts.length > 0) {
                    await connectWallet();
                }
            } catch {
                console.log("No auto connection");
            }
        };

        autoConnect();
    }, []);


    /* ================= RETURN ================= */

    return {
  address,
  provider,
  signer,
  network,
  balance,
  qTokenBalance: balance.qToken,
  nativeBalance: balance.native,
  isConnected,
  isLoading,
  error,
  connectWallet,
  disconnectWallet,
  refreshBalance,
  sendQToken,          // ✅ add this
  formatAddress        // ✅ add this
};
};
