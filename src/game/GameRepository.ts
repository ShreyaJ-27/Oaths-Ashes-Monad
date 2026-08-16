import type { GameMode } from "./types";
import { localAdapter } from "./LocalAdapter";
import { monadAdapter } from "./MonadAdapter";
import type { ActionRequest, GameState } from "./types";
import { bootstrapAiHouses } from "./api";

export class GameRepository {
  constructor(private mode: GameMode) {}

  getMode() {
    return this.mode;
  }

  setMode(mode: GameMode) {
    this.mode = mode;
  }

  async loadMonad(matchId: bigint, houseId: number, address: string, pending = false) {
    return monadAdapter.loadFullState(matchId, houseId, address, pending);
  }

  async createMonadMatch() {
    return monadAdapter.createMatch();
  }

  async joinMonad(matchId: bigint, houseId: number, address: string) {
    await monadAdapter.joinMatch(matchId, houseId, address);
    await bootstrapAiHouses(matchId, houseId).catch(() => undefined);
    return monadAdapter.loadFullState(matchId, houseId, address);
  }

  async settleMonad(matchId: bigint) {
    return monadAdapter.settleRound(matchId);
  }

  async reconnectMonad(address: string) {
    const matchId = await monadAdapter.getPlayerMatch(address);
    if (matchId === 0n) return null;
    for (let houseId = 1; houseId <= 6; houseId++) {
      const ok = await monadAdapter.verifyHouseOwnership(matchId, houseId, address);
      if (ok) return monadAdapter.loadFullState(matchId, houseId, address);
    }
    return null;
  }

  createLocal(houseId: number) {
    return localAdapter.create(houseId);
  }

  loadLocal() {
    return localAdapter.load();
  }

  applyLocal(state: GameState, req: ActionRequest) {
    return localAdapter.applyAction(state, req);
  }

  resolveLocal(state: GameState) {
    return localAdapter.resolveRound(state);
  }

  validateLocal(state: GameState, req: ActionRequest) {
    return localAdapter.validate(state, req);
  }
}

export function createRepository(mode: GameMode) {
  return new GameRepository(mode);
}
