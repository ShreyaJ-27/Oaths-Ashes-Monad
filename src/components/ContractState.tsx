import React, { useState, useEffect } from "react";
import { BrowserProvider } from "ethers";
import { gameContract } from "../contract";

export function ContractState({
  matchId,
  houseId,
  provider,
}: {
  matchId: bigint;
  houseId: number;
  provider: BrowserProvider | null;
}) {
  const [matchState, setMatchState] = useState<any>(null);
  const [houseState, setHouseState] = useState<any>(null);
  const [territories, setTerritories] = useState<any[]>([]);
  const [dragons, setDragons] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  const refreshState = async () => {
    try {
      setLoading(true);
      setError("");

      // Get match state
      const match = await gameContract.getMatchSummary(matchId);
      setMatchState(match);

      // Get house state
      const house = await gameContract.getHouseState(matchId, houseId);
      setHouseState(house);

      // Get territory states
      const terrs = [];
      for (let i = 1; i <= 6; i++) {
        const terr = await gameContract.getTerritoryState(matchId, i);
        terrs.push(terr);
      }
      setTerritories(terrs);

      // Get dragon states
      const drags = [];
      for (let i = 1; i <= 3; i++) {
        const drag = await gameContract.getDragonState(matchId, i);
        drags.push(drag);
      }
      setDragons(drags);
    } catch (err: any) {
      setError(err.message || "Failed to load state");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshState();
    const interval = setInterval(refreshState, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, [matchId, houseId]);

  const statusMap = ["Created", "Active", "Finished"];

  return (
    <div>
      <div className="section">
        <h2>Match State</h2>
        <button onClick={refreshState} disabled={loading}>
          {loading ? "Refreshing..." : "Refresh State"}
        </button>

        {error && <div className="status error">{error}</div>}

        {matchState && (
          <div style={{ marginTop: "15px" }}>
            <p>
              <strong>Match ID:</strong> {matchState.id.toString()}
            </p>
            <p>
              <strong>Status:</strong> {statusMap[matchState.status]}
            </p>
            <p>
              <strong>Round:</strong> {matchState.round} / 10
            </p>
            <p>
              <strong>Players Joined:</strong> {matchState.playersJoined} / 6
            </p>
            <p>
              <strong>Round Deadline:</strong>{" "}
              {new Date(matchState.roundDeadline * 1000).toLocaleString()}
            </p>
            {matchState.winnerHouseId > 0 && (
              <p>
                <strong>Winner:</strong> House {matchState.winnerHouseId}
              </p>
            )}
          </div>
        )}
      </div>

      <div className="section">
        <h2>Your House (House {houseId})</h2>
        {houseState && (
          <div>
            <p>
              <strong>Gold:</strong> {houseState.gold}
            </p>
            <p>
              <strong>Influence:</strong> {houseState.influence}
            </p>
            <p>
              <strong>Military:</strong> {houseState.military}
            </p>
            <p>
              <strong>Reputation:</strong> {houseState.reputation}
            </p>
            <p>
              <strong>Territory:</strong> {houseState.territoryId}
            </p>
            <p>
              <strong>Dragon:</strong> {houseState.dragonId}
            </p>
            <p>
              <strong>Status:</strong> {houseState.alive ? "Alive" : "Eliminated"}
            </p>
          </div>
        )}
      </div>

      <div className="section">
        <h2>Territories</h2>
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "14px",
            }}
          >
            <thead>
              <tr style={{ borderBottom: "1px solid #ffd700" }}>
                <th style={{ padding: "8px", textAlign: "left" }}>ID</th>
                <th style={{ padding: "8px", textAlign: "left" }}>Owner</th>
                <th style={{ padding: "8px", textAlign: "left" }}>Resources</th>
                <th style={{ padding: "8px", textAlign: "left" }}>Fort</th>
                <th style={{ padding: "8px", textAlign: "left" }}>Throne</th>
              </tr>
            </thead>
            <tbody>
              {territories.map((terr) => (
                <tr key={terr.territoryId} style={{ borderBottom: "1px solid #444" }}>
                  <td style={{ padding: "8px" }}>
                    {terr.territoryId}
                  </td>
                  <td style={{ padding: "8px" }}>
                    House {terr.ownerHouseId || "-"}
                  </td>
                  <td style={{ padding: "8px" }}>
                    {terr.resourceValue}
                  </td>
                  <td style={{ padding: "8px" }}>
                    {terr.fortificationLevel}
                  </td>
                  <td style={{ padding: "8px" }}>
                    {terr.isThrone ? "✓" : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="section">
        <h2>Dragons</h2>
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "14px",
            }}
          >
            <thead>
              <tr style={{ borderBottom: "1px solid #ffd700" }}>
                <th style={{ padding: "8px", textAlign: "left" }}>ID</th>
                <th style={{ padding: "8px", textAlign: "left" }}>Owner</th>
                <th style={{ padding: "8px", textAlign: "left" }}>Power</th>
                <th style={{ padding: "8px", textAlign: "left" }}>Wounds</th>
                <th style={{ padding: "8px", textAlign: "left" }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {dragons.map((drag) => (
                <tr key={drag.dragonId} style={{ borderBottom: "1px solid #444" }}>
                  <td style={{ padding: "8px" }}>
                    {drag.dragonId}
                  </td>
                  <td style={{ padding: "8px" }}>
                    House {drag.ownerHouseId || "Neutral"}
                  </td>
                  <td style={{ padding: "8px" }}>
                    {drag.power}
                  </td>
                  <td style={{ padding: "8px" }}>
                    {drag.wounds}
                  </td>
                  <td style={{ padding: "8px" }}>
                    {drag.alive ? "Alive" : "Dead"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
