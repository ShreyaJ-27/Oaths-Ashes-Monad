import React, { useState } from "react";
import { BrowserProvider } from "ethers";
import { MONAD_CONFIG } from "../types";

export function WalletConnect({
  onConnect,
}: {
  onConnect: (
    address: string,
    chainId: number,
    provider: BrowserProvider,
    signer: any
  ) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  const connectWallet = async () => {
    try {
      setLoading(true);
      setError("");

      // Check if MetaMask is installed
      const { ethereum } = window as any;
      if (!ethereum) {
        throw new Error("MetaMask not installed. Please install MetaMask.");
      }

      // Request account access
      const accounts = await ethereum.request({
        method: "eth_requestAccounts",
      });

      if (!accounts || accounts.length === 0) {
        throw new Error("No accounts available");
      }

      const address = accounts[0];

      // Get chain ID
      const chainIdHex = await ethereum.request({ method: "eth_chainId" });
      const chainId = parseInt(chainIdHex, 16);

      // Check if we're on the correct chain
      if (chainId !== MONAD_CONFIG.chainId) {
        // Try to switch networks
        try {
          await ethereum.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: `0x${MONAD_CONFIG.chainId.toString(16)}` }],
          });
        } catch (switchError: any) {
          if (switchError.code === 4902) {
            // Network not added, attempt to add it
            try {
              await ethereum.request({
                method: "wallet_addEthereumChain",
                params: [
                  {
                    chainId: `0x${MONAD_CONFIG.chainId.toString(16)}`,
                    chainName: MONAD_CONFIG.chainName,
                    rpcUrls: [MONAD_CONFIG.rpcUrl],
                    nativeCurrency: {
                      name: "Monad",
                      symbol: "MON",
                      decimals: 18,
                    },
                  },
                ],
              });
            } catch (addError) {
              throw new Error(
                `Failed to add Monad network. Please add it manually to MetaMask.`
              );
            }
          } else {
            throw new Error(
              `Please switch to Monad Testnet manually in MetaMask.`
            );
          }
        }

        // Re-fetch chain ID after switching
        const newChainIdHex = await ethereum.request({ method: "eth_chainId" });
        const newChainId = parseInt(newChainIdHex, 16);
        if (newChainId !== MONAD_CONFIG.chainId) {
          throw new Error(
            `Wrong chain. Expected ${MONAD_CONFIG.chainId}, got ${newChainId}`
          );
        }
      }

      // Create provider and signer
      const provider = new BrowserProvider(ethereum);
      const signer = await provider.getSigner();

      onConnect(address, chainId, provider, signer);
    } catch (err: any) {
      setError(err.message || "Failed to connect wallet");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button onClick={connectWallet} disabled={loading}>
        {loading ? "Connecting..." : "Connect MetaMask"}
      </button>
      {error && <div className="status error">{error}</div>}
      <div className="info-box">
        <strong>Phase 3 Integration:</strong> Connect your MetaMask wallet to
        interact with the live Oaths & Ashes contract on Monad Testnet (Chain ID{" "}
        {MONAD_CONFIG.chainId}).
      </div>
    </div>
  );
}
