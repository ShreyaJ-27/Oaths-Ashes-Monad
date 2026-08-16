import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { Contract, JsonRpcProvider, Wallet } from "ethers";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const abi = JSON.parse(
  readFileSync(join(ROOT, "out/OathsAndAshes.sol/OathsAndAshes.json"), "utf8")
).abi;

const RPC_URL = process.env.MONAD_TEST_RPC_URL || "https://testnet-rpc.monad.xyz";
const CONTRACT = process.env.MONAD_CONTRACT_ADDRESS || "0x478643bE5f1CdB85010454f00c795cB24e0d3010";
const PORT = Number(process.env.PORT || 8787);

const provider = new JsonRpcProvider(RPC_URL);
const contract = new Contract(CONTRACT, abi, provider);

function agentKeys() {
  const raw = process.env.AI_AGENT_PRIVATE_KEYS || process.env.MONAD_TEST_PRIVATE_KEY || "";
  return raw
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);
}

function wallets() {
  return agentKeys().map((key, index) => ({
    index,
    wallet: new Wallet(key, provider),
    contract: new Contract(CONTRACT, abi, new Wallet(key, provider)),
  }));
}

const PERSONALITIES = ["conqueror", "defender", "diplomat", "dragonlord", "schemer", "opportunist"];

function chooseAction(houseId, match, houses, territories) {
  const house = houses.find((h) => h.houseId === houseId);
  if (!house) return { action: 2, targetType: 1, targetId: houseId };

  const owned = territories.filter((t) => t.ownerHouseId === houseId);
  const enemies = territories.filter((t) => t.ownerHouseId !== houseId);
  const personality = PERSONALITIES[(houseId - 1) % PERSONALITIES.length];

  if (personality === "defender" && owned.length) {
    return { action: 2, targetType: 1, targetId: owned[0].territoryId };
  }
  if (personality === "diplomat") {
    const target = ((houseId % 6) + 1);
    return { action: 4, targetType: 2, targetId: target === houseId ? ((target % 6) + 1) : target };
  }
  if (personality === "dragonlord" && house.dragonId > 0 && enemies.length) {
    return { action: 3, targetType: 1, targetId: enemies[0].territoryId };
  }
  if (enemies.length && house.military >= 5) {
    const target = enemies.sort((a, b) => a.defensiveValue - b.defensiveValue)[0];
    return { action: 1, targetType: 1, targetId: target.territoryId };
  }
  if (owned.length) {
    return { action: 6, targetType: 1, targetId: owned[0].territoryId };
  }
  return { action: 2, targetType: 1, targetId: house.territoryId || 1 };
}

async function loadMatchState(matchId) {
  const match = await contract.getMatchSummary(matchId);
  const houses = await Promise.all([1, 2, 3, 4, 5, 6].map((id) => contract.houseStates(matchId, id)));
  const territories = await Promise.all([1, 2, 3, 4, 5, 6].map((id) => contract.getTerritoryState(matchId, id)));
  return {
    match: {
      round: Number(match[2]),
      roundDeadline: Number(match[4]),
      status: Number(match[1]),
    },
    houses: houses.map((h) => ({
      houseId: Number(h[0]),
      gold: Number(h[1]),
      influence: Number(h[2]),
      military: Number(h[3]),
      reputation: Number(h[4]),
      territoryId: Number(h[5]),
      dragonId: Number(h[7]),
    })),
    territories: territories.map((t) => ({
      territoryId: Number(t[0]),
      ownerHouseId: Number(t[1]),
      defensiveValue: Number(t[3]),
    })),
  };
}

async function signAndSubmit(agent, matchId, houseId, action, targetType, targetId, round) {
  const nonce = BigInt(await agent.contract.usedNonce(matchId, houseId)) + 1n;
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 45);
  const message = {
    matchId,
    round,
    houseId,
    action,
    targetType,
    targetId,
    nonce,
    deadline,
    signer: agent.wallet.address,
  };
  const domain = {
    name: "OathsAndAshes",
    version: "1",
    chainId: 10143,
    verifyingContract: CONTRACT,
  };
  const types = {
    Intent: [
      { name: "matchId", type: "uint256" },
      { name: "round", type: "uint8" },
      { name: "houseId", type: "uint8" },
      { name: "action", type: "uint8" },
      { name: "targetType", type: "uint8" },
      { name: "targetId", type: "uint8" },
      { name: "nonce", type: "uint256" },
      { name: "deadline", type: "uint256" },
      { name: "signer", type: "address" },
    ],
  };
  const signature = await agent.wallet.signTypedData(domain, types, message);
  const tx = await agent.contract.submitIntent({ ...message, signature });
  await tx.wait();
  return tx.hash;
}

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true, agents: wallets().length, contract: CONTRACT });
});

app.post("/api/match/:matchId/bootstrap-ai", async (req, res) => {
  try {
    const matchId = BigInt(req.params.matchId);
    const excludeHouseId = Number(req.body?.excludeHouseId || 0);
    const agents = wallets();
    if (!agents.length) {
      return res.status(503).json({ error: "No AI agent keys configured" });
    }

    const joined = [];
    let agentIndex = 0;
    for (let houseId = 1; houseId <= 6; houseId++) {
      if (houseId === excludeHouseId) continue;
      const current = await contract.houseToPlayer(matchId, houseId);
      if (current !== "0x0000000000000000000000000000000000000000") continue;

      const agent = agents[agentIndex % agents.length];
      agentIndex++;
      const playerMatch = await contract.playerToMatch(agent.wallet.address);
      if (BigInt(playerMatch) !== 0n && BigInt(playerMatch) !== matchId) continue;

      const tx = await agent.contract.joinMatch(matchId, houseId);
      await tx.wait();
      joined.push({ houseId, address: agent.wallet.address });
    }

    res.json({ ok: true, joined });
  } catch (err) {
    res.status(500).json({ error: err.message || "bootstrap failed" });
  }
});

app.post("/api/match/:matchId/ai-round", async (req, res) => {
  try {
    const matchId = BigInt(req.params.matchId);
    const state = await loadMatchState(matchId);
    if (state.match.status !== 1) return res.json({ ok: true, skipped: "match inactive" });

    const agents = wallets();
    const results = await Promise.all(
      agents.map(async (agent) => {
        for (let houseId = 1; houseId <= 6; houseId++) {
          const owner = await contract.houseToPlayer(matchId, houseId);
          if (owner.toLowerCase() !== agent.wallet.address.toLowerCase()) continue;
          const usedNonce = BigInt(await contract.usedNonce(matchId, houseId));
          const choice = chooseAction(houseId, state.match, state.houses, state.territories);
          try {
            const hash = await signAndSubmit(
              agent,
              matchId,
              houseId,
              choice.action,
              choice.targetType,
              choice.targetId,
              state.match.round
            );
            return { houseId, hash, nonce: usedNonce + 1n };
          } catch (err) {
            return { houseId, error: err.message };
          }
        }
        return null;
      })
    );

    res.json({ ok: true, results: results.filter(Boolean) });
  } catch (err) {
    res.status(500).json({ error: err.message || "ai round failed" });
  }
});

app.post("/api/match/:matchId/settle", async (req, res) => {
  try {
    const matchId = BigInt(req.params.matchId);
    const match = await contract.getMatchSummary(matchId);
    const deadline = Number(match[4]);
    const now = Math.floor(Date.now() / 1000);
    if (now < deadline) {
      return res.json({ ok: false, reason: "deadline not reached" });
    }

    const agents = wallets();
    if (!agents.length) return res.status(503).json({ error: "No settle wallet configured" });

    const tx = await agents[0].contract.settleRound(matchId);
    const receipt = await tx.wait();
    res.json({ ok: true, hash: receipt.hash });
  } catch (err) {
    res.status(500).json({ error: err.message || "settlement failed" });
  }
});

app.listen(PORT, () => {
  console.log(`Oaths & Ashes orchestrator listening on :${PORT}`);
});
