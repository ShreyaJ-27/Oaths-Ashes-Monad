/**
 * Live Monad Testnet E2E — requires MONAD_TEST_PRIVATE_KEY in .env
 * Run: npm run monad-e2e
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Contract, JsonRpcProvider, Wallet } from "ethers";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { config } from "dotenv";
import { MONAD_CONFIG, GAME_CONFIG } from "../src/types";
import { createDeadline, createIntentMessage, signIntent } from "../src/signing";

config();

const PRIVATE_KEY = process.env.MONAD_TEST_PRIVATE_KEY || "";
const RPC = process.env.MONAD_TEST_RPC_URL || MONAD_CONFIG.rpcUrl;
const CONTRACT = process.env.MONAD_CONTRACT_ADDRESS || MONAD_CONFIG.contractAddress;

const abi = JSON.parse(
  readFileSync(join(process.cwd(), "out/OathsAndAshes.sol/OathsAndAshes.json"), "utf8")
).abi;

const describeLive = PRIVATE_KEY ? describe : describe.skip;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function isRateLimitError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  const info = (err as { info?: { error?: { message?: string } } })?.info?.error?.message || "";
  return /15\/sec|50\/second|request limit|rate limit|429/i.test(`${message} ${info}`);
}

async function callWithRetry<T>(fn: () => Promise<T>, attempts = 10): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (!isRateLimitError(err)) throw err;
      await sleep(3000 * (i + 1));
    }
  }
  throw lastError;
}

async function waitForTx(provider: JsonRpcProvider, hash: string, attempts = 12) {
  for (let i = 0; i < attempts; i++) {
    try {
      await sleep(1500);
      const receipt = await provider.getTransactionReceipt(hash);
      if (receipt) {
        if (receipt.status !== 1) throw new Error(`Transaction failed: ${hash}`);
        return receipt;
      }
    } catch (err) {
      if (!isRateLimitError(err)) throw err;
      await sleep(3000 * (i + 1));
    }
  }
  throw new Error(`Transaction receipt not found: ${hash}`);
}

async function sendTx(
  provider: JsonRpcProvider,
  fn: () => Promise<{ hash: string }>
) {
  const tx = await callWithRetry(fn);
  return waitForTx(provider, tx.hash);
}

async function safeSettle(provider: JsonRpcProvider, contract: Contract, matchId: bigint) {
  try {
    const settleTx = await callWithRetry(() => contract.settleRound(matchId));
    await sendTx(provider, () => Promise.resolve(settleTx));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (!/already settled/i.test(message)) throw err;
  }
}

describeLive("Monad Testnet human E2E", () => {
  let provider: JsonRpcProvider;
  let wallet: Wallet;
  let contract: Contract;

  beforeAll(() => {
    if (!PRIVATE_KEY) return;
    provider = new JsonRpcProvider(RPC);
    wallet = new Wallet(PRIVATE_KEY, provider);
    contract = new Contract(CONTRACT, abi, wallet);
  });

  afterAll(async () => {
    await sleep(1500);
    provider?.destroy();
  });

  it("creates or resumes match, joins house, submits Tax intent, and settles round", async () => {
    await sleep(5000);

    const network = await callWithRetry(() => provider.getNetwork());
    expect(Number(network.chainId)).toBe(MONAD_CONFIG.chainId);

    const existingMatch = BigInt(await callWithRetry(() => contract.playerToMatch(wallet.address)));
    let matchId: bigint;
    let houseId: number;

    if (existingMatch !== 0n) {
      matchId = existingMatch;
      houseId = 0;
      for (let id = 1; id <= 6; id++) {
        const owner = await callWithRetry(() => contract.houseToPlayer(matchId, id));
        if (owner.toLowerCase() === wallet.address.toLowerCase()) {
          houseId = id;
          break;
        }
      }
      expect(houseId!).toBeGreaterThan(0);
    } else {
      const counterBefore = BigInt(await callWithRetry(() => contract.matchCounter()));
      const createTx = await callWithRetry(() => contract.createMatch());
      await sendTx(provider, () => Promise.resolve(createTx));
      matchId = counterBefore + 1n;

      const summary = await callWithRetry(() => contract.getMatchSummary(matchId));
      expect(Number(summary[1])).toBe(1); // Active

      houseId = 0;
      for (let id = 1; id <= 6; id++) {
        const owner = await callWithRetry(() => contract.houseToPlayer(matchId, id));
        if (owner === "0x0000000000000000000000000000000000000000") {
          houseId = id;
          break;
        }
      }
      expect(houseId).toBeGreaterThan(0);

      const joinTx = await callWithRetry(() => contract.joinMatch(matchId, houseId));
      await sendTx(provider, () => Promise.resolve(joinTx));

      const owner = await callWithRetry(() => contract.houseToPlayer(matchId, houseId));
      expect(owner.toLowerCase()).toBe(wallet.address.toLowerCase());
    }

    await sleep(1500);

    const match = await callWithRetry(() => contract.getMatchSummary(matchId));
    const round = Number(match[2]);
    const deadline = Number(match[4]);
    const now = Math.floor(Date.now() / 1000);

    if (now >= deadline) {
      await safeSettle(provider, contract, matchId);
      await sleep(1500);
    }

    const fresh = await callWithRetry(() => contract.getMatchSummary(matchId));
    const activeRound = Number(fresh[2]);
    const roundDeadline = Number(fresh[4]);
    const usedNonce = BigInt(await callWithRetry(() => contract.usedNonce(matchId, houseId)));
    const nextNonce = usedNonce + 1n;
    const intentDeadline = BigInt(roundDeadline + 120);

    const message = createIntentMessage(
      matchId,
      activeRound,
      houseId,
      GAME_CONFIG.actions.Tax,
      GAME_CONFIG.targetTypes.Territory,
      houseId,
      nextNonce,
      intentDeadline,
      wallet.address
    );

    const signature = await signIntent(wallet, message, MONAD_CONFIG.chainId);
    const signedIntent = { ...message, signature };
    const supportsSettlementIntents = Boolean(contract.interface.getFunction("settleRoundWithIntents"));

    if (!supportsSettlementIntents) {
      const intentTx = await callWithRetry(() => contract.submitIntent(signedIntent));
      await sendTx(provider, () => Promise.resolve(intentTx));
      expect(BigInt(await callWithRetry(() => contract.usedNonce(matchId, houseId)))).toBe(nextNonce);
    }

    const afterSubmit = await callWithRetry(() => contract.getMatchSummary(matchId));
    const settleDeadline = Number(afterSubmit[4]);
    await sleep(Math.max(0, settleDeadline - Math.floor(Date.now() / 1000) + 2) * 1000);

    if (supportsSettlementIntents) {
      const settleTx = await callWithRetry(() => contract.settleRoundWithIntents(matchId, [signedIntent]));
      await sendTx(provider, () => Promise.resolve(settleTx));
      expect(BigInt(await callWithRetry(() => contract.usedNonce(matchId, houseId)))).toBe(nextNonce);
    } else {
      await safeSettle(provider, contract, matchId);
    }

    const after = await callWithRetry(() => contract.getMatchSummary(matchId));
    expect(Number(after[2])).toBeGreaterThanOrEqual(round);
  }, 180000);
});
