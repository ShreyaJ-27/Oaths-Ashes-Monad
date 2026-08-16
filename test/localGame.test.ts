import { describe, it, expect } from "vitest";
import {
  applyLocalAction,
  createLocalGame,
  resolveLocalRound,
  serializeGame,
  deserializeGame,
  validateLocalAction,
} from "../src/localGame";
import { GAME_CONFIG } from "../src/types";

describe("local campaign engine", () => {
  it("creates a playable six-house match", () => {
    const game = createLocalGame(5);
    expect(game.houses).toHaveLength(6);
    expect(game.territories).toHaveLength(6);
    expect(game.dragons).toHaveLength(3);
    expect(game.playerHouseId).toBe(5);
    expect(game.match.status).toBe(1);
    expect(game.events[0].name).toBe("MatchCreated");
  });

  it("taxes an owned territory without wallet interaction", () => {
    const game = createLocalGame(5);
    const before = game.houses.find((h) => h.houseId === 5)!.gold;
    const next = applyLocalAction(
      game,
      GAME_CONFIG.actions.Tax,
      GAME_CONFIG.targetTypes.Territory,
      5
    );
    const after = next.houses.find((h) => h.houseId === 5)!.gold;
    expect(after).toBeGreaterThan(before);
    expect(next.events.some((e) => e.name === "TaxCollected")).toBe(true);
    expect(next.pendingAction).toBe(true);
  });

  it("rejects attacking your own province", () => {
    const game = createLocalGame(5);
    const error = validateLocalAction(
      game,
      GAME_CONFIG.actions.Attack,
      GAME_CONFIG.targetTypes.Territory,
      5
    );
    expect(error).toMatch(/own province/i);
  });

  it("resolves an attack into a battle result", () => {
    const game = createLocalGame(5);
    const next = applyLocalAction(
      game,
      GAME_CONFIG.actions.Attack,
      GAME_CONFIG.targetTypes.Territory,
      6
    );
    expect(next.battle).not.toBeNull();
    expect(next.battle?.attackerHouseId).toBe(5);
    expect(next.battle?.territoryId).toBe(6);
    expect(next.events.some((e) => e.name === "TerritoryAttackResolved")).toBe(true);
  });

  it("advances the round with AI actions and chronicle entries", () => {
    let game = createLocalGame(5);
    game = applyLocalAction(
      game,
      GAME_CONFIG.actions.Tax,
      GAME_CONFIG.targetTypes.Territory,
      5
    );
    const round = game.match.round;
    const next = resolveLocalRound(game);
    expect(next.match.round).toBe(round + 1);
    expect(next.pendingAction).toBe(false);
    expect(next.events.some((e) => e.name === "RoundResolved")).toBe(true);
  });

  it("forms an alliance through diplomacy", () => {
    const game = createLocalGame(5);
    const next = applyLocalAction(
      game,
      GAME_CONFIG.actions.Diplomacy,
      GAME_CONFIG.targetTypes.House,
      3
    );
    expect(next.houses.find((h) => h.houseId === 5)!.activeAlliance).toBe(3);
    expect(next.events.some((e) => e.name === "AllianceFormed")).toBe(true);
  });

  it("persists and restores session state", () => {
    const game = createLocalGame(2);
    const raw = serializeGame(game);
    const restored = deserializeGame(raw);
    expect(restored?.playerHouseId).toBe(2);
    expect(restored?.match.id).toBe(1n);
    expect(restored?.houses).toHaveLength(6);
  });
});
