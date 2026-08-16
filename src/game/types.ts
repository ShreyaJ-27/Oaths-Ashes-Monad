import type {
  DragonState,
  HouseState,
  MatchState,
  TerritoryState,
} from "../types";

export type GameMode = "MONAD" | "LOCAL";

export type TxPhase =
  | "idle"
  | "wallet_required"
  | "signing"
  | "submitting"
  | "confirming"
  | "confirmed"
  | "failed";

export type ChainEvent = {
  id: string;
  name: string;
  blockNumber: number;
  transactionHash: string;
  logIndex: number;
  args: Record<string, unknown>;
};

export type BattleResult = {
  round: number;
  attackerHouseId: number;
  defenderHouseId: number;
  territoryId: number;
  attackPower: number;
  defensePower: number;
  victory: boolean;
  summary: string;
};

export type GameState = {
  mode: GameMode;
  match: MatchState;
  playerHouseId: number;
  playerAddress: string;
  houses: HouseState[];
  territories: TerritoryState[];
  dragons: DragonState[];
  events: ChainEvent[];
  battle: BattleResult | null;
  pendingAction: boolean;
  syncStatus: "idle" | "loading" | "syncing" | "error";
  chainError?: string;
};

export type PlayerSession = {
  mode: GameMode;
  matchId: string;
  houseId: number;
  playerAddress?: string;
  intentSubmittedRound?: number;
};

export type ActionRequest = {
  action: number;
  targetType: number;
  targetId: number;
};
