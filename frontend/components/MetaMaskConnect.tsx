// src/components/MetaMaskConnect.tsx
import React from "react";
import { useMetaMask } from "../hooks/useMetaMask";

export default function MetaMaskConnect() {
  const { installed, account, chainId, error, connect, disconnect } = useMetaMask();

  if (!installed) {
    return (
      <div>
        <p>MetaMask not installed. <a href="https://metamask.io/download.html" target="_blank" rel="noreferrer">Install MetaMask</a></p>
      </div>
    );
  }

  return (
    <div>
      {account ? (
        <div>
          <div>Connected: <strong>{account}</strong></div>
          <div>Chain ID: <strong>{chainId}</strong></div>
          <button onClick={disconnect}>Disconnect (local)</button>
        </div>
      ) : (
        <button onClick={connect}>Connect MetaMask</button>
      )}
      {error && <div style={{ color: "red" }}>{error}</div>}
    </div>
  );
}
