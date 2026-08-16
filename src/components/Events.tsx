import React, { useState, useEffect } from "react";
import { BrowserProvider, Contract } from "ethers";
import { MONAD_CONFIG } from "../types";
import contractABI from "../../out/OathsAndAshes.sol/OathsAndAshes.json";

export function Events({
  matchId,
  provider,
}: {
  matchId: bigint;
  provider: BrowserProvider | null;
}) {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  const loadEvents = async () => {
    try {
      setLoading(true);
      setError("");

      if (!provider) throw new Error("Provider not available");

      const contract = new Contract(
        MONAD_CONFIG.contractAddress,
        contractABI.abi,
        provider
      );

      // Create event filters for the match
      const eventNames = [
        "MatchCreated",
        "IntentSubmitted",
        "RoundResolved",
        "TerritoryCaptured",
        "TaxCollected",
        "AllianceFormed",
        "Betrayal",
        "SabotageResolved",
        "DragonStrike",
        "DragonWounded",
        "DragonCaptured",
        "ReputationChanged",
        "MatchEnded",
      ];

      const allEvents: any[] = [];

      for (const eventName of eventNames) {
        try {
          const filter = contract.filters[eventName as any]?.();
          if (!filter) continue;

          // Query last 1000 blocks
          const blockNumber = await provider.getBlockNumber();
          const startBlock = Math.max(0, blockNumber - 1000);

          const logs = await provider.getLogs({
            address: MONAD_CONFIG.contractAddress,
            topics: filter.topics,
            fromBlock: startBlock,
            toBlock: "latest",
          });

          // Parse events
          for (const log of logs) {
            try {
              const parsed = contract.interface.parseLog({
                topics: log.topics as any,
                data: log.data,
              });

              if (parsed) {
                const eventData = {
                  name: eventName,
                  blockNumber: log.blockNumber,
                  transactionHash: log.transactionHash,
                  args: parsed.args,
                };

                // Filter for this match if applicable
                if (
                  parsed.args.matchId === undefined ||
                  BigInt(parsed.args.matchId as any) === matchId
                ) {
                  allEvents.push(eventData);
                }
              }
            } catch (e) {
              // Skip unparseable logs
            }
          }
        } catch (e) {
          // Skip if event doesn't exist
        }
      }

      // Sort by block number
      allEvents.sort((a, b) => b.blockNumber - a.blockNumber);

      setEvents(allEvents);
    } catch (err: any) {
      setError(err.message || "Failed to load events");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
    const interval = setInterval(loadEvents, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, [matchId, provider]);

  return (
    <div className="section">
      <h2>Game Events</h2>
      <button onClick={loadEvents} disabled={loading}>
        {loading ? "Loading..." : "Refresh Events"}
      </button>

      {error && <div className="status error">{error}</div>}

      {events.length === 0 && !loading && (
        <div className="info-box">No events yet for this match.</div>
      )}

      {events.length > 0 && (
        <div className="event-list">
          {events.map((event, index) => (
            <div key={index} className="event-item">
              <strong>{event.name}</strong>
              <br />
              Block: {event.blockNumber}
              <br />
              <code style={{ fontSize: "11px" }}>
                {JSON.stringify(
                  {
                    ...event.args,
                    // Convert BigInts to strings for display
                  },
                  (key, value) => {
                    if (typeof value === "bigint") {
                      return value.toString();
                    }
                    return value;
                  },
                  2
                )}
              </code>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
