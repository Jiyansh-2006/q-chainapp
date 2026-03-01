// src/hooks/useMetaMask.tsx
import { useEffect, useState, useCallback } from "react";
import { getEthereum } from "../utils/ethereum";
import { ethers, BrowserProvider } from "ethers";

export function useMetaMask() {
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [account, setAccount] = useState<string | null>(null);
  const [chainId, setChainId] = useState<string | null>(null);
  const [installed, setInstalled] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const eth = getEthereum();
    setInstalled(!!eth);
    if (!eth) return;

    const web3Provider = new BrowserProvider(eth, "any"); // "any" to allow switching chains
    setProvider(web3Provider);

    // set initial chain & accounts if available
    web3Provider.getNetwork().then(net => setChainId(net.chainId.toString())).catch(() => {});
    web3Provider.listAccounts().then(async accs => {
      if (accs && accs.length) setAccount(await accs[0].getAddress());
    }).catch(() => {});

    // handlers
    const handleAccountsChanged = (accounts: string[]) => {
      if (!accounts || accounts.length === 0) {
        setAccount(null);
      } else {
        setAccount(ethers.getAddress(accounts[0]));
      }
    };

    const handleChainChanged = (chainHex: string) => {
      // chainHex is like "0x1" or "0x89"
      setChainId(parseInt(chainHex, 16).toString());
      // provider network might need reinitializing; page reload recommended in some cases
    };

    eth.on?.("accountsChanged", handleAccountsChanged);
    eth.on?.("chainChanged", handleChainChanged);

    return () => {
      eth.removeListener?.("accountsChanged", handleAccountsChanged);
      eth.removeListener?.("chainChanged", handleChainChanged);
    };
  }, []);

  const connect = useCallback(async () => {
    setError(null);
    try {
      const eth = getEthereum();
      if (!eth) throw new Error("MetaMask is not installed");
      // prompt connect
      const accounts: string[] = await eth.request({ method: "eth_requestAccounts" });
      setAccount(ethers.getAddress(accounts[0]));
      const provider = new BrowserProvider(eth, "any");
      setProvider(provider);
      const network = await provider.getNetwork();
      setChainId(network.chainId.toString());
    } catch (err: any) {
      setError(err.message ?? String(err));
    }
  }, []);

  const disconnect = useCallback(() => {
    // MetaMask doesn't provide programmatic disconnect; just clear your local state
    setAccount(null);
    setProvider(null);
    setChainId(null);
  }, []);

  return {
    installed,
    provider,
    account,
    chainId,
    error,
    connect,
    disconnect,
  };
}
