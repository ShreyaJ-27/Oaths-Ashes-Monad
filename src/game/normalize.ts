import type { DragonState, HouseState, MatchState, TerritoryState } from "../types";
import type { BattleResult, ChainEvent, GameState } from "./types";
import type { PendingOrder } from "./pendingOrder";
import { orderMatchesRound } from "./pendingOrder";

export function asNumber(value: unknown): number {
  return Number(value ?? 0);
}

export function normalizeMatch(raw: {
  id: unknown;
  status: unknown;
  round: unknown;
  roundStart: unknown;
  roundDeadline: unknown;
  playersJoined: unknown;
  winnerHouseId: unknown;
  throneStreak: unknown;
}): MatchState {
  return {
    id: BigInt(raw.id as bigint | number | string),
    status: asNumber(raw.status),
    round: asNumber(raw.round),
    roundStart: asNumber(raw.roundStart),
    roundDeadline: asNumber(raw.roundDeadline),
    playersJoined: asNumber(raw.playersJoined),
    winnerHouseId: asNumber(raw.winnerHouseId),
    throneStreak: asNumber(raw.throneStreak),
  };
}

export function normalizeHouse(raw: Record<string, unknown>): HouseState {
  return {
    houseId: asNumber(raw.houseId),
    gold: asNumber(raw.gold),
    influence: asNumber(raw.influence),
    military: asNumber(raw.military),
    reputation: asNumber(raw.reputation),
    territoryId: asNumber(raw.territoryId),
    passive: asNumber(raw.passive),
    dragonId: asNumber(raw.dragonId),
    activeAlliance: asNumber(raw.activeAlliance),
    vengeanceUntil: asNumber(raw.vengeanceUntil),
    alive: Boolean(raw.alive),
  };
}

export function normalizeTerritory(raw: Record<string, unknown>): TerritoryState {
  return {
    territoryId: asNumber(raw.territoryId),
    ownerHouseId: asNumber(raw.ownerHouseId),
    resourceValue: asNumber(raw.resourceValue),
    defensiveValue: asNumber(raw.defensiveValue),
    fortificationLevel: asNumber(raw.fortificationLevel),
    isThrone: Boolean(raw.isThrone),
    sabotageUntil: asNumber(raw.sabotageUntil),
    lastTaxRound: asNumber(raw.lastTaxRound),
  };
}

export function normalizeDragon(raw: Record<string, unknown>): DragonState {
  return {
    dragonId: asNumber(raw.dragonId),
    ownerHouseId: asNumber(raw.ownerHouseId),
    power: asNumber(raw.power),
    armor: asNumber(raw.armor),
    speed: asNumber(raw.speed),
    loyalty: asNumber(raw.loyalty),
    wounds: asNumber(raw.wounds),
    alive: Boolean(raw.alive),
    deathRound: asNumber(raw.deathRound),
  };
}

export function deriveBattleFromEvents(
  events: ChainEvent[],
  playerHouseId: number
): BattleResult | null {
  const attack = events.find(
    (e) =>
      e.name === "TerritoryAttackResolved" &&
      asNumber(e.args.attackerHouseId ?? e.args.houseId) === playerHouseId
  );
  if (!attack) return null;

  const territoryId = asNumber(attack.args.territoryId);
  const attackPower = asNumber(attack.args.attackScore ?? attack.args.attackPower);
  const defensePower = asNumber(attack.args.defenseScore ?? attack.args.defensePower);
  const captured = events.find(
    (e) =>
      e.name === "TerritoryCaptured" &&
      asNumber(e.args.territoryId) === territoryId &&
      asNumber(e.args.newOwnerHouseId ?? e.args.houseId) === playerHouseId
  );

  const victory = Boolean(captured);
  const defenderHouseId = asNumber(
    attack.args.defenderHouseId ?? attack.args.previousOwnerHouseId ?? attack.args.targetHouseId
  );

  return {
    round: asNumber(attack.args.round),
    attackerHouseId: asNumber(attack.args.attackerHouseId ?? attack.args.houseId),
    defenderHouseId: defenderHouseId || 1,
    territoryId,
    attackPower: attackPower || 0,
    defensePower: defensePower || 0,
    victory,
    summary: victory ? "The assault broke the defenses." : "The defenders held the walls.",
  };
}

export function buildGameState(input: {
  mode: GameState["mode"];
  match: MatchState;
  playerHouseId: number;
  playerAddress: string;
  houses: HouseState[];
  territories: TerritoryState[];
  dragons: DragonState[];
  events: ChainEvent[];
  pendingOrder?: PendingOrder | null;
  syncStatus?: GameState["syncStatus"];
  chainError?: string;
}): GameState {
  const pendingOrder = input.pendingOrder ?? null;
  return {
    mode: input.mode,
    match: input.match,
    playerHouseId: input.playerHouseId,
    playerAddress: input.playerAddress,
    houses: input.houses,
    territories: input.territories,
    dragons: input.dragons,
    events: input.events,
    battle: deriveBattleFromEvents(input.events, input.playerHouseId),
    pendingOrder,
    pendingAction: orderMatchesRound(pendingOrder, input.match.id, input.match.round),
    syncStatus: input.syncStatus ?? "idle",
    chainError: input.chainError,
  };
}
