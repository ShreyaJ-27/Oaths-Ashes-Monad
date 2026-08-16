import { gameContract } from "../contract";
import type { GameState } from "./types";
import {
  buildGameState,
  normalizeDragon,
  normalizeHouse,
  normalizeMatch,
  normalizeTerritory,
} from "./normalize";

export class MonadAdapter {
  async loadFullState(
    matchId: bigint,
    playerHouseId: number,
    playerAddress: string,
    pendingAction = false
  ): Promise<GameState> {
    const [matchRaw, housesRaw, territoriesRaw, dragonsRaw, events] = await Promise.all([
      gameContract.getMatchSummary(matchId),
      Promise.all([1, 2, 3, 4, 5, 6].map((id) => gameContract.getHouseState(matchId, id))),
      Promise.all([1, 2, 3, 4, 5, 6].map((id) => gameContract.getTerritoryState(matchId, id))),
      Promise.all([1, 2, 3].map((id) => gameContract.getDragonState(matchId, id))),
      gameContract.getRecentEvents(matchId),
    ]);

    return buildGameState({
      mode: "MONAD",
      match: normalizeMatch(matchRaw),
      playerHouseId,
      playerAddress,
      houses: housesRaw.map((h) => normalizeHouse(h as Record<string, unknown>)),
      territories: territoriesRaw.map((t) => normalizeTerritory(t as Record<string, unknown>)),
      dragons: dragonsRaw.map((d) => normalizeDragon(d as Record<string, unknown>)),
      events,
      pendingAction,
      syncStatus: "idle",
    });
  }

  async createMatch(): Promise<bigint> {
    return gameContract.createMatch();
  }

  async joinMatch(matchId: bigint, houseId: number, playerAddress: string): Promise<void> {
    await gameContract.joinMatch(matchId, houseId);
    const owner = await gameContract.getHousePlayer(matchId, houseId);
    if (owner.toLowerCase() !== playerAddress.toLowerCase()) {
      throw new Error("House ownership not confirmed on-chain");
    }
  }

  async verifyHouseOwnership(
    matchId: bigint,
    houseId: number,
    playerAddress: string
  ): Promise<boolean> {
    const owner = await gameContract.getHousePlayer(matchId, houseId);
    return owner.toLowerCase() === playerAddress.toLowerCase();
  }

  async getPlayerMatch(playerAddress: string): Promise<bigint> {
    return gameContract.getPlayerMatch(playerAddress);
  }

  async settleRound(matchId: bigint): Promise<string> {
    return gameContract.settleRound(matchId);
  }

  async getUsedNonce(matchId: bigint, houseId: number): Promise<bigint> {
    return gameContract.getUsedNonce(matchId, houseId);
  }

  async refreshEvents(matchId: bigint) {
    return gameContract.getRecentEvents(matchId);
  }
}

export const monadAdapter = new MonadAdapter();
