import React, { useState } from "react";
import { BrowserProvider } from "ethers";
import { gameContract } from "../contract";
import { GAME_CONFIG } from "../types";

export function HouseJoin({
  address,
  matchId,
  provider,
  onHouseJoined,
}: {
  address: string;
  matchId: bigint;
  provider: BrowserProvider | null;
  onHouseJoined: (houseId: number) => void;
}) {
  const [selectedHouse, setSelectedHouse] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const [txHash, setTxHash] = useState<string>("");

  const joinHouse = async () => {
    try {
      if (selectedHouse === 0) {
        setError("Please select a house");
        return;
      }

      setLoading(true);
      setError("");
      setStatus("Joining house...");
      setTxHash("");

      if (!provider) throw new Error("Provider not initialized");

      const txHash = await gameContract.joinMatch(matchId, selectedHouse);
      setTxHash(txHash);
      setStatus(`House ${selectedHouse} joined successfully!`);

      // Verify house was joined
      const matchState = await gameContract.getMatchSummary(matchId);
      if (matchState.playersJoined > 0) {
        onHouseJoined(selectedHouse);
      }
    } catch (err: any) {
      // Check if error indicates house is already taken or other validation error
      if (err.message.includes("house taken")) {
        setError("That house is already occupied. Choose another.");
      } else if (err.message.includes("already in match")) {
        setError("You are already in this match with another house.");
      } else {
        setError(err.message || "Failed to join house");
      }
      setStatus("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="section">
      <h2>Step 2: Join House</h2>
      <p>Match ID: {matchId.toString()}</p>
      <p>Select your house and join the match:</p>

      <div className="house-selector">
        {GAME_CONFIG.houses.map((house) => (
          <div
            key={house.id}
            className={`house-option ${
              selectedHouse === house.id ? "selected" : ""
            }`}
            onClick={() => setSelectedHouse(house.id)}
          >
            <strong>House {house.id}</strong>
            <br />
            {house.name}
          </div>
        ))}
      </div>

      <button onClick={joinHouse} disabled={loading || selectedHouse === 0}>
        {loading ? "Joining..." : "Join House"}
      </button>

      {error && <div className="status error">{error}</div>}
      {status && <div className="status success">{status}</div>}
      {txHash && (
        <div className="status success">
          Transaction: <code>{txHash}</code>
        </div>
      )}
    </div>
  );
}
