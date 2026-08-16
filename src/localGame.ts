import {
  DragonState,
  GAME_CONFIG,
  HouseState,
  MatchState,
  TerritoryState,
} from "./types";

export type LocalEvent = {
  id: string;
  name: string;
  blockNumber: number;
  transactionHash: string;
  logIndex: number;
  args: Record<string, unknown>;
};

export type BattleResult = {
  round: number;
  attackerHouseId: number;
  defenderHouseId: number;
  territoryId: number;
  attackPower: number;
  defensePower: number;
  victory: boolean;
  summary: string;
};

export type LocalGameState = {
  match: MatchState;
  playerHouseId: number;
  houses: HouseState[];
  territories: TerritoryState[];
  dragons: DragonState[];
  events: LocalEvent[];
  nonce: bigint;
  battle: BattleResult | null;
  pendingAction: boolean;
  mode: "local";
};

const STORAGE_KEY = "oaths-ashes-session-v2";
const now = () => Math.floor(Date.now() / 1000);

function clone<T>(value: T): T {
  return structuredClone(value);
}

function pushEvent(
  state: LocalGameState,
  name: string,
  args: Record<string, unknown>
) {
  state.events.unshift({
    id: `${state.match.round}-${name}-${state.events.length}-${Date.now()}`,
    name,
    blockNumber: state.match.round,
    transactionHash: "local",
    logIndex: state.events.length,
    args: { round: state.match.round, ...args },
  });
}

export function createLocalGame(playerHouseId = 5): LocalGameState {
  const match: MatchState = {
    id: 1n,
    status: 1,
    round: 1,
    roundStart: now(),
    roundDeadline: now() + GAME_CONFIG.roundSeconds,
    playersJoined: 6,
    winnerHouseId: 0,
    throneStreak: 0,
  };

  const houses: HouseState[] = [1, 2, 3, 4, 5, 6].map((houseId) => ({
    houseId,
    gold: 12 + (houseId % 3),
    influence: 8 + (houseId % 2),
    military: 14 + houseId,
    reputation: 8 + (houseId % 4),
    territoryId: houseId,
    passive: houseId,
    dragonId: houseId === 5 ? 1 : houseId === 6 ? 2 : 0,
    activeAlliance: 0,
    vengeanceUntil: 0,
    alive: true,
  }));

  const territories: TerritoryState[] = [1, 2, 3, 4, 5, 6].map((territoryId) => ({
    territoryId,
    ownerHouseId: territoryId,
    resourceValue: territoryId === 6 ? 5 : 3 + (territoryId % 3),
    defensiveValue: 6 + territoryId,
    fortificationLevel: territoryId === 6 ? 3 : 2,
    isThrone: territoryId === 6,
    sabotageUntil: 0,
    lastTaxRound: 0,
  }));

  const dragons: DragonState[] = [
    {
      dragonId: 1,
      ownerHouseId: 5,
      power: 18,
      armor: 12,
      speed: 16,
      loyalty: 85,
      wounds: 1,
      alive: true,
      deathRound: 0,
    },
    {
      dragonId: 2,
      ownerHouseId: 6,
      power: 16,
      armor: 10,
      speed: 14,
      loyalty: 78,
      wounds: 0,
      alive: true,
      deathRound: 0,
    },
    {
      dragonId: 3,
      ownerHouseId: 0,
      power: 20,
      armor: 14,
      speed: 12,
      loyalty: 0,
      wounds: 0,
      alive: true,
      deathRound: 0,
    },
  ];

  const state: LocalGameState = {
    match,
    playerHouseId,
    houses,
    territories,
    dragons,
    nonce: 1n,
    battle: null,
    pendingAction: false,
    mode: "local",
    events: [],
  };

  pushEvent(state, "MatchCreated", { matchId: 1n, houseId: playerHouseId });
  return state;
}

export function validateLocalAction(
  state: LocalGameState,
  action: number,
  targetType: number,
  targetId: number
): string | null {
  if (state.match.status !== 1) return "Match finished";
  if (state.pendingAction) return "Orders already sealed this round";

  const actor = state.houses.find((h) => h.houseId === state.playerHouseId);
  if (!actor || !actor.alive) return "House unavailable";

  if (action === GAME_CONFIG.actions.Attack) {
    if (targetType !== GAME_CONFIG.targetTypes.Territory) return "Attack requires a territory";
    const target = state.territories.find((t) => t.territoryId === targetId);
    if (!target) return "Invalid target";
    if (target.ownerHouseId === actor.houseId) return "Cannot attack your own province";
    if (actor.military < 3) return "Military too low to attack";
  }

  if (action === GAME_CONFIG.actions.Fortify) {
    if (targetType !== GAME_CONFIG.targetTypes.Territory) return "Fortify requires a territory";
    const target = state.territories.find((t) => t.territoryId === targetId);
    if (!target) return "Invalid target";
    if (target.ownerHouseId !== actor.houseId) return "Can only fortify owned provinces";
    if (actor.gold < 1) return "Not enough gold to fortify";
  }

  if (action === GAME_CONFIG.actions.Dragonstrike) {
    if (targetType !== GAME_CONFIG.targetTypes.Territory) return "Dragon Strike requires a territory";
    const dragon = state.dragons.find((d) => d.ownerHouseId === actor.houseId && d.alive);
    if (!dragon) return "No bonded dragon available";
    const target = state.territories.find((t) => t.territoryId === targetId);
    if (!target) return "Invalid target";
    if (target.ownerHouseId === actor.houseId) return "Choose an enemy province";
    const cost = actor.houseId === 5 ? 0 : 1;
    if (actor.gold < cost) return "Not enough gold for Dragon Strike";
  }

  if (action === GAME_CONFIG.actions.Diplomacy) {
    if (targetType !== GAME_CONFIG.targetTypes.House) return "Diplomacy requires a house";
    if (targetId < 1 || targetId > 6 || targetId === actor.houseId) return "Invalid house target";
    if (actor.influence < 1) return "Not enough influence";
  }

  if (action === GAME_CONFIG.actions.Sabotage) {
    if (targetType !== GAME_CONFIG.targetTypes.Territory) return "Sabotage requires a territory";
    const target = state.territories.find((t) => t.territoryId === targetId);
    if (!target) return "Invalid target";
    if (target.ownerHouseId === actor.houseId) return "Cannot sabotage your own province";
    if (actor.influence < 1) return "Not enough influence";
  }

  if (action === GAME_CONFIG.actions.Tax) {
    if (targetType !== GAME_CONFIG.targetTypes.Territory) return "Tax requires a territory";
    const target = state.territories.find((t) => t.territoryId === targetId);
    if (!target) return "Invalid target";
    if (target.ownerHouseId !== actor.houseId) return "Can only tax owned provinces";
    if (target.lastTaxRound === state.match.round) return "Province already taxed this round";
  }

  return null;
}

function applyActionToHouse(
  state: LocalGameState,
  houseId: number,
  action: number,
  targetType: number,
  targetId: number,
  isPlayer: boolean
) {
  const actor = state.houses.find((h) => h.houseId === houseId)!;
  const targetTerritory = state.territories.find((t) => t.territoryId === targetId);

  if (action === GAME_CONFIG.actions.Tax && targetTerritory) {
    let gain = targetTerritory.resourceValue;
    if (actor.houseId === 4 && targetTerritory.resourceValue >= 4) gain += 1;
    if (targetTerritory.sabotageUntil >= state.match.round) gain = Math.max(1, gain - 1);
    actor.gold += gain;
    actor.reputation = Math.min(20, actor.reputation + 1);
    targetTerritory.lastTaxRound = state.match.round;
    pushEvent(state, "TaxCollected", {
      houseId: actor.houseId,
      territoryId: targetId,
      gold: gain,
    });
    return;
  }

  if (action === GAME_CONFIG.actions.Fortify && targetTerritory) {
    targetTerritory.fortificationLevel = Math.min(9, targetTerritory.fortificationLevel + 1);
    targetTerritory.defensiveValue += 2;
    actor.gold = Math.max(0, actor.gold - 1);
    pushEvent(state, "FortificationRaised", {
      houseId: actor.houseId,
      territoryId: targetId,
    });
    return;
  }

  if (action === GAME_CONFIG.actions.Attack && targetTerritory) {
    const defender = state.houses.find((h) => h.houseId === targetTerritory.ownerHouseId);
    let attackPower = actor.military + Math.floor(actor.reputation / 2);
    if (actor.houseId === 1) attackPower += 1;
    if (actor.houseId === 6 && state.match.round <= 3) attackPower += 2;

    let defensePower =
      targetTerritory.defensiveValue +
      targetTerritory.fortificationLevel * 2 +
      (defender?.military ?? 0) / 3;
    if (defender?.houseId === 2 && targetTerritory.isThrone) defensePower += 1;
    if (targetTerritory.sabotageUntil >= state.match.round) defensePower = Math.max(1, defensePower - 2);

    const victory = attackPower >= defensePower;
    const battle: BattleResult = {
      round: state.match.round,
      attackerHouseId: actor.houseId,
      defenderHouseId: targetTerritory.ownerHouseId,
      territoryId: targetId,
      attackPower: Math.round(attackPower),
      defensePower: Math.round(defensePower),
      victory,
      summary: victory
        ? `${houseLabel(actor.houseId)} seized the province.`
        : `${houseLabel(targetTerritory.ownerHouseId)} held the walls.`,
    };

    if (isPlayer) state.battle = battle;

    pushEvent(state, "TerritoryAttackResolved", {
      houseId: actor.houseId,
      territoryId: targetId,
      victory,
      attackPower: battle.attackPower,
      defensePower: battle.defensePower,
    });

    if (victory) {
      const oldOwner = targetTerritory.ownerHouseId;
      targetTerritory.ownerHouseId = actor.houseId;
      actor.territoryId = targetId;
      actor.military = Math.max(1, actor.military - 2);
      actor.reputation = Math.min(20, actor.reputation + 1);
      if (actor.houseId === 6 && state.match.round <= 3) {
        actor.reputation = Math.min(20, actor.reputation + 1);
      }
      if (defender) defender.military = Math.max(1, defender.military - 1);
      pushEvent(state, "TerritoryCaptured", {
        houseId: actor.houseId,
        territoryId: targetId,
        previousOwnerHouseId: oldOwner,
      });
      if (targetTerritory.isThrone) {
        state.match.throneStreak = 1;
        pushEvent(state, "ThroneCaptured", {
          houseId: actor.houseId,
          territoryId: targetId,
        });
      }
    } else {
      actor.military = Math.max(1, actor.military - 1);
      if (defender) defender.reputation = Math.min(20, defender.reputation + 1);
    }
    return;
  }

  if (action === GAME_CONFIG.actions.Dragonstrike && targetTerritory) {
    const dragon = state.dragons.find((d) => d.ownerHouseId === actor.houseId && d.alive);
    if (!dragon) return;
    const cost = actor.houseId === 5 ? 0 : 1;
    actor.gold = Math.max(0, actor.gold - cost);
    targetTerritory.defensiveValue = Math.max(1, targetTerritory.defensiveValue - 3);
    dragon.wounds = Math.min(5, dragon.wounds + 1);
    dragon.loyalty = Math.max(0, dragon.loyalty - 3);

    pushEvent(state, "DragonStrike", {
      houseId: actor.houseId,
      dragonId: dragon.dragonId,
      territoryId: targetId,
    });

    if (dragon.wounds >= 5) {
      dragon.alive = false;
      dragon.deathRound = state.match.round;
      pushEvent(state, "DragonKilled", {
        houseId: actor.houseId,
        dragonId: dragon.dragonId,
      });
    } else if (dragon.wounds >= 2) {
      pushEvent(state, "DragonWounded", {
        houseId: actor.houseId,
        dragonId: dragon.dragonId,
        wounds: dragon.wounds,
      });
    }

    // Softened strike can capture if already weak
    const defenderMil =
      state.houses.find((h) => h.houseId === targetTerritory.ownerHouseId)?.military ?? 10;
    if (dragon.power + actor.military > targetTerritory.defensiveValue + defenderMil) {
      const oldOwner = targetTerritory.ownerHouseId;
      targetTerritory.ownerHouseId = actor.houseId;
      actor.territoryId = targetId;
      pushEvent(state, "TerritoryCaptured", {
        houseId: actor.houseId,
        territoryId: targetId,
        previousOwnerHouseId: oldOwner,
      });
      if (isPlayer) {
        state.battle = {
          round: state.match.round,
          attackerHouseId: actor.houseId,
          defenderHouseId: oldOwner,
          territoryId: targetId,
          attackPower: dragon.power + actor.military,
          defensePower: targetTerritory.defensiveValue + Math.floor(defenderMil / 3),
          victory: true,
          summary: `${houseLabel(actor.houseId)}'s dragon broke the defenses.`,
        };
      }
    }
    return;
  }

  if (action === GAME_CONFIG.actions.Diplomacy) {
    actor.activeAlliance = targetId;
    actor.influence = Math.max(0, actor.influence - 1);
    actor.reputation = Math.min(20, actor.reputation + 1);
    const ally = state.houses.find((h) => h.houseId === targetId);
    if (ally) ally.activeAlliance = actor.houseId;
    pushEvent(state, "AllianceFormed", {
      houseId: actor.houseId,
      targetHouseId: targetId,
    });
    return;
  }

  if (action === GAME_CONFIG.actions.Sabotage && targetTerritory) {
    const threshold = actor.houseId === 3 ? 0 : 1;
    actor.influence = Math.max(0, actor.influence - 1);
    actor.reputation = Math.max(0, actor.reputation - threshold);
    targetTerritory.sabotageUntil = state.match.round + 2;
    targetTerritory.resourceValue = Math.max(1, targetTerritory.resourceValue - 1);
    targetTerritory.defensiveValue = Math.max(1, targetTerritory.defensiveValue - 1);
    pushEvent(state, "SabotageResolved", {
      houseId: actor.houseId,
      territoryId: targetId,
      success: true,
    });
  }
}

function houseLabel(id: number) {
  return GAME_CONFIG.houses.find((h) => h.id === id)?.name || `House ${id}`;
}

function chooseAiAction(state: LocalGameState, houseId: number) {
  const house = state.houses.find((h) => h.houseId === houseId)!;
  const owned = state.territories.filter((t) => t.ownerHouseId === houseId);
  const enemies = state.territories.filter((t) => t.ownerHouseId !== houseId);

  if (owned.length && house.gold >= 1 && Math.random() < 0.25) {
    return {
      action: GAME_CONFIG.actions.Fortify,
      targetType: GAME_CONFIG.targetTypes.Territory,
      targetId: owned[0].territoryId,
    };
  }

  if (owned.length && Math.random() < 0.35) {
    return {
      action: GAME_CONFIG.actions.Tax,
      targetType: GAME_CONFIG.targetTypes.Territory,
      targetId: owned[Math.floor(Math.random() * owned.length)].territoryId,
    };
  }

  const dragon = state.dragons.find((d) => d.ownerHouseId === houseId && d.alive);
  if (dragon && enemies.length && house.gold >= 1 && Math.random() < 0.2) {
    return {
      action: GAME_CONFIG.actions.Dragonstrike,
      targetType: GAME_CONFIG.targetTypes.Territory,
      targetId: enemies[Math.floor(Math.random() * enemies.length)].territoryId,
    };
  }

  if (enemies.length && house.military >= 5 && Math.random() < 0.4) {
    const target = enemies.sort((a, b) => a.defensiveValue - b.defensiveValue)[0];
    return {
      action: GAME_CONFIG.actions.Attack,
      targetType: GAME_CONFIG.targetTypes.Territory,
      targetId: target.territoryId,
    };
  }

  if (house.influence >= 1 && Math.random() < 0.25) {
    const others = [1, 2, 3, 4, 5, 6].filter((id) => id !== houseId);
    return {
      action: GAME_CONFIG.actions.Diplomacy,
      targetType: GAME_CONFIG.targetTypes.House,
      targetId: others[Math.floor(Math.random() * others.length)],
    };
  }

  if (enemies.length && house.influence >= 1) {
    return {
      action: GAME_CONFIG.actions.Sabotage,
      targetType: GAME_CONFIG.targetTypes.Territory,
      targetId: enemies[Math.floor(Math.random() * enemies.length)].territoryId,
    };
  }

  if (owned.length) {
    return {
      action: GAME_CONFIG.actions.Tax,
      targetType: GAME_CONFIG.targetTypes.Territory,
      targetId: owned[0].territoryId,
    };
  }

  return {
    action: GAME_CONFIG.actions.Diplomacy,
    targetType: GAME_CONFIG.targetTypes.House,
    targetId: ((houseId % 6) + 1),
  };
}

export function applyLocalAction(
  state: LocalGameState,
  action: number,
  targetType: number,
  targetId: number
): LocalGameState {
  const error = validateLocalAction(state, action, targetType, targetId);
  if (error) throw new Error(error);

  const next = clone(state);
  next.battle = null;
  applyActionToHouse(next, next.playerHouseId, action, targetType, targetId, true);
  next.pendingAction = true;
  next.nonce = BigInt(next.nonce) + 1n;
  return next;
}

export function resolveLocalRound(state: LocalGameState): LocalGameState {
  const next = clone(state);

  // AI houses act if player already acted, or always on settle
  for (const house of next.houses) {
    if (house.houseId === next.playerHouseId || !house.alive) continue;
    const choice = chooseAiAction(next, house.houseId);
    applyActionToHouse(
      next,
      house.houseId,
      choice.action,
      choice.targetType,
      choice.targetId,
      false
    );
  }

  next.match.round += 1;
  next.match.roundStart = now();
  next.match.roundDeadline = now() + GAME_CONFIG.roundSeconds;
  next.pendingAction = false;

  for (const house of next.houses) {
    if (!house.alive) continue;
    house.gold += 1;
    const ownedCount = next.territories.filter((t) => t.ownerHouseId === house.houseId).length;
    house.military += ownedCount > 0 ? 1 : 0;
  }

  const throne = next.territories.find((t) => t.isThrone);
  if (throne) {
    if (throne.ownerHouseId === next.match.winnerHouseId || next.match.throneStreak === 0) {
      // keep streak logic tied to current occupant
    }
    const previousRuler = next.events.find((e) => e.name === "ThroneCaptured");
    const currentOwner = throne.ownerHouseId;
    if (previousRuler && Number(previousRuler.args.houseId) === currentOwner) {
      next.match.throneStreak += 1;
    } else {
      next.match.throneStreak = throne.ownerHouseId ? 1 : 0;
    }
  }

  // Clear expired sabotage
  for (const territory of next.territories) {
    if (territory.sabotageUntil > 0 && territory.sabotageUntil < next.match.round) {
      territory.sabotageUntil = 0;
    }
  }

  pushEvent(next, "RoundResolved", { round: next.match.round - 1 });

  // Win conditions
  const playerOwned = next.territories.filter((t) => t.ownerHouseId === next.playerHouseId).length;
  if (playerOwned >= 4 || (throne?.ownerHouseId === next.playerHouseId && next.match.throneStreak >= 3)) {
    next.match.status = 2;
    next.match.winnerHouseId = next.playerHouseId;
    pushEvent(next, "MatchEnded", { houseId: next.playerHouseId, winnerHouseId: next.playerHouseId });
  } else if (next.match.round > GAME_CONFIG.maxRounds) {
    const counts = [1, 2, 3, 4, 5, 6].map((id) => ({
      id,
      n: next.territories.filter((t) => t.ownerHouseId === id).length,
    }));
    counts.sort((a, b) => b.n - a.n);
    next.match.status = 2;
    next.match.winnerHouseId = counts[0].id;
    pushEvent(next, "MatchEnded", {
      houseId: counts[0].id,
      winnerHouseId: counts[0].id,
    });
  } else if (playerOwned === 0) {
    next.match.status = 2;
    const ruler = throne?.ownerHouseId || 1;
    next.match.winnerHouseId = ruler;
    pushEvent(next, "MatchEnded", { houseId: ruler, winnerHouseId: ruler });
  }

  return next;
}

export function serializeGame(state: LocalGameState) {
  return JSON.stringify({
    ...state,
    match: { ...state.match, id: state.match.id.toString() },
    nonce: state.nonce.toString(),
    events: state.events.map((event) => ({
      ...event,
      args: Object.fromEntries(
        Object.entries(event.args).map(([key, value]) => [
          key,
          typeof value === "bigint" ? value.toString() : value,
        ])
      ),
    })),
  });
}

export function deserializeGame(raw: string): LocalGameState | null {
  try {
    const parsed = JSON.parse(raw);
    return {
      ...parsed,
      match: {
        ...parsed.match,
        id: BigInt(parsed.match.id),
      },
      nonce: BigInt(parsed.nonce ?? 1),
      mode: "local",
      battle: parsed.battle ?? null,
      pendingAction: Boolean(parsed.pendingAction),
    };
  } catch {
    return null;
  }
}

export function saveLocalGame(state: LocalGameState) {
  localStorage.setItem(STORAGE_KEY, serializeGame(state));
}

export function loadLocalGame(): LocalGameState | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  return deserializeGame(raw);
}

export function clearLocalGame() {
  localStorage.removeItem(STORAGE_KEY);
}

export { STORAGE_KEY };
