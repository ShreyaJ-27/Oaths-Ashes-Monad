import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { Signer } from "ethers";
import { createRepository, GameRepository } from "./GameRepository";
import { signMonadOrder, validateActionTarget } from "./GameActions";
import {
  clearPendingOrder,
  loadPendingOrder,
  orderMatchesRound,
  savePendingOrder,
  toContractIntent,
} from "./pendingOrder";
import { defaultMode, loadSession, saveSession, clearSession } from "./session";
import { connectWallet } from "./wallet";
import type { ActionRequest, GameMode, GameState, TxPhase } from "./types";
import { monadAdapter } from "./MonadAdapter";
import { gameContract } from "../contract";

type GameContextValue = {
  mode: GameMode;
  gameState: GameState | null;
  connected: boolean;
  address: string;
  chainId: number;
  txPhase: TxPhase;
  loading: boolean;
  settling: boolean;
  status: string;
  error: string;
  matchId: bigint | null;
  setMode: (mode: GameMode) => void;
  connect: () => Promise<void>;
  startNewGame: () => Promise<"war" | "houses">;
  joinHouse: (houseId: number) => Promise<void>;
  reconnectMatch: () => Promise<boolean>;
  refreshState: () => Promise<void>;
  submitAction: (req: ActionRequest) => Promise<void>;
  advanceRound: () => Promise<void>;
  clearError: () => void;
};

const GameContext = createContext<GameContextValue | null>(null);

function friendlyError(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err || "Something went wrong.");
  if (/metamask|ethereum|wallet/i.test(message)) return "Wallet not connected";
  if (/network|chain/i.test(message)) return "Wrong network";
  if (/rpc|fetch|network error/i.test(message)) return "RPC unavailable";
  if (/user rejected|denied/i.test(message)) return "Signature rejected";
  if (/house taken|occupied/i.test(message)) return "House already occupied";
  if (/expired|deadline/i.test(message)) return "Round expired";
  if (/revert|rejected/i.test(message)) return "Transaction rejected";
  if (/nonce/i.test(message)) return "Nonce mismatch";
  if (/already settled/i.test(message)) return "Round already settled";
  return message.length > 140 ? "Action unavailable" : message;
}

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<GameMode>(defaultMode());
  const repoRef = useRef<GameRepository>(createRepository(mode));
  const signerRef = useRef<Signer | null>(null);

  const [gameState, setGameState] = useState<GameState | null>(null);
  const [connected, setConnected] = useState(false);
  const [address, setAddress] = useState("");
  const [chainId, setChainId] = useState(0);
  const [matchId, setMatchId] = useState<bigint | null>(null);
  const [txPhase, setTxPhase] = useState<TxPhase>("idle");
  const [loading, setLoading] = useState(false);
  const [settling, setSettling] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  const setMode = useCallback((next: GameMode) => {
    setModeState(next);
    repoRef.current.setMode(next);
  }, []);

  const connect = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const wallet = await connectWallet();
      signerRef.current = wallet.signer;
      setAddress(wallet.address);
      setChainId(wallet.chainId);
      setConnected(true);
      setStatus("Wallet connected to Monad Testnet.");

      if (mode === "MONAD") {
        const restored = await repoRef.current.reconnectMonad(wallet.address);
        if (restored) {
          const pending = loadPendingOrder();
          const withPending =
            pending && orderMatchesRound(pending, restored.match.id, restored.match.round)
              ? await monadAdapter.loadFullState(
                  restored.match.id,
                  restored.playerHouseId,
                  wallet.address,
                  pending
                )
              : restored;
          setGameState(withPending);
          setMatchId(restored.match.id);
          saveSession({
            mode: "MONAD",
            matchId: restored.match.id.toString(),
            houseId: restored.playerHouseId,
            playerAddress: wallet.address,
          });
          setStatus("On-chain campaign restored.");
        }
      }
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  }, [mode]);

  const refreshState = useCallback(async () => {
    if (!gameState || mode !== "MONAD" || !address || !matchId) return;
    try {
      const pending = loadPendingOrder();
      if (pending && !orderMatchesRound(pending, matchId, gameState.match.round)) {
        clearPendingOrder();
      }
      const activePending =
        pending && orderMatchesRound(pending, matchId, gameState.match.round) ? pending : null;
      const next = await monadAdapter.loadFullState(
        matchId,
        gameState.playerHouseId,
        address,
        activePending
      );
      setGameState(next);
    } catch (err) {
      setError(friendlyError(err));
    }
  }, [gameState, mode, address, matchId]);

  const reconnectMatch = useCallback(async () => {
    if (mode !== "MONAD") return false;
    setError("");
    if (!connected || !signerRef.current) {
      await connect();
    }
    const playerAddress =
      address || (signerRef.current ? await signerRef.current.getAddress() : "");
    if (!playerAddress) return false;
    const restored = await repoRef.current.reconnectMonad(playerAddress);
    if (!restored) {
      setError("No on-chain match found for this wallet. Start a new game.");
      return false;
    }
    const pending = loadPendingOrder();
    const withPending =
      pending && orderMatchesRound(pending, restored.match.id, restored.match.round)
        ? await monadAdapter.loadFullState(
            restored.match.id,
            restored.playerHouseId,
            playerAddress,
            pending
          )
        : restored;
    setGameState(withPending);
    setMatchId(restored.match.id);
    saveSession({
      mode: "MONAD",
      matchId: restored.match.id.toString(),
      houseId: restored.playerHouseId,
      playerAddress,
    });
    setStatus("Reconnected to on-chain match.");
    return true;
  }, [mode, connected, address, connect]);

  const startNewGame = useCallback(async (): Promise<"war" | "houses"> => {
    setError("");
    setLoading(true);
    try {
      if (mode === "LOCAL") {
        clearSession();
        setGameState(null);
        setMatchId(null);
        setStatus("Choose your house for offline development mode.");
        return "houses";
      }

      if (!connected) {
        await connect();
      }
      if (!signerRef.current || !address) throw new Error("Wallet not connected");

      const existingMatch = await monadAdapter.getPlayerMatch(address);
      if (existingMatch !== 0n) {
        const restored = await repoRef.current.reconnectMonad(address);
        if (restored) {
          setGameState(restored);
          setMatchId(restored.match.id);
          saveSession({
            mode: "MONAD",
            matchId: restored.match.id.toString(),
            houseId: restored.playerHouseId,
            playerAddress: address,
          });
          setStatus("Reconnected to your existing on-chain match.");
          return "war";
        }
      }

      setStatus("Creating match on Monad...");
      const newMatchId = await repoRef.current.createMonadMatch();
      setMatchId(newMatchId);
      setGameState(null);
      setStatus(`Match ${newMatchId.toString()} created. Choose your house.`);
      return "houses";
    } catch (err) {
      setError(friendlyError(err));
      throw err;
    } finally {
      setLoading(false);
    }
  }, [mode, connected, connect, address]);

  const joinHouse = useCallback(
    async (houseId: number) => {
      setLoading(true);
      setError("");
      try {
        if (mode === "LOCAL") {
          const next = repoRef.current.createLocal(houseId);
          setGameState(next);
          setMatchId(next.match.id);
          saveSession({ mode: "LOCAL", matchId: next.match.id.toString(), houseId });
          setStatus(`${houseId} entered the war room (local dev).`);
          return;
        }

        if (!connected || !address) throw new Error("Wallet not connected");

        let activeMatchId = matchId;
        if (!activeMatchId) {
          const restored = await repoRef.current.reconnectMonad(address);
          if (restored) {
            setGameState(restored);
            setMatchId(restored.match.id);
            saveSession({
              mode: "MONAD",
              matchId: restored.match.id.toString(),
              houseId: restored.playerHouseId,
              playerAddress: address,
            });
            setStatus("Reconnected to on-chain match.");
            return;
          }
          throw new Error("Match unavailable — create a match first");
        }

        const alreadyJoined = await monadAdapter.verifyHouseOwnership(activeMatchId, houseId, address);
        if (alreadyJoined) {
          const next = await monadAdapter.loadFullState(activeMatchId, houseId, address);
          setGameState(next);
          saveSession({
            mode: "MONAD",
            matchId: activeMatchId.toString(),
            houseId,
            playerAddress: address,
          });
          setStatus("House confirmed on-chain. Entering War Room.");
          return;
        }

        setStatus("Joining house on Monad...");
        const next = await repoRef.current.joinMonad(activeMatchId, houseId, address);
        setGameState(next);
        saveSession({
          mode: "MONAD",
          matchId: activeMatchId.toString(),
          houseId,
          playerAddress: address,
        });
        setStatus("House confirmed on-chain. Entering War Room.");
      } catch (err) {
        setError(friendlyError(err));
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [mode, connected, address, matchId]
  );

  const settleIfDue = useCallback(async () => {
    if (mode !== "MONAD" || !gameState || !matchId || !address) return;
    const now = Math.floor(Date.now() / 1000);
    if (now < gameState.match.roundDeadline + 2) return;
    if (gameState.match.status !== 1) return;
    if (settling) return;

    setSettling(true);
    setTxPhase("submitting");
    setStatus("Settling round on Monad...");
    try {
      const supportsIntents = await repoRef.current.supportsSettlementIntents();
      const pending = loadPendingOrder();
      const hasPending =
        pending && orderMatchesRound(pending, matchId, gameState.match.round);

      if (hasPending && supportsIntents) {
        await repoRef.current.settleMonad(matchId, [toContractIntent(pending)]);
        clearPendingOrder();
      } else if (hasPending) {
        setStatus("Submitting signed order on Monad...");
        await gameContract.submitIntent(toContractIntent(pending));
        clearPendingOrder();
        await repoRef.current.settleMonad(matchId);
      } else {
        await repoRef.current.settleMonad(matchId);
      }

      const next = await monadAdapter.loadFullState(matchId, gameState.playerHouseId, address, null);
      setGameState(next);
      setTxPhase("confirmed");
      setStatus(`Round ${next.match.round} begins on Monad.`);
    } catch (err) {
      const message = friendlyError(err);
      if (/already settled/i.test(message)) {
        clearPendingOrder();
        const next = await monadAdapter.loadFullState(matchId, gameState.playerHouseId, address, null);
        setGameState(next);
        setTxPhase("idle");
        setStatus(`Round ${next.match.round} advanced.`);
      } else {
        setTxPhase("failed");
        setError(message);
      }
    } finally {
      setSettling(false);
    }
  }, [mode, gameState, matchId, address, settling]);

  const submitAction = useCallback(
    async (req: ActionRequest) => {
      if (!gameState) throw new Error("No active match");
      setError("");
      try {
        if (mode === "LOCAL") {
          const validation = repoRef.current.validateLocal(gameState, req);
          if (validation) throw new Error(validation);
          const next = repoRef.current.applyLocal(gameState, req);
          setGameState(next);
          setStatus("Order resolved (local dev).");
          return;
        }

        if (!signerRef.current || !address) throw new Error("Wallet not connected");
        const validation = validateActionTarget(gameState, req);
        if (validation) throw new Error(validation);

        const pendingOrder = await signMonadOrder(gameState, signerRef.current, address, req, {
          onPhase: setTxPhase,
        });
        savePendingOrder(pendingOrder);

        const next = await monadAdapter.loadFullState(
          gameState.match.id,
          gameState.playerHouseId,
          address,
          pendingOrder
        );
        setGameState(next);
        saveSession({
          mode: "MONAD",
          matchId: gameState.match.id.toString(),
          houseId: gameState.playerHouseId,
          playerAddress: address,
          intentSubmittedRound: gameState.match.round,
        });
        setStatus("Order locked for this round. Awaiting settlement.");
      } catch (err) {
        setTxPhase("failed");
        setError(friendlyError(err));
        throw err;
      }
    },
    [gameState, mode, address]
  );

  const advanceRound = useCallback(async () => {
    if (!gameState) return;
    if (mode === "LOCAL") {
      const next = repoRef.current.resolveLocal(gameState);
      setGameState(next);
      setStatus(`Round ${next.match.round} begins (local).`);
      return;
    }
    await settleIfDue();
  }, [gameState, mode, settleIfDue]);

  // Auto-settle when round deadline passes (human wallet)
  useEffect(() => {
    if (mode !== "MONAD" || !gameState || gameState.match.status !== 1 || !matchId) return;

    const tick = () => {
      const secondsLeft = Math.max(0, gameState.match.roundDeadline - Math.floor(Date.now() / 1000));
      if (secondsLeft === 0) {
        void settleIfDue();
      }
    };

    const interval = window.setInterval(tick, 1500);
    return () => window.clearInterval(interval);
  }, [mode, gameState?.match.roundDeadline, gameState?.match.round, matchId, settleIfDue]);

  // Periodic state refresh from chain
  useEffect(() => {
    if (mode !== "MONAD" || !matchId || !gameState) return;
    const interval = window.setInterval(() => void refreshState(), 6000);
    return () => window.clearInterval(interval);
  }, [mode, matchId, gameState?.playerHouseId, refreshState]);

  // Restore session on mount
  useEffect(() => {
    const session = loadSession();
    if (!session) return;
    setMode(session.mode);
    if (session.mode === "LOCAL") {
      const restored = repoRef.current.loadLocal();
      if (restored) {
        setGameState(restored);
        setMatchId(restored.match.id);
      }
    } else if (session.matchId) {
      setMatchId(BigInt(session.matchId));
    }
  }, [setMode]);

  const value = useMemo(
    () => ({
      mode,
      gameState,
      connected,
      address,
      chainId,
      txPhase,
      loading,
      settling,
      status,
      error,
      matchId,
      setMode,
      connect,
      startNewGame,
      joinHouse,
      reconnectMatch,
      refreshState,
      submitAction,
      advanceRound,
      clearError: () => setError(""),
    }),
    [
      mode,
      gameState,
      connected,
      address,
      chainId,
      txPhase,
      loading,
      settling,
      status,
      error,
      matchId,
      setMode,
      connect,
      startNewGame,
      joinHouse,
      reconnectMatch,
      refreshState,
      submitAction,
      advanceRound,
    ]
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame must be used within GameProvider");
  return ctx;
}
