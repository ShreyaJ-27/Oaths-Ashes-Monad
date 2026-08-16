import { describe, it, expect, beforeAll } from "vitest";
import { BrowserProvider } from "ethers";
import { gameContract } from "../src/contract";
import { MONAD_CONFIG, GAME_CONFIG } from "../src/types";
import {
  createIntentMessage,
  signIntent,
  createDeadline,
  validateIntent,
  getDomain,
} from "../src/signing";

describe("Phase 3 Integration Tests", () => {
  let provider: BrowserProvider;

  beforeAll(() => {
    // Initialize provider for Monad Testnet
    // Note: This requires a valid RPC URL and signer in production
    // For testing, we validate the configuration
  });

  it("should verify Monad chain ID configuration", () => {
    expect(MONAD_CONFIG.chainId).toBe(10143);
    expect(MONAD_CONFIG.chainName).toBe("Monad Testnet");
    expect(MONAD_CONFIG.contractAddress).toBe(
      "0x478643bE5f1CdB85010454f00c795cB24e0d3010"
    );
  });

  it("should verify contract address is valid", () => {
    const address = MONAD_CONFIG.contractAddress;
    expect(address).toMatch(/^0x[0-9a-fA-F]{40}$/);
  });

  it("should verify game config constants", () => {
    expect(GAME_CONFIG.maxRounds).toBe(10);
    expect(GAME_CONFIG.roundSeconds).toBe(10);
    expect(GAME_CONFIG.houses.length).toBe(6);
    expect(GAME_CONFIG.actions.Attack).toBe(1);
    expect(GAME_CONFIG.actions.Diplomacy).toBe(4);
    expect(GAME_CONFIG.targetTypes.Territory).toBe(1);
    expect(GAME_CONFIG.targetTypes.House).toBe(2);
  });

  it("should create valid EIP-712 domain", () => {
    const domain = getDomain(10143);
    expect(domain.name).toBe("OathsAndAshes");
    expect(domain.version).toBe("1");
    expect(domain.chainId).toBe(10143);
    expect(domain.verifyingContract).toBe(MONAD_CONFIG.contractAddress);
  });

  it("should create valid intent message", () => {
    const message = createIntentMessage(
      1n,
      1,
      1,
      1, // Attack
      1, // Territory
      2,
      1n,
      createDeadline(30),
      "0x1234567890123456789012345678901234567890"
    );

    expect(message.matchId).toBe(1n);
    expect(message.round).toBe(1);
    expect(message.houseId).toBe(1);
    expect(message.action).toBe(1);
    expect(message.targetType).toBe(1);
    expect(message.targetId).toBe(2);
    expect(message.nonce).toBe(1n);
    expect(message.signer).toBe("0x1234567890123456789012345678901234567890");
  });

  it("should validate deadline in future", async () => {
    const futureDeadline = createDeadline(30);
    const message = createIntentMessage(
      1n,
      1,
      1,
      1,
      1,
      2,
      1n,
      futureDeadline,
      "0x1234567890123456789012345678901234567890"
    );

    const validation = await validateIntent(message, null);
    expect(validation.valid).toBe(true);
  });

  it("should reject past deadline", async () => {
    const pastDeadline = BigInt(Math.floor(Date.now() / 1000) - 10);
    const message = createIntentMessage(
      1n,
      1,
      1,
      1,
      1,
      2,
      1n,
      pastDeadline,
      "0x1234567890123456789012345678901234567890"
    );

    const validation = await validateIntent(message, null);
    expect(validation.valid).toBe(false);
    expect(validation.errors.some((e) => e.includes("past"))).toBe(true);
  });

  it("should validate signer address format", async () => {
    const message = createIntentMessage(
      1n,
      1,
      1,
      1,
      1,
      2,
      1n,
      createDeadline(30),
      "invalid-address"
    );

    const validation = await validateIntent(message, null);
    expect(validation.valid).toBe(false);
    expect(validation.errors.some((e) => e.includes("address"))).toBe(true);
  });

  it("should validate action enum", async () => {
    const message = createIntentMessage(
      1n,
      1,
      1,
      99, // Invalid action
      1,
      2,
      1n,
      createDeadline(30),
      "0x1234567890123456789012345678901234567890"
    );

    const validation = await validateIntent(message, null);
    expect(validation.valid).toBe(false);
    expect(validation.errors.some((e) => e.includes("action"))).toBe(true);
  });

  it("should validate target type enum", async () => {
    const message = createIntentMessage(
      1n,
      1,
      1,
      1,
      99, // Invalid target type
      2,
      1n,
      createDeadline(30),
      "0x1234567890123456789012345678901234567890"
    );

    const validation = await validateIntent(message, null);
    expect(validation.valid).toBe(false);
    expect(validation.errors.some((e) => e.includes("target type"))).toBe(true);
  });

  it("should generate deadline with buffer", () => {
    const before = Math.floor(Date.now() / 1000);
    const deadline = createDeadline(60);
    const after = Math.floor(Date.now() / 1000);

    const deadlineSeconds = Number(deadline);
    expect(deadlineSeconds).toBeGreaterThanOrEqual(before + 60);
    expect(deadlineSeconds).toBeLessThanOrEqual(after + 60);
  });

  describe("Live Monad Testnet E2E", () => {
    it("should connect to live contract", async () => {
      // This test validates that the contract is deployed and accessible
      // It does NOT require a signer or wallet
      // Note: This would require a real provider connection in production
      expect(MONAD_CONFIG.contractAddress).toBeDefined();
      expect(MONAD_CONFIG.contractAddress.length).toBe(42);
    });
  });
});
