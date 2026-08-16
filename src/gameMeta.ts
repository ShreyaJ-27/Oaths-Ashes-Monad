export type Screen =
  | "menu"
  | "houses"
  | "war"
  | "territory"
  | "battle"
  | "dragon"
  | "diplomacy"
  | "chronicle"
  | "throne"
  | "inventory"
  | "profile"
  | "settings";

export type HouseMeta = {
  id: number;
  name: string;
  subtitle: string;
  leader: string;
  lore: string;
  strength: string;
  weakness: string;
  passive: string;
  dragon: string;
  tone: string;
  motto: string;
  portrait: string;
  sigil: string;
  banner: string;
};

export type TerritoryMeta = {
  id: number;
  name: string;
  label: string;
  x: number;
  y: number;
  terrain: string;
};

export type DragonMeta = {
  id: number;
  name: string;
  type: string;
  art: string;
};

export const houseMeta: HouseMeta[] = [
  {
    id: 1,
    name: "Ashen Vale",
    subtitle: "Keepers of the Ash Coast",
    leader: "Sable Pyre",
    lore: "Coastal pyromancers who bind oaths in cinder and salt.",
    strength: "Adjacent assaults",
    weakness: "Costly pressure",
    passive: "+1 attack power when striking adjacent enemies.",
    dragon: "None",
    tone: "ash",
    motto: "Fire remembers every oath.",
    portrait: "/assets/portraits/ashen.png",
    sigil: "/assets/sigils/ashen.png",
    banner: "/assets/banners/ashen.png",
  },
  {
    id: 2,
    name: "Iron Briar",
    subtitle: "Children of the Black Iron",
    leader: "Maeric Thorn",
    lore: "Wardens of thorned fortresses and cold iron gates.",
    strength: "Fortified defense",
    weakness: "Slow economy",
    passive: "+1 defense near the Throne.",
    dragon: "None",
    tone: "iron",
    motto: "Thorns break softer crowns.",
    portrait: "/assets/portraits/iron.png",
    sigil: "/assets/sigils/iron.png",
    banner: "/assets/banners/iron.png",
  },
  {
    id: 3,
    name: "Gloam Reed",
    subtitle: "Wardens of the Whispering Marsh",
    leader: "Vey Mossveil",
    lore: "Marsh seers who unravel supply lines under fog.",
    strength: "Sabotage",
    weakness: "Low reputation",
    passive: "Sabotage succeeds with a lower threshold.",
    dragon: "None",
    tone: "gloam",
    motto: "Silent waters claim the field.",
    portrait: "/assets/portraits/gloam.png",
    sigil: "/assets/sigils/gloam.png",
    banner: "/assets/banners/gloam.png",
  },
  {
    id: 4,
    name: "Ember Crown",
    subtitle: "Masters of the Eternal Forge",
    leader: "Aurel Coinbrand",
    lore: "Forge-lords who mint power from rich provinces.",
    strength: "Tax engine",
    weakness: "Weak direct pressure",
    passive: "+1 gold from rich territories.",
    dragon: "None",
    tone: "ember",
    motto: "The forge bends blood to rule.",
    portrait: "/assets/portraits/ember.png",
    sigil: "/assets/sigils/ember.png",
    banner: "/assets/banners/ember.png",
  },
  {
    id: 5,
    name: "Skyglass Kin",
    subtitle: "Lords of the Sky Reaches",
    leader: "Kael Skyglass",
    lore: "Dragonblood riders who rule the high passes.",
    strength: "Dragon mastery",
    weakness: "Resource hungry",
    passive: "Dragon Strike costs 1 less gold.",
    dragon: "Ashwing",
    tone: "sky",
    motto: "Dragons soar in our blood.",
    portrait: "/assets/portraits/sky.png",
    sigil: "/assets/sigils/sky.png",
    banner: "/assets/banners/sky.png",
  },
  {
    id: 6,
    name: "Dusk Hollow",
    subtitle: "Keepers of the Fallen Gate",
    leader: "Rook Vesper",
    lore: "Gatekeepers of the old throne road and its curses.",
    strength: "Early aggression",
    weakness: "Fragile if punished",
    passive: "First successful attack gains reputation.",
    dragon: "Cinderclaw",
    tone: "dusk",
    motto: "The old gate opens inward.",
    portrait: "/assets/portraits/dusk.png",
    sigil: "/assets/sigils/dusk.png",
    banner: "/assets/banners/dusk.png",
  },
];

export const territoryMeta: TerritoryMeta[] = [
  { id: 1, name: "Ashenmere", label: "Ash Coast", x: 18, y: 28, terrain: "Volcanic coast" },
  { id: 2, name: "Briarfen", label: "Black Iron", x: 42, y: 22, terrain: "Iron hills" },
  { id: 3, name: "Glasswater", label: "Green March", x: 70, y: 26, terrain: "Marsh flats" },
  { id: 4, name: "Emberkeep", label: "Ember Keep", x: 28, y: 68, terrain: "Forge valley" },
  { id: 5, name: "Thornwatch", label: "Sky Reach", x: 54, y: 58, terrain: "Sky passes" },
  { id: 6, name: "Crown of Ashes", label: "Fallen Gate", x: 78, y: 66, terrain: "Throne ruins" },
];

export const dragonMeta: DragonMeta[] = [
  { id: 1, name: "Ashwing", type: "Bonded Drake", art: "/assets/dragons/ashwing.png" },
  { id: 2, name: "Cinderclaw", type: "Cinder Drake", art: "/assets/dragons/cinderclaw.png" },
  { id: 3, name: "Nacreback", type: "Neutral Drake", art: "/assets/dragons/nacreback.png" },
];

export function houseById(id: number) {
  return houseMeta.find((house) => house.id === id) || houseMeta[0];
}

export function territoryById(id: number) {
  return territoryMeta.find((territory) => territory.id === id) || territoryMeta[0];
}

export function dragonById(id: number) {
  return dragonMeta.find((dragon) => dragon.id === id) || dragonMeta[0];
}

export function asNumber(value: unknown): number {
  return Number(value ?? 0);
}

export function eventText(event: {
  name: string;
  args: Record<string, unknown>;
}) {
  const round = asNumber(event.args.round);
  const actorId = asNumber(
    event.args.houseId ??
      event.args.ownerHouseId ??
      event.args.newOwnerHouseId ??
      event.args.attackerHouseId ??
      event.args.saboteurHouseId ??
      event.args.betrayerHouseId
  );
  const actor = actorId ? houseById(actorId).name : "The realm";
  const territoryId = asNumber(event.args.territoryId ?? event.args.targetId);
  const targetHouseId = asNumber(
    event.args.targetHouseId ?? event.args.houseB ?? event.args.betrayedHouseId
  );
  const dragonId = asNumber(event.args.dragonId);

  const target =
    territoryId > 0
      ? territoryById(territoryId).name
      : targetHouseId > 0
        ? houseById(targetHouseId).name
        : dragonId > 0
          ? dragonById(dragonId).name
          : "";

  const templates: Record<string, string> = {
    MatchCreated: `A new campaign opened under ${actor}.`,
    IntentSubmitted: `${actor} sealed an action intent.`,
    IntentRejected: `${actor} fell back to default orders.`,
    RoundResolved: `Round ${round || "?"} closed across the realm.`,
    TerritoryCaptured: `${actor} captured ${target}.`,
    FortificationRaised: `${actor} fortified ${target}.`,
    TerritoryAttackResolved: `${actor} pressed an attack on ${target}.`,
    DragonStrike: `${actor} unleashed ${dragonId ? dragonById(dragonId).name : "a dragon"} on ${target}.`,
    DragonWounded: `${target || "A dragon"} was wounded.`,
    DragonKilled: `${target || "A dragon"} fell in battle.`,
    DragonCaptured: `${actor} captured ${target || "a dragon"}.`,
    TaxCollected: `${actor} collected taxes from ${target}.`,
    ThroneCaptured: `${actor} seized the Crown of Ashes.`,
    MatchEnded: `${actor} ended the war.`,
    AllianceFormed: `${actor} formed an alliance with ${target}.`,
    AllianceExpired: `${actor}'s alliance with ${target} expired.`,
    Betrayal: `${actor} betrayed ${target}.`,
    VengeanceDeclared: `${actor} declared vengeance.`,
    SabotageResolved: `${actor} sabotaged ${target}.`,
    ReputationChanged: `${actor}'s reputation shifted.`,
  };

  return templates[event.name] || `${actor} shaped the war.`;
}
