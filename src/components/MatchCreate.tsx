import React, { useState } from "react";
import { BrowserProvider } from "ethers";
import { gameContract } from "../contract";

export function MatchCreate({
  address,
  provider,
  onMatchCreated,
}: {
  address: string;
  provider: BrowserProvider | null;
  onMatchCreated: (matchId: bigint) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const [txHash, setTxHash] = useState<string>("");
  const [matchId, setMatchId] = useState<bigint>(0n);

  const createMatch = async () => {
    try {
      setLoading(true);
      setError("");
      setStatus("Creating match on Monad Testnet...");
      setTxHash("");

      if (!provider) throw new Error("Provider not initialized");

      const newMatchId = await gameContract.createMatch();
      setMatchId(newMatchId);
      setStatus(`Match created successfully! Match ID: ${newMatchId.toString()}`);

      // Call callback to proceed to next step
      setTimeout(() => {
        onMatchCreated(newMatchId);
      }, 1000);
    } catch (err: any) {
      setError(err.message || "Failed to create match");
      setStatus("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="section">
      <h2>Step 1: Create Match</h2>
      <p>Create a new match on the live Monad Testnet contract (Chain ID 10143).</p>
      <p>
        <strong>Contract:</strong>{" "}
        <code>0x478643bE5f1CdB85010454f00c795cB24e0d3010</code>
      </p>
      <button onClick={createMatch} disabled={loading}>
        {loading ? "Creating..." : "Create Match"}
      </button>
      {error && <div className="status error">{error}</div>}
      {status && <div className="status success">{status}</div>}
      {matchId > 0n && (
        <div className="info-box">
          <strong>Match ID:</strong> {matchId.toString()}
          <br />
          Ready to proceed to house selection.
        </div>
      )}
    </div>
  );
}
