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
import { submitMonadAction, validateActionTarget } from "./GameActions";
import { defaultMode, loadSession, saveSession, clearSession } from "./session";
import { connectWallet } from "./wallet";
import type { ActionRequest, GameMode, GameState, TxPhase } from "./types";
import { requestAiRound, requestSettle } from "./api";
import { monadAdapter } from "./MonadAdapter";

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
  startNewGame: () => Promise<void>;
  joinHouse: (houseId: number) => Promise<void>;
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
          setGameState(restored);
          setMatchId(restored.match.id);
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
      const pending = gameState.pendingAction;
      const next = await monadAdapter.loadFullState(
        matchId,
        gameState.playerHouseId,
        address,
        pending
      );
      setGameState(next);
    } catch (err) {
      setError(friendlyError(err));
    }
  }, [gameState, mode, address, matchId]);

  const startNewGame = useCallback(async () => {
    setError("");
    setLoading(true);
    try {
      if (mode === "LOCAL") {
        clearSession();
        setGameState(null);
        setMatchId(null);
        setStatus("Choose your house for offline development mode.");
        return;
      }

      if (!connected) {
        await connect();
      }
      if (!signerRef.current) throw new Error("Wallet not connected");

      setStatus("Creating match on Monad...");
      const newMatchId = await repoRef.current.createMonadMatch();
      setMatchId(newMatchId);
      setStatus(`Match ${newMatchId.toString()} created. Choose your house.`);
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  }, [mode, connected, connect]);

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
        if (!matchId) throw new Error("Match unavailable");

        setStatus("Joining house on Monad...");
        const next = await repoRef.current.joinMonad(matchId, houseId, address);
        setGameState(next);
        saveSession({
          mode: "MONAD",
          matchId: matchId.toString(),
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

        await submitMonadAction(gameState, signerRef.current, address, req, {
          onPhase: setTxPhase,
        });

        const next = await monadAdapter.loadFullState(
          gameState.match.id,
          gameState.playerHouseId,
          address,
          true
        );
        setGameState(next);
        saveSession({
          mode: "MONAD",
          matchId: gameState.match.id.toString(),
          houseId: gameState.playerHouseId,
          playerAddress: address,
          intentSubmittedRound: gameState.match.round,
        });
        setTxPhase("confirmed");
        setStatus("Intent confirmed on Monad.");
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

    if (!matchId) return;
    setSettling(true);
    try {
      await requestSettle(matchId);
      const next = await monadAdapter.loadFullState(
        matchId,
        gameState.playerHouseId,
        address,
        false
      );
      setGameState(next);
      setStatus(`Round ${next.match.round} resolved on Monad.`);
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setSettling(false);
    }
  }, [gameState, mode, matchId, address]);

  // Sync loop: settlement + AI + refresh
  useEffect(() => {
    if (mode !== "MONAD" || !gameState || gameState.match.status !== 1 || !matchId) return;

    const tick = async () => {
      const now = Math.floor(Date.now() / 1000);
      const secondsLeft = Math.max(0, gameState.match.roundDeadline - now);

      if (secondsLeft === 0 && !settling) {
        setSettling(true);
        try {
          await requestSettle(matchId).catch(() =>
            monadAdapter.settleRound(matchId).catch(() => undefined)
          );
          await requestAiRound(matchId).catch(() => undefined);
          const next = await monadAdapter.loadFullState(
            matchId,
            gameState.playerHouseId,
            address,
            false
          );
          setGameState(next);
        } finally {
          setSettling(false);
        }
        return;
      }

      if (secondsLeft <= 3 && gameState.pendingAction) {
        await requestAiRound(matchId).catch(() => undefined);
      }
    };

    const interval = window.setInterval(() => void tick(), 2000);
    return () => window.clearInterval(interval);
  }, [mode, gameState?.match.roundDeadline, gameState?.match.round, matchId, address, settling]);

  // Periodic state refresh
  useEffect(() => {
    if (mode !== "MONAD" || !matchId || !gameState) return;
    const interval = window.setInterval(() => void refreshState(), 8000);
    return () => window.clearInterval(interval);
  }, [mode, matchId, gameState?.playerHouseId, refreshState]);

  // Restore local session on mount
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
