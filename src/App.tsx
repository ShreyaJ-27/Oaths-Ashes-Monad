import React, { useEffect, useState } from "react";
import { BrowserProvider, getAddress } from "ethers";
import { WalletConnect } from "./components/WalletConnect";
import { MatchCreate } from "./components/MatchCreate";
import { HouseJoin } from "./components/HouseJoin";
import { IntentSigning } from "./components/IntentSigning";
import { ContractState } from "./components/ContractState";
import { Events } from "./components/Events";
import { gameContract } from "./contract";
import { MONAD_CONFIG } from "./types";

export function App() {
  const [connected, setConnected] = useState(false);
  const [address, setAddress] = useState<string>("");
  const [chainId, setChainId] = useState<number>(0);
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [signer, setSigner] = useState<any>(null);
  const [matchId, setMatchId] = useState<bigint>(0n);
  const [houseId, setHouseId] = useState<number>(0);
  const [error, setError] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"flow" | "state" | "events">("flow");

  // Handle wallet connection
  const handleWalletConnect = async (
    addr: string,
    chain: number,
    prov: BrowserProvider,
    sig: any
  ) => {
    if (chain !== MONAD_CONFIG.chainId) {
      setError(
        `Wrong network. Please switch to Monad Testnet (Chain ID ${MONAD_CONFIG.chainId})`
      );
      return;
    }

    setAddress(addr);
    setChainId(chain);
    setProvider(prov);
    setSigner(sig);
    setConnected(true);
    setError("");

    // Initialize contract
    await gameContract.initialize(prov);
    gameContract.setSigner(sig);
  };

  const handleDisconnect = () => {
    setConnected(false);
    setAddress("");
    setChainId(0);
    setProvider(null);
    setSigner(null);
    setMatchId(0n);
    setHouseId(0);
    setError("");
  };

  if (!connected) {
    return (
      <div className="container">
        <h1>⚔️ Oaths & Ashes — Phase 3 Integration</h1>
        <div className="section">
          <h2>Monad Testnet Integration Harness</h2>
          <WalletConnect onConnect={handleWalletConnect} />
          {error && <div className="status error">{error}</div>}
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <h1>⚔️ Oaths & Ashes — Phase 3 Integration</h1>

      <div className="section">
        <h2>Wallet Status</h2>
        <div className="info-box">
          <strong>Connected:</strong> {address}
        </div>
        <div className="info-box">
          <strong>Network:</strong> Monad Testnet (Chain ID {chainId})
        </div>
        {matchId > 0n && (
          <div className="info-box">
            <strong>Current Match:</strong> {matchId.toString()}
            {houseId > 0 && <strong> | House: {houseId}</strong>}
          </div>
        )}
        <button onClick={handleDisconnect}>Disconnect Wallet</button>
      </div>

      {error && <div className="section status error">{error}</div>}

      {!matchId || matchId === 0n ? (
        <MatchCreate
          address={address}
          provider={provider}
          onMatchCreated={(id) => setMatchId(id)}
        />
      ) : !houseId || houseId === 0 ? (
        <HouseJoin
          address={address}
          matchId={matchId}
          provider={provider}
          onHouseJoined={(id) => setHouseId(id)}
        />
      ) : (
        <>
          <div className="tabs">
            <button
              className={`tab-button ${activeTab === "flow" ? "active" : ""}`}
              onClick={() => setActiveTab("flow")}
            >
              Game Flow
            </button>
            <button
              className={`tab-button ${activeTab === "state" ? "active" : ""}`}
              onClick={() => setActiveTab("state")}
            >
              Contract State
            </button>
            <button
              className={`tab-button ${activeTab === "events" ? "active" : ""}`}
              onClick={() => setActiveTab("events")}
            >
              Events
            </button>
          </div>

          {activeTab === "flow" && (
            <IntentSigning
              address={address}
              matchId={matchId}
              houseId={houseId}
              provider={provider}
              signer={signer}
            />
          )}

          {activeTab === "state" && (
            <ContractState
              matchId={matchId}
              houseId={houseId}
              provider={provider}
            />
          )}

          {activeTab === "events" && (
            <Events matchId={matchId} provider={provider} />
          )}
        </>
      )}
    </div>
  );
}
