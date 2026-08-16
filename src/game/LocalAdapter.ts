import {
  applyLocalAction,
  createLocalGame,
  loadLocalGame,
  LocalGameState,
  resolveLocalRound,
  saveLocalGame,
  validateLocalAction,
} from "../localGame";
import type { ActionRequest, GameState } from "./types";
import { buildGameState } from "./normalize";

function fromLocal(local: LocalGameState): GameState {
  return buildGameState({
    mode: "LOCAL",
    match: local.match,
    playerHouseId: local.playerHouseId,
    playerAddress: "local-dev",
    houses: local.houses,
    territories: local.territories,
    dragons: local.dragons,
    events: local.events,
    pendingAction: local.pendingAction,
    syncStatus: "idle",
  });
}

export class LocalAdapter {
  create(playerHouseId: number): GameState {
    const local = createLocalGame(playerHouseId);
    saveLocalGame(local);
    return fromLocal(local);
  }

  load(): GameState | null {
    const local = loadLocalGame();
    return local ? fromLocal(local) : null;
  }

  save(state: GameState) {
    const local: LocalGameState = {
      match: state.match,
      playerHouseId: state.playerHouseId,
      houses: state.houses,
      territories: state.territories,
      dragons: state.dragons,
      events: state.events,
      nonce: 1n,
      battle: state.battle,
      pendingAction: state.pendingAction,
      mode: "local",
    };
    saveLocalGame(local);
  }

  applyAction(state: GameState, req: ActionRequest): GameState {
    const local: LocalGameState = {
      match: state.match,
      playerHouseId: state.playerHouseId,
      houses: state.houses,
      territories: state.territories,
      dragons: state.dragons,
      events: state.events,
      nonce: 1n,
      battle: state.battle,
      pendingAction: state.pendingAction,
      mode: "local",
    };
    const next = applyLocalAction(local, req.action, req.targetType, req.targetId);
    saveLocalGame(next);
    return fromLocal(next);
  }

  resolveRound(state: GameState): GameState {
    const local: LocalGameState = {
      match: state.match,
      playerHouseId: state.playerHouseId,
      houses: state.houses,
      territories: state.territories,
      dragons: state.dragons,
      events: state.events,
      nonce: 1n,
      battle: state.battle,
      pendingAction: state.pendingAction,
      mode: "local",
    };
    const next = resolveLocalRound(local);
    saveLocalGame(next);
    return fromLocal(next);
  }

  validate(state: GameState, req: ActionRequest): string | null {
    const local: LocalGameState = {
      match: state.match,
      playerHouseId: state.playerHouseId,
      houses: state.houses,
      territories: state.territories,
      dragons: state.dragons,
      events: state.events,
      nonce: 1n,
      battle: state.battle,
      pendingAction: state.pendingAction,
      mode: "local",
    };
    return validateLocalAction(local, req.action, req.targetType, req.targetId);
  }
}

export const localAdapter = new LocalAdapter();
