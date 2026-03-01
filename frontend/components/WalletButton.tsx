"use client";

import { useState } from "react";

export default function WalletButton() {
  const [account, setAccount] = useState<string | null>(null);
  const [balance, setBalance] = useState<string | null>(null);

  const connectWallet = async () => {
    try {
      if ((window as any).ethereum) {
        const ethereum = (window as any).ethereum;
        const accounts = await ethereum.request({ method: "eth_requestAccounts" });
        const selectedAccount = accounts[0];
        setAccount(selectedAccount);

        // Fetch balance (in Ether)
        const balanceWei = await ethereum.request({
          method: "eth_getBalance",
          params: [selectedAccount, "latest"],
        });
        const balanceEth = Number(parseInt(balanceWei, 16) / 1e18).toFixed(4);
        setBalance(balanceEth);

        // Optional: Listen for account changes
        ethereum.on("accountsChanged", (accounts: string[]) => {
          if (accounts.length > 0) {
            setAccount(accounts[0]);
          } else {
            setAccount(null);
            setBalance(null);
          }
        });
      } else {
        alert("MetaMask not detected. Please install it from https://metamask.io/");
      }
    } catch (error) {
      console.error("Wallet connection failed:", error);
    }
  };

  const disconnectWallet = () => {
    setAccount(null);
    setBalance(null);
  };

  return (
    <div className="flex flex-col items-center gap-3">
      {account ? (
        <>
          <button
            onClick={disconnectWallet}
            className="px-5 py-2 bg-red-600 text-white font-semibold rounded-lg shadow hover:bg-red-700 transition-all"
          >
            Disconnect Wallet
          </button>
          <p className="text-sm text-gray-200">
            ✅ Connected:{" "}
            <span className="font-mono text-green-400">
              {account.slice(0, 6)}...{account.slice(-4)}
            </span>
          </p>
          {balance && (
            <p className="text-sm text-gray-300">💰 Balance: {balance} ETH</p>
          )}
        </>
      ) : (
        <button
          onClick={connectWallet}
          className="px-5 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow hover:bg-blue-700 transition-all"
        >
          Connect MetaMask
        </button>
      )}
    </div>
  );
}
