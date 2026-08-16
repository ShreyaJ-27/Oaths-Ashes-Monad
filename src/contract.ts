import { Contract, BrowserProvider } from "ethers";
import { MONAD_CONFIG, GAME_CONFIG, Intent } from "./types";
import contractABI from "../out/OathsAndAshes.sol/OathsAndAshes.json";

export class GameContract {
  private provider: BrowserProvider | null = null;
  private contract: Contract | null = null;
  private signer: any = null;

  async initialize(provider: BrowserProvider) {
    this.provider = provider;
    this.contract = new Contract(
      MONAD_CONFIG.contractAddress,
      contractABI.abi,
      provider
    );
  }

  setSigner(signer: any) {
    this.signer = signer;
    if (this.contract) {
      this.contract = this.contract.connect(signer) as Contract;
    }
  }

  // Get match counter
  async getMatchCounter(): Promise<bigint> {
    if (!this.contract) throw new Error("Contract not initialized");
    return BigInt(await this.contract.matchCounter());
  }

  // Create a new match
  async createMatch(): Promise<bigint> {
    if (!this.contract || !this.signer) throw new Error("Contract not initialized");

    // Get current counter
    const currentCounter = await this.getMatchCounter();
    
    // Submit transaction
    const tx = await this.contract.createMatch();
    const receipt = await tx.wait();
    if (!receipt || receipt.status !== 1) {
      throw new Error("Create match transaction failed");
    }
    
    // New match ID is currentCounter + 1
    return currentCounter + 1n;
  }

  // Join a match with a house
  async joinMatch(matchId: bigint, houseId: number): Promise<string> {
    if (!this.contract || !this.signer) throw new Error("Contract not initialized");

    const tx = await this.contract.joinMatch(matchId, houseId);
    const receipt = await tx.wait();
    if (!receipt || receipt.status !== 1) {
      throw new Error("Join house transaction failed");
    }
    return receipt.hash;
  }

  // Submit signed intent
  async submitIntent(intent: Intent): Promise<string> {
    if (!this.contract || !this.signer) throw new Error("Contract not initialized");

    const tx = await this.contract.submitIntent({
      matchId: intent.matchId,
      round: intent.round,
      houseId: intent.houseId,
      action: intent.action,
      targetType: intent.targetType,
      targetId: intent.targetId,
      nonce: intent.nonce,
      deadline: intent.deadline,
      signer: intent.signer,
      signature: intent.signature,
    });
    const receipt = await tx.wait();
    if (!receipt || receipt.status !== 1) {
      throw new Error("Intent transaction failed");
    }
    return receipt.hash;
  }

  // Settle round
  async settleRound(matchId: bigint): Promise<string> {
    if (!this.contract || !this.signer) throw new Error("Contract not initialized");

    const tx = await this.contract.settleRound(matchId);
    const receipt = await tx.wait();
    if (!receipt || receipt.status !== 1) {
      throw new Error("Settlement transaction failed");
    }
    return receipt.hash;
  }

  async getHousePlayer(matchId: bigint, houseId: number): Promise<string> {
    if (!this.contract) throw new Error("Contract not initialized");
    return this.contract.houseToPlayer(matchId, houseId);
  }

  // Get match summary
  async getMatchSummary(matchId: bigint) {
    if (!this.contract) throw new Error("Contract not initialized");

    const result = await this.contract.getMatchSummary(matchId);
    return {
      id: result[0],
      status: result[1], // 0: Created, 1: Active, 2: Finished
      round: result[2],
      roundStart: result[3],
      roundDeadline: result[4],
      playersJoined: result[5],
      winnerHouseId: result[6],
      throneStreak: result[7],
    };
  }

  // Get house state
  async getHouseState(matchId: bigint, houseId: number) {
    if (!this.contract) throw new Error("Contract not initialized");

    const result = await this.contract.houseStates(matchId, houseId);
    return {
      houseId: result[0],
      gold: result[1],
      influence: result[2],
      military: result[3],
      reputation: result[4],
      territoryId: result[5],
      passive: result[6],
      dragonId: result[7],
      activeAlliance: result[8],
      vengeanceUntil: result[9],
      alive: result[10],
    };
  }

  // Get territory state
  async getTerritoryState(matchId: bigint, territoryId: number) {
    if (!this.contract) throw new Error("Contract not initialized");

    const result = await this.contract.getTerritoryState(matchId, territoryId);
    return {
      territoryId: result[0],
      ownerHouseId: result[1],
      resourceValue: result[2],
      defensiveValue: result[3],
      fortificationLevel: result[4],
      isThrone: result[5],
      sabotageUntil: result[6],
      lastTaxRound: result[7],
    };
  }

  // Get dragon state
  async getDragonState(matchId: bigint, dragonId: number) {
    if (!this.contract) throw new Error("Contract not initialized");

    const result = await this.contract.dragonStates(matchId, dragonId);
    return {
      dragonId: result[0],
      ownerHouseId: result[1],
      power: result[2],
      armor: result[3],
      speed: result[4],
      loyalty: result[5],
      wounds: result[6],
      alive: result[7],
      deathRound: result[8],
    };
  }

  // Get domain separator for EIP-712 verification
  async getDomainSeparator(): Promise<string> {
    if (!this.contract) throw new Error("Contract not initialized");

    return this.contract.getDomainSeparator();
  }

  // Get used nonce
  async getUsedNonce(matchId: bigint, houseId: number): Promise<bigint> {
    if (!this.contract) throw new Error("Contract not initialized");

    return this.contract.usedNonce(matchId, houseId);
  }

  async getPlayerMatch(playerAddress: string): Promise<bigint> {
    if (!this.contract) throw new Error("Contract not initialized");
    const matchId = await this.contract.playerToMatch(playerAddress);
    return BigInt(matchId);
  }

  async getRecentEvents(matchId: bigint, fromBlockDepth = 1000) {
    if (!this.contract || !this.provider) throw new Error("Contract not initialized");

    const eventNames = [
      "MatchCreated",
      "IntentSubmitted",
      "IntentRejected",
      "RoundResolved",
      "TerritoryCaptured",
      "FortificationRaised",
      "TerritoryAttackResolved",
      "DragonStrike",
      "DragonWounded",
      "DragonKilled",
      "DragonCaptured",
      "TaxCollected",
      "ThroneCaptured",
      "MatchEnded",
      "AllianceFormed",
      "AllianceExpired",
      "Betrayal",
      "VengeanceDeclared",
      "SabotageResolved",
      "ReputationChanged",
    ];

    const blockNumber = await this.provider.getBlockNumber();
    const fromBlock = Math.max(0, blockNumber - fromBlockDepth);
    const events: Array<{
      id: string;
      name: string;
      blockNumber: number;
      transactionHash: string;
      logIndex: number;
      args: Record<string, unknown>;
    }> = [];

    await Promise.all(
      eventNames.map(async (eventName) => {
        try {
          const fragment = this.contract!.interface.getEvent(eventName);
          if (!fragment) return;

          const topic = fragment.topicHash;
          const logs = await this.provider!.getLogs({
            address: MONAD_CONFIG.contractAddress,
            topics: [topic],
            fromBlock,
            toBlock: "latest",
          });

          for (const log of logs) {
            const parsed = this.contract!.interface.parseLog({
              topics: log.topics as string[],
              data: log.data,
            });
            if (!parsed) continue;

            const argMap: Record<string, unknown> = {};
            parsed.fragment.inputs.forEach((input, index) => {
              const value = parsed.args[index];
              argMap[input.name || String(index)] = value;
            });

            if (argMap.matchId !== undefined && BigInt(argMap.matchId as any) !== matchId) {
              continue;
            }

            events.push({
              id: `${log.transactionHash}-${log.index}`,
              name: parsed.name,
              blockNumber: log.blockNumber,
              transactionHash: log.transactionHash,
              logIndex: log.index,
              args: argMap,
            });
          }
        } catch {
          // Some deployed ABIs may not expose every planned event; skip safely.
        }
      })
    );

    return events.sort((a, b) => {
      if (a.blockNumber !== b.blockNumber) return b.blockNumber - a.blockNumber;
      return b.logIndex - a.logIndex;
    });
  }
}

export const gameContract = new GameContract();
