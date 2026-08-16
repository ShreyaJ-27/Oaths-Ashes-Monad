import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  clearPendingOrder,
  fromSignedIntent,
  loadPendingOrder,
  orderMatchesRound,
  savePendingOrder,
  toContractIntent,
} from "../src/game/pendingOrder";

describe("pending order session", () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
    });
    clearPendingOrder();
  });

  it("saves and loads a pending signed order", () => {
    const order = {
      matchId: "3",
      round: 2,
      houseId: 5,
      action: 6,
      targetType: 1,
      targetId: 5,
      nonce: "4",
      deadline: "9999999999",
      signer: "0x4d3a45ab462b33c20555aF9F6bd1e6b794ad86a7",
      signature: "0xabc",
    };
    savePendingOrder(order);
    expect(loadPendingOrder()).toEqual(order);
  });

  it("matches the active round", () => {
    const order = {
      matchId: "1",
      round: 3,
      houseId: 1,
      action: 1,
      targetType: 1,
      targetId: 2,
      nonce: "1",
      deadline: "1",
      signer: "0x0000000000000000000000000000000000000001",
      signature: "0x",
    };
    expect(orderMatchesRound(order, 1n, 3)).toBe(true);
    expect(orderMatchesRound(order, 1n, 4)).toBe(false);
  });

  it("round-trips to contract intent shape", () => {
    const intent = {
      matchId: 2n,
      round: 1,
      houseId: 3,
      action: 2,
      targetType: 1,
      targetId: 3,
      nonce: 5n,
      deadline: 12345n,
      signer: "0x0000000000000000000000000000000000000002",
      signature: "0xsig",
    };
    const order = fromSignedIntent(intent);
    const back = toContractIntent(order);
    expect(back.matchId).toBe(intent.matchId);
    expect(back.round).toBe(intent.round);
    expect(back.signature).toBe(intent.signature);
  });
});
