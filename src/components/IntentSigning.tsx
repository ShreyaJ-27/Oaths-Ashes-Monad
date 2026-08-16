import React, { useState, useEffect } from "react";
import { BrowserProvider } from "ethers";
import { gameContract } from "../contract";
import {
  createIntentMessage,
  signIntent,
  createDeadline,
  validateIntent,
} from "../signing";
import { GAME_CONFIG } from "../types";

export function IntentSigning({
  address,
  matchId,
  houseId,
  provider,
  signer,
}: {
  address: string;
  matchId: bigint;
  houseId: number;
  provider: BrowserProvider | null;
  signer: any;
}) {
  const [selectedAction, setSelectedAction] = useState<number>(0);
  const [targetType, setTargetType] = useState<number>(1);
  const [targetId, setTargetId] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const [signature, setSignature] = useState<string>("");
  const [nonce, setNonce] = useState<bigint>(1n);
  const [matchState, setMatchState] = useState<any>(null);

  // Load match state and current nonce
  useEffect(() => {
    const loadState = async () => {
      try {
        const state = await gameContract.getMatchSummary(matchId);
        setMatchState(state);

        const currentNonce = await gameContract.getUsedNonce(matchId, houseId);
        setNonce(currentNonce + 1n);
      } catch (err) {
        console.error("Failed to load state:", err);
      }
    };

    loadState();
  }, [matchId, houseId]);

  const signAndSubmit = async () => {
    try {
      if (selectedAction === 0) {
        setError("Please select an action");
        return;
      }

      setLoading(true);
      setError("");
      setStatus("");
      setSignature("");

      // Create intent message
      const deadline = createDeadline(30);
      const message = createIntentMessage(
        matchId,
        matchState?.round || 1,
        houseId,
        selectedAction,
        targetType,
        targetId,
        nonce,
        deadline,
        address
      );

      // Validate intent
      const validation = await validateIntent(message, provider);
      if (!validation.valid) {
        setError("Intent validation failed: " + validation.errors.join(", "));
        return;
      }

      setStatus("Signing intent with MetaMask...");

      // Sign the intent
      const sig = await signIntent(signer, message);
      setSignature(sig);
      setStatus("Intent signed! Submitting to contract...");

      // Submit to contract
      const txHash = await gameContract.submitIntent({
        ...message,
        signature: sig,
      });

      setStatus(
        "Intent submitted! Transaction: " + txHash.substring(0, 20) + "..."
      );

      // Refresh nonce
      const newNonce = await gameContract.getUsedNonce(matchId, houseId);
      setNonce(newNonce + 1n);

      // Reset form
      setSelectedAction(0);
      setSignature("");
    } catch (err: any) {
      if (err.message.includes("rejected")) {
        setError("MetaMask signature rejected");
      } else if (err.message.includes("wrong round")) {
        setError("Wrong round. Refresh the page.");
      } else {
        setError(err.message || "Failed to sign/submit intent");
      }
      setStatus("");
    } finally {
      setLoading(false);
    }
  };

  const actionList = [
    { id: 1, name: "Attack" },
    { id: 2, name: "Fortify" },
    { id: 3, name: "Dragonstrike" },
    { id: 4, name: "Diplomacy" },
    { id: 5, name: "Sabotage" },
    { id: 6, name: "Tax" },
  ];

  return (
    <div className="section">
      <h2>Step 3: Submit Action</h2>

      {matchState && (
        <div className="info-box">
          <strong>Round {matchState.round}</strong> | Deadline:{" "}
          {new Date(matchState.roundDeadline * 1000).toLocaleTimeString()}
        </div>
      )}

      <p>Select your action:</p>
      <div className="action-selector">
        {actionList.map((action) => (
          <button
            key={action.id}
            className={`action-button ${
              selectedAction === action.id ? "selected" : ""
            }`}
            onClick={() => {
              setSelectedAction(action.id);
              // Reset target type based on action
              if (action.id === 4) {
                // Diplomacy targets houses
                setTargetType(2);
              } else if (action.id === 5) {
                // Sabotage can target houses, territories, or dragons
                setTargetType(1);
              } else if (action.id === 3) {
                // Dragonstrike can target territories or dragons
                setTargetType(1);
              } else if (action.id === 1) {
                // Attack targets territories
                setTargetType(1);
              } else {
                // Tax, Fortify target territories
                setTargetType(1);
              }
            }}
          >
            {action.name}
          </button>
        ))}
      </div>

      {selectedAction > 0 && (
        <div>
          <div style={{ marginTop: "15px" }}>
            <label>
              Target Type:
              <select
                value={targetType}
                onChange={(e) => setTargetType(Number(e.target.value))}
                style={{
                  marginLeft: "10px",
                  padding: "5px",
                  background: "#2a2a3a",
                  color: "#e0e0e0",
                  border: "1px solid #ffd700",
                  borderRadius: "4px",
                }}
              >
                <option value={1}>Territory</option>
                <option value={2}>House</option>
                <option value={3}>Dragon</option>
              </select>
            </label>
          </div>

          <div style={{ marginTop: "10px" }}>
            <label>
              Target ID:
              <input
                type="number"
                min="1"
                max="6"
                value={targetId}
                onChange={(e) => setTargetId(Number(e.target.value))}
                style={{
                  marginLeft: "10px",
                  padding: "5px",
                  background: "#2a2a3a",
                  color: "#e0e0e0",
                  border: "1px solid #ffd700",
                  borderRadius: "4px",
                }}
              />
            </label>
          </div>

          <div style={{ marginTop: "10px" }}>
            <label>
              Nonce: <code>{nonce.toString()}</code>
            </label>
          </div>
        </div>
      )}

      <button
        onClick={signAndSubmit}
        disabled={loading || selectedAction === 0}
        style={{ marginTop: "15px" }}
      >
        {loading ? "Signing..." : "Sign & Submit Intent"}
      </button>

      {error && <div className="status error">{error}</div>}
      {status && <div className="status pending">{status}</div>}
      {signature && (
        <div className="status success">
          <strong>Signed!</strong>
          <br />
          <code style={{ fontSize: "11px", wordBreak: "break-all" }}>
            {signature.substring(0, 50)}...
          </code>
        </div>
      )}
    </div>
  );
}
