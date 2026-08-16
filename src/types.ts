// Live contract configuration
export const MONAD_CONFIG = {
  chainId: 10143,
  chainName: "Monad Testnet",
  rpcUrl: "https://testnet-rpc.monad.xyz",
  contractAddress: "0x478643bE5f1CdB85010454f00c795cB24e0d3010",
};

// Game constants
export const GAME_CONFIG = {
  maxRounds: 10,
  roundSeconds: 30,
  houses: [
    { id: 1, name: "Ashen Vale" },
    { id: 2, name: "Iron Briar" },
    { id: 3, name: "Gloam Reed" },
    { id: 4, name: "Ember Crown" },
    { id: 5, name: "Skyglass Kin" },
    { id: 6, name: "Dusk Hollow" },
  ],
  actions: {
    None: 0,
    Attack: 1,
    Fortify: 2,
    Dragonstrike: 3,
    Diplomacy: 4,
    Sabotage: 5,
    Tax: 6,
  } as const,
  targetTypes: {
    None: 0,
    Territory: 1,
    House: 2,
    Dragon: 3,
    Throne: 4,
  } as const,
};

export type Action = keyof typeof GAME_CONFIG.actions;
export type TargetType = keyof typeof GAME_CONFIG.targetTypes;

export interface Intent {
  matchId: bigint;
  round: number;
  houseId: number;
  action: number;
  targetType: number;
  targetId: number;
  nonce: bigint;
  deadline: bigint;
  signer: string;
  signature: string;
}

export interface MatchState {
  id: bigint;
  status: number;
  round: number;
  roundStart: number;
  roundDeadline: number;
  playersJoined: number;
  winnerHouseId: number;
  throneStreak: number;
}

export interface HouseState {
  houseId: number;
  gold: number;
  influence: number;
  military: number;
  reputation: number;
  territoryId: number;
  passive: number;
  dragonId: number;
  activeAlliance: number;
  vengeanceUntil: number;
  alive: boolean;
}

export interface TerritoryState {
  territoryId: number;
  ownerHouseId: number;
  resourceValue: number;
  defensiveValue: number;
  fortificationLevel: number;
  isThrone: boolean;
  sabotageUntil: number;
  lastTaxRound: number;
}

export interface DragonState {
  dragonId: number;
  ownerHouseId: number;
  power: number;
  armor: number;
  speed: number;
  loyalty: number;
  wounds: number;
  alive: boolean;
  deathRound: number;
}
