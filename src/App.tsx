import React, { useEffect, useMemo, useState } from "react";
import { useGame } from "./game/GameContext";
import {
  Screen,
  asNumber,
  dragonById,
  dragonMeta,
  eventText,
  houseById,
  houseMeta,
  territoryById,
  territoryMeta,
} from "./gameMeta";
import { GAME_CONFIG } from "./types";

const actionOptions = [
  { id: GAME_CONFIG.actions.Attack, name: "Attack", icon: "/assets/icons/attack.png", targetType: GAME_CONFIG.targetTypes.Territory },
  { id: GAME_CONFIG.actions.Fortify, name: "Fortify", icon: "/assets/icons/fortify.png", targetType: GAME_CONFIG.targetTypes.Territory },
  { id: GAME_CONFIG.actions.Dragonstrike, name: "Dragon Strike", icon: "/assets/icons/dragonstrike.png", targetType: GAME_CONFIG.targetTypes.Territory },
  { id: GAME_CONFIG.actions.Diplomacy, name: "Diplomacy", icon: "/assets/icons/diplomacy.png", targetType: GAME_CONFIG.targetTypes.House },
  { id: GAME_CONFIG.actions.Sabotage, name: "Sabotage", icon: "/assets/icons/sabotage.png", targetType: GAME_CONFIG.targetTypes.Territory },
  { id: GAME_CONFIG.actions.Tax, name: "Tax", icon: "/assets/icons/tax.png", targetType: GAME_CONFIG.targetTypes.Territory },
];

const navScreens: Array<{ id: Screen; label: string }> = [
  { id: "war", label: "War Room" },
  { id: "territory", label: "Territory" },
  { id: "battle", label: "Battle" },
  { id: "dragon", label: "Dragon" },
  { id: "diplomacy", label: "Diplomacy" },
  { id: "chronicle", label: "Chronicle" },
  { id: "throne", label: "Throne" },
  { id: "inventory", label: "Inventory" },
  { id: "profile", label: "Profile" },
];

export function App() {
  const {
    mode,
    gameState,
    connected,
    address,
    chainId,
    txPhase,
    loading,
    settling,
    status,
    error,
    matchId,
    setMode,
    connect,
    startNewGame,
    joinHouse,
    reconnectMatch,
    submitAction,
    advanceRound,
  } = useGame();

  const [selectedHouse, setSelectedHouse] = useState(5);
  const [activeScreen, setActiveScreen] = useState<Screen>("menu");
  const [selectedTerritoryId, setSelectedTerritoryId] = useState(6);
  const [selectedDragonId, setSelectedDragonId] = useState(1);
  const [selectedAction, setSelectedAction] = useState<number>(GAME_CONFIG.actions.Tax);
  const [targetType, setTargetType] = useState<number>(GAME_CONFIG.targetTypes.Territory);
  const [targetId, setTargetId] = useState<number>(6);
  const [diplomacyTarget, setDiplomacyTarget] = useState(2);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const activeHouse = useMemo(
    () => houseById(gameState?.playerHouseId ?? selectedHouse),
    [gameState?.playerHouseId, selectedHouse]
  );
  const currentHouse = activeHouse;
  const playerHouse = gameState?.houses.find((house) => house.houseId === gameState.playerHouseId);
  const selectedTerritory =
    gameState?.territories.find((territory) => territory.territoryId === selectedTerritoryId) || null;
  const selectedDragon =
    gameState?.dragons.find((dragon) => dragon.dragonId === selectedDragonId) ||
    gameState?.dragons[0] ||
    null;
  const throneTerritory = gameState?.territories.find((territory) => territory.isThrone);
  const playerDragon = gameState?.dragons.find(
    (dragon) => dragon.ownerHouseId === gameState?.playerHouseId && dragon.alive
  );
  const territoryCount =
    gameState?.territories.filter((t) => t.ownerHouseId === gameState.playerHouseId).length ?? 0;
  const [roundSecondsLeft, setRoundSecondsLeft] = useState(0);
  const diplomacyHouse = houseById(diplomacyTarget);

  const shortAddress = address
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : mode === "LOCAL"
      ? "Local dev"
      : "Not connected";

  useEffect(() => {
    if (!gameState || gameState.match.status !== 1) return;
    const tick = () => {
      const seconds = Math.max(0, gameState.match.roundDeadline - Math.floor(Date.now() / 1000));
      setRoundSecondsLeft(seconds);
    };
    tick();
    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, [gameState?.match.roundDeadline, gameState?.match.round]);

  const handleNewGame = async () => {
    try {
      if (mode === "MONAD" && !connected) await connect();
      const nextScreen = await startNewGame();
      setActiveScreen(nextScreen);
    } catch {
      /* surfaced via context */
    }
  };

  const handleJoinMatch = async () => {
    try {
      if (mode === "MONAD") {
        if (!connected) await connect();
        const restored = await reconnectMatch();
        if (restored) {
          setActiveScreen("war");
          return;
        }
        return;
      }
      setActiveScreen("houses");
    } catch {
      /* surfaced via context */
    }
  };

  const enterWarRoom = async () => {
    try {
      if (mode === "MONAD" && gameState) {
        setActiveScreen("war");
        return;
      }
      if (mode === "MONAD" && !matchId) {
        if (!connected) await connect();
        const restored = await reconnectMatch();
        if (restored) {
          setActiveScreen("war");
          return;
        }
        const nextScreen = await startNewGame();
        if (nextScreen === "war") {
          setActiveScreen("war");
          return;
        }
      }
      await joinHouse(selectedHouse);
      setSelectedTerritoryId(selectedHouse);
      setTargetId(selectedHouse);
      setSelectedDragonId(selectedHouse === 5 ? 1 : selectedHouse === 6 ? 2 : 1);
      setActiveScreen("war");
    } catch {
      /* surfaced via context */
    }
  };

  const issueAction = async (
    action = selectedAction,
    nextTargetType = targetType,
    nextTargetId = targetId
  ) => {
    if (!gameState) {
      setActiveScreen("houses");
      return;
    }
    try {
      await submitAction({ action, targetType: nextTargetType, targetId: nextTargetId });
      if (action === GAME_CONFIG.actions.Attack || action === GAME_CONFIG.actions.Dragonstrike) {
        setActiveScreen("battle");
      } else if (action === GAME_CONFIG.actions.Diplomacy) {
        setActiveScreen("diplomacy");
      } else {
        setActiveScreen("war");
      }
    } catch {
      /* surfaced via context */
    }
  };

  const exitToMenu = () => {
    setActiveScreen("menu");
    setSettingsOpen(false);
  };

  const requireGame = (screen: Screen) => {
    if (!gameState && screen !== "menu" && screen !== "houses" && screen !== "settings") {
      return;
    }
    setActiveScreen(screen);
  };

  const resourceRows = [
    { icon: "/assets/icons/gold.png", label: "Gold", value: playerHouse?.gold ?? 0 },
    { icon: "/assets/icons/influence.png", label: "Influence", value: playerHouse?.influence ?? 0 },
    { icon: "/assets/icons/military.png", label: "Military", value: playerHouse?.military ?? 0 },
    { icon: "/assets/icons/reputation.png", label: "Reputation", value: playerHouse?.reputation ?? 0 },
    { icon: "/assets/icons/territory.png", label: "Territories", value: `${territoryCount} / 6` },
    {
      icon: "/assets/icons/dragon.png",
      label: "Dragon",
      value: playerDragon ? dragonById(playerDragon.dragonId).name : "No bonded dragon",
    },
    {
      icon: "/assets/icons/fortify.png",
      label: "Fortification tokens",
      value: gameState
        ? gameState.territories
            .filter((t) => t.ownerHouseId === gameState.playerHouseId)
            .reduce((sum, t) => sum + t.fortificationLevel, 0)
        : 0,
    },
    {
      icon: "/assets/icons/diplomacy.png",
      label: "Alliance",
      value: playerHouse?.activeAlliance
        ? houseById(playerHouse.activeAlliance).name
        : "None",
    },
    {
      icon: "/assets/icons/reputation.png",
      label: "Victory progress",
      value: gameState?.match.status === 2
        ? gameState.match.winnerHouseId === gameState.playerHouseId
          ? "Victor"
          : "Defeated"
        : `${territoryCount}/4 provinces or throne streak`,
    },
  ];

  return (
    <main className="oaths-shell">
      <div className={`play-canvas screen-${activeScreen}`}>
        {activeScreen === "menu" && (
          <section className="screen menu-screen">
            <div className="menu-hero" style={{ backgroundImage: "url(/assets/menu-bg.png)" }}>
              <div className="menu-veil" />
              <div className="menu-content">
                <p className="brand">Oaths & Ashes</p>
                <h1>Oaths & Ashes</h1>
                <p className="menu-tag">Six houses. One throne. No mercy between rounds.</p>
                <div className="menu-buttons">
                  <button onClick={() => void handleNewGame()} disabled={loading}>
                    New Game
                  </button>
                  <button onClick={() => void handleJoinMatch()} disabled={loading}>
                    Join Match
                  </button>
                  <button onClick={() => requireGame("chronicle")}>Chronicle</button>
                  <button onClick={() => setActiveScreen("monad")}>Monad</button>
                  <button onClick={() => setSettingsOpen(true)}>Settings</button>
                  <button onClick={exitToMenu}>Exit</button>
                </div>
                <div className="hud-note">
                  {mode === "MONAD"
                    ? connected
                      ? gameState
                        ? `Monad Testnet · Match ${matchId?.toString()} · ${houseById(gameState.playerHouseId).name}`
                        : matchId
                          ? `Monad Testnet · Match ${matchId.toString()} · choose house`
                          : "Monad Testnet · start or join a match"
                      : "Connect wallet to play on Monad"
                    : "Local development mode"}
                </div>
              </div>
            </div>
          </section>
        )}

        {activeScreen === "houses" && (
          <section className="screen houses-screen">
            <header className="screen-head">
              <h2>House Selection</h2>
              <p>Choose your dynasty</p>
            </header>
            <div className="banner-row">
              {houseMeta.map((house) => (
                <button
                  key={house.id}
                  className={`house-banner ${house.tone} ${selectedHouse === house.id ? "selected" : ""}`}
                  onClick={() => setSelectedHouse(house.id)}
                >
                  <img src={house.banner} alt="" className="banner-art" />
                  <img src={house.sigil} alt="" className="banner-sigil" />
                  <strong>{house.name}</strong>
                  <small>{house.subtitle}</small>
                </button>
              ))}
            </div>
            <div className="house-detail-panel">
              <img src={currentHouse.portrait} alt={currentHouse.leader} className="house-portrait" />
              <div>
                <strong>{currentHouse.name}</strong>
                <span>Leader: {currentHouse.leader}</span>
                <span>{currentHouse.lore}</span>
                <span>Strength: {currentHouse.strength}</span>
                <span>Weakness: {currentHouse.weakness}</span>
                <span>Passive: {currentHouse.passive}</span>
                <span>Dragon: {currentHouse.dragon}</span>
                <em>{currentHouse.motto}</em>
              </div>
            </div>
            <div className="screen-actions">
              <button
                className="wide-action"
                onClick={() => void enterWarRoom()}
                disabled={loading || (mode === "MONAD" && !connected && !matchId && !gameState)}
              >
                Confirm / Enter War Room
              </button>
              <button className="ghost" onClick={() => setActiveScreen("menu")}>
                Back
              </button>
            </div>
          </section>
        )}

        {activeScreen === "war" && gameState && (
          <section className="screen war-screen">
            <div className="resource-bar">
              <span>Round <b>{gameState.match.round}</b></span>
              <span>Time <b>{roundSecondsLeft}s</b></span>
              <span><img src="/assets/icons/gold.png" alt="" />{playerHouse?.gold ?? 0}</span>
              <span><img src="/assets/icons/influence.png" alt="" />{playerHouse?.influence ?? 0}</span>
              <span><img src="/assets/icons/military.png" alt="" />{playerHouse?.military ?? 0}</span>
              <span><img src="/assets/icons/reputation.png" alt="" />{playerHouse?.reputation ?? 0}</span>
              <span><img src="/assets/icons/territory.png" alt="" />{territoryCount}</span>
              <button className="gear" onClick={() => setSettingsOpen(true)} aria-label="Settings">⚙</button>
            </div>
            <div className="war-layout">
              <div className="strategy-map" style={{ backgroundImage: "url(/assets/world-map.png)" }}>
                {territoryMeta.map((meta) => {
                  const territory = gameState.territories.find((item) => item.territoryId === meta.id);
                  const owner = houseById(territory?.ownerHouseId || meta.id);
                  return (
                    <button
                      key={meta.id}
                      className={`territory-marker ${owner.tone} ${meta.id === selectedTerritoryId ? "selected" : ""} ${territory?.isThrone ? "throne-marker" : ""}`}
                      style={{ left: `${meta.x}%`, top: `${meta.y}%` }}
                      onClick={() => {
                        setSelectedTerritoryId(meta.id);
                        setTargetId(meta.id);
                        setTargetType(GAME_CONFIG.targetTypes.Territory);
                        setActiveScreen("territory");
                      }}
                    >
                      <img src="/assets/castle-fort.png" alt="" className="castle-marker" />
                      <em>{meta.label}</em>
                    </button>
                  );
                })}
              </div>
              <aside className="war-actions">
                {navScreens.filter((s) => s.id !== "war").map((item) => (
                  <button key={item.id} onClick={() => setActiveScreen(item.id)}>
                    {item.label}
                  </button>
                ))}
                <div
                  className="mini-map"
                  style={{ backgroundImage: "url(/assets/world-map.png)" }}
                  aria-hidden="true"
                />
              </aside>
            </div>
            <div className="action-dock">
              {actionOptions.map((action) => (
                <button
                  key={action.id}
                  className={selectedAction === action.id ? "selected" : ""}
                  onClick={() => {
                    setSelectedAction(action.id);
                    setTargetType(action.targetType);
                    if (action.targetType === GAME_CONFIG.targetTypes.House) {
                      setTargetId(diplomacyTarget);
                    } else {
                      setTargetId(selectedTerritoryId);
                    }
                  }}
                >
                  <img src={action.icon} alt="" />
                  {action.name}
                </button>
              ))}
              <select
                value={targetType === GAME_CONFIG.targetTypes.House ? `h-${targetId}` : `t-${targetId}`}
                onChange={(event) => {
                  const [kind, id] = event.target.value.split("-");
                  const nextId = Number(id);
                  if (kind === "h") {
                    setTargetType(GAME_CONFIG.targetTypes.House);
                    setTargetId(nextId);
                    setDiplomacyTarget(nextId);
                  } else {
                    setTargetType(GAME_CONFIG.targetTypes.Territory);
                    setTargetId(nextId);
                    setSelectedTerritoryId(nextId);
                  }
                }}
              >
                <optgroup label="Territories">
                  {territoryMeta.map((t) => (
                    <option key={t.id} value={`t-${t.id}`}>{t.name}</option>
                  ))}
                </optgroup>
                <optgroup label="Houses">
                  {houseMeta.filter((h) => h.id !== gameState.playerHouseId).map((h) => (
                    <option key={h.id} value={`h-${h.id}`}>{h.name}</option>
                  ))}
                </optgroup>
              </select>
              <button
                className="seal-action"
                onClick={() => void issueAction()}
                disabled={loading || settling || txPhase === "signing" || txPhase === "submitting"}
              >
                {settling
                  ? "Settling Round..."
                  : txPhase === "signing"
                    ? "Signing..."
                    : gameState.pendingAction
                      ? "Replace Order"
                      : "Lock Order"}
              </button>
              {gameState.pendingAction && (
                <p className="order-locked">ORDER LOCKED — awaiting round settlement on Monad</p>
              )}
              {mode === "LOCAL" && (
                <button className="seal-action" onClick={() => void advanceRound()} disabled={settling}>
                  Advance Round
                </button>
              )}
            </div>
          </section>
        )}

        {activeScreen === "territory" && (
          <section className="screen panel-screen">
            <header className="screen-head">
              <h2>Territory Information</h2>
              <button className="ghost" onClick={() => requireGame("war")}>Back to War Room</button>
            </header>
            {!gameState || !selectedTerritory ? (
              <div className="empty-state">
                <h3>SELECT A TERRITORY</h3>
                <p>Select a province on the map to inspect it.</p>
              </div>
            ) : (
              <>
                <div className="territory-wrap">
                  <img src="/assets/castle-fort.png" alt="" className="territory-art" />
                  <div className="compact-copy">
                    <h2>{territoryById(selectedTerritoryId).name}</h2>
                    <small>
                      Owned by {houseById(selectedTerritory.ownerHouseId).name} ·{" "}
                      {territoryById(selectedTerritoryId).terrain}
                    </small>
                    {[
                      ["Resource", selectedTerritory.resourceValue],
                      ["Defense", selectedTerritory.defensiveValue],
                      ["Fortification", selectedTerritory.fortificationLevel],
                      ["Throne", selectedTerritory.isThrone ? "Yes" : "No"],
                      [
                        "Sabotage",
                        selectedTerritory.sabotageUntil >= gameState.match.round
                          ? `Active until round ${selectedTerritory.sabotageUntil}`
                          : "Clear",
                      ],
                      ["Last Tax Round", selectedTerritory.lastTaxRound || "Never"],
                    ].map(([label, value]) => (
                      <p key={String(label)}><span>{label}</span><b>{value}</b></p>
                    ))}
                  </div>
                </div>
                <div className="caption">
                  {selectedTerritory.isThrone
                    ? "The Crown of Ashes decides dynasties."
                    : "A contested province in the ash-bound realm."}
                </div>
                <div className="split-buttons">
                  <button onClick={() => issueAction(GAME_CONFIG.actions.Attack, GAME_CONFIG.targetTypes.Territory, selectedTerritoryId)}>
                    Attack
                  </button>
                  <button onClick={() => issueAction(GAME_CONFIG.actions.Fortify, GAME_CONFIG.targetTypes.Territory, selectedTerritoryId)}>
                    Fortify
                  </button>
                  <button onClick={() => issueAction(GAME_CONFIG.actions.Tax, GAME_CONFIG.targetTypes.Territory, selectedTerritoryId)}>
                    Tax
                  </button>
                  <button className="danger" onClick={() => setActiveScreen("war")}>Close</button>
                </div>
              </>
            )}
          </section>
        )}

        {activeScreen === "battle" && (
          <section className="screen panel-screen">
            <header className="screen-head">
              <h2>Battle Screen</h2>
              <button className="ghost" onClick={() => requireGame("war")}>Back</button>
            </header>
            {!gameState?.battle ? (
              <div className="empty-state battle-wait">
                <h3>{gameState?.pendingAction ? "ORDER LOCKED" : "AWAITING BATTLE"}</h3>
                <p>
                  {gameState?.pendingAction
                    ? "Your signed order is sealed for this round. Monad will verify it at settlement."
                    : "Lock an Attack or Dragon Strike order to open the field."}
                </p>
                <div className="battle-grid muted">
                  <div>
                    <small className="good">Attacker</small>
                    <span>{currentHouse.name}</span>
                    <img src={currentHouse.portrait} alt="" className="battle-portrait" />
                  </div>
                  <div className="versus">
                    <strong>{territoryById(selectedTerritoryId).name}</strong>
                    <b>AWAITING OPPONENT</b>
                  </div>
                  <div>
                    <small className="bad">Defender</small>
                    <span>
                      {selectedTerritory
                        ? houseById(selectedTerritory.ownerHouseId).name
                        : "Orders pending"}
                    </span>
                    <img
                      src={houseById(selectedTerritory?.ownerHouseId || 2).portrait}
                      alt=""
                      className="battle-portrait"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="battle-grid">
                  <div>
                    <small className="good">Attacker</small>
                    <span>{houseById(gameState.battle.attackerHouseId).name}</span>
                    <img
                      src={houseById(gameState.battle.attackerHouseId).portrait}
                      alt=""
                      className="battle-portrait"
                    />
                    <b>ATK {gameState.battle.attackPower}</b>
                  </div>
                  <div className="versus">
                    <strong>{territoryById(gameState.battle.territoryId).name}</strong>
                    <img src="/assets/castle-fort.png" alt="" className="battle-castle" />
                    <b className={gameState.battle.victory ? "good" : "bad"}>
                      {gameState.battle.victory ? "Victory" : "Defeat"}
                    </b>
                  </div>
                  <div>
                    <small className="bad">Defender</small>
                    <span>{houseById(gameState.battle.defenderHouseId).name}</span>
                    <img
                      src={houseById(gameState.battle.defenderHouseId).portrait}
                      alt=""
                      className="battle-portrait"
                    />
                    <b>DEF {gameState.battle.defensePower}</b>
                  </div>
                </div>
                <div className="result-box">{gameState.battle.summary}</div>
              </>
            )}
          </section>
        )}

        {activeScreen === "dragon" && (
          <section className="screen panel-screen">
            <header className="screen-head">
              <h2>Dragon Screen</h2>
              <button className="ghost" onClick={() => requireGame("war")}>Back</button>
            </header>
            {!gameState ? (
              <div className="empty-state"><h3>NO BONDED DRAGON</h3><p>Begin a campaign to inspect dragons of the realm.</p></div>
            ) : currentHouse.dragon === "None" && !playerDragon && selectedDragon?.ownerHouseId !== gameState.playerHouseId ? (
              <div className="dragon-layout">
                <img src="/assets/dragons/nacreback.png" alt="" className="dragon-art-img" />
                <div className="stat-column">
                  <h2>NO BONDED DRAGON</h2>
                  <small>{currentHouse.name} has not bound a living drake.</small>
                  <p>Only Skyglass Kin and Dusk Hollow begin with bonded dragons. Capture or inspect wild Nacreback from the tabs below.</p>
                </div>
              </div>
            ) : selectedDragon ? (
              <>
                <div className="dragon-layout">
                  <img
                    src={dragonById(selectedDragon.dragonId).art}
                    alt={dragonById(selectedDragon.dragonId).name}
                    className="dragon-art-img"
                  />
                  <div className="stat-column">
                    <h2>{dragonById(selectedDragon.dragonId).name}</h2>
                    <small>{dragonById(selectedDragon.dragonId).type}</small>
                    {[
                      ["Owner", selectedDragon.ownerHouseId ? houseById(selectedDragon.ownerHouseId).name : "Wild"],
                      ["Power", selectedDragon.power],
                      ["Armor", selectedDragon.armor],
                      ["Speed", selectedDragon.speed],
                      ["Loyalty", selectedDragon.loyalty],
                      ["Wounds", selectedDragon.wounds],
                      ["State", selectedDragon.alive ? "Alive" : `Defeated (R${selectedDragon.deathRound})`],
                      ["Experience", `${Math.max(1, 6 - selectedDragon.wounds)} / 5`],
                    ].map(([label, value]) => (
                      <p key={String(label)}><span>{label}</span><b>{value}</b></p>
                    ))}
                  </div>
                </div>
                <div className="dragon-tabs">
                  {dragonMeta.map((dragon) => (
                    <button key={dragon.id} onClick={() => setSelectedDragonId(dragon.id)}>
                      {dragon.name}
                    </button>
                  ))}
                </div>
              </>
            ) : null}
          </section>
        )}

        {activeScreen === "diplomacy" && gameState && (
          <section className="screen panel-screen">
            <header className="screen-head">
              <h2>Diplomacy Screen</h2>
              <button className="ghost" onClick={() => requireGame("war")}>Back</button>
            </header>
            <div className="target-house">
              <img src={diplomacyHouse.banner} alt="" className="diplomacy-banner" />
              <div>
                <small>Target House</small>
                <h2>{diplomacyHouse.name}</h2>
                <p>Leader <b>{diplomacyHouse.leader}</b></p>
                <p>
                  Relation{" "}
                  <b>
                    {playerHouse?.activeAlliance === diplomacyHouse.id ? "Alliance" : "Neutral"}
                  </b>
                </p>
                <p>Influence cost <b>1</b></p>
                <p>Reputation impact <b>+1 on alliance / −1 on sabotage</b></p>
              </div>
            </div>
            <div className="house-picker">
              {houseMeta
                .filter((h) => h.id !== gameState.playerHouseId)
                .map((house) => (
                  <button
                    key={house.id}
                    className={diplomacyTarget === house.id ? "selected" : ""}
                    onClick={() => {
                      setDiplomacyTarget(house.id);
                      setTargetId(house.id);
                    }}
                  >
                    <img src={house.sigil} alt="" />
                    {house.name}
                  </button>
                ))}
            </div>
            <button
              className="positive"
              onClick={() =>
                issueAction(GAME_CONFIG.actions.Diplomacy, GAME_CONFIG.targetTypes.House, diplomacyTarget)
              }
            >
              Propose Alliance
            </button>
            <button
              className="neutral"
              onClick={() =>
                issueAction(
                  GAME_CONFIG.actions.Tax,
                  GAME_CONFIG.targetTypes.Territory,
                  playerHouse?.territoryId || selectedHouse
                )
              }
            >
              Send Tribute
            </button>
            <button
              className="destructive"
              onClick={() => {
                const enemyLand = gameState.territories.find(
                  (t) => t.ownerHouseId === diplomacyTarget
                );
                if (!enemyLand) return;
                issueAction(
                  GAME_CONFIG.actions.Sabotage,
                  GAME_CONFIG.targetTypes.Territory,
                  enemyLand.territoryId
                );
              }}
            >
              Break Oath
            </button>
          </section>
        )}

        {activeScreen === "chronicle" && (
          <section className="screen panel-screen">
            <header className="screen-head">
              <h2>Chronicle</h2>
              <button className="ghost" onClick={() => (gameState ? setActiveScreen("war") : setActiveScreen("menu"))}>
                Back
              </button>
            </header>
            <div className="event-list dense">
              {(gameState?.events.length ? gameState.events : []).map((event) => {
                const actorId = asNumber(
                  event.args.houseId ?? event.args.newOwnerHouseId ?? event.args.ownerHouseId
                );
                const tone = actorId ? houseById(actorId).tone : "ember";
                return (
                  <div className="event-row" key={event.id}>
                    <img
                      src={actorId ? houseById(actorId).sigil : "/assets/icons/reputation.png"}
                      alt=""
                      className={`event-icon ${tone}`}
                    />
                    <p>
                      <b>Round {asNumber(event.args.round) || event.blockNumber}:</b> {eventText(event)}
                    </p>
                  </div>
                );
              })}
              {!gameState?.events.length && (
                <div className="empty-state">
                  <h3>The chronicle awaits</h3>
                  <p>Start a campaign to record the war.</p>
                </div>
              )}
            </div>
          </section>
        )}

        {activeScreen === "throne" && (
          <section className="screen panel-screen">
            <header className="screen-head">
              <h2>Throne Room</h2>
              <button className="ghost" onClick={() => requireGame("war")}>Back</button>
            </header>
            <div
              className="throne-art"
              style={{ backgroundImage: "url(/assets/throne-room.png)" }}
            />
            <div className="ruler-strip">
              <img
                src={houseById(throneTerritory?.ownerHouseId || 6).sigil}
                alt=""
                className="ruler-sigil"
              />
              <p>
                <span>Current Ruler</span>
                <b>{houseById(throneTerritory?.ownerHouseId || 6).name}</b>
              </p>
              <p>
                Throne Streak: <b>{gameState?.match.throneStreak ?? 0} rounds</b>
              </p>
              <p>
                Throne Territory: <b>{territoryById(throneTerritory?.territoryId || 6).name}</b>
              </p>
              <p>
                Succession:{" "}
                <b>
                  {gameState?.events.find((e) => e.name === "ThroneCaptured")
                    ? eventText(gameState.events.find((e) => e.name === "ThroneCaptured")!)
                    : "The Crown of Ashes still waits for a lasting claim."}
                </b>
              </p>
            </div>
          </section>
        )}

        {activeScreen === "inventory" && (
          <section className="screen panel-screen">
            <header className="screen-head">
              <h2>Inventory / Resources</h2>
              <button className="ghost" onClick={() => requireGame("war")}>Back</button>
            </header>
            {resourceRows.map((row) => (
              <div className="resource-row" key={row.label}>
                <img src={row.icon} alt="" />
                <span>{row.label}</span>
                <b>{row.value}</b>
              </div>
            ))}
          </section>
        )}

        {activeScreen === "profile" && (
          <section className="screen panel-screen">
            <header className="screen-head">
              <h2>Player Profile</h2>
              <button className="ghost" onClick={() => requireGame("war")}>Back</button>
            </header>
            <div className="profile-top">
              <img src={currentHouse.portrait} alt="" className="profile-portrait" />
              <div className="profile-copy">
                <img src={currentHouse.banner} alt="" className="profile-banner" />
                <h2>{currentHouse.name}</h2>
                <span>{currentHouse.leader} · {currentHouse.subtitle}</span>
                {[
                  ["Gold", playerHouse?.gold ?? 0],
                  ["Influence", playerHouse?.influence ?? 0],
                  ["Military", playerHouse?.military ?? 0],
                  ["Reputation", playerHouse?.reputation ?? 0],
                  ["Territories", territoryCount],
                  ["Dragon", playerDragon ? dragonById(playerDragon.dragonId).name : "None"],
                ].map(([label, value]) => (
                  <p key={String(label)}><span>{label}</span><b>{value}</b></p>
                ))}
              </div>
            </div>
            <div className="profile-foot">
              <span>
                Rank{" "}
                <b>
                  {gameState?.match.winnerHouseId === selectedHouse
                    ? "Victor"
                    : gameState?.match.status === 2
                      ? "Defeated"
                      : "Lord"}
                </b>
              </span>
              <span>
                Player <b>{shortAddress}</b>
              </span>
            </div>
          </section>
        )}

        {activeScreen === "monad" && (
          <section className="screen panel-screen monad-screen">
            <header className="screen-head">
              <h2>Monad</h2>
              <button className="ghost" onClick={() => setActiveScreen("menu")}>Back</button>
            </header>
            <div className="monad-panel">
              <h3>The Realm Runs On-Chain</h3>
              <p>
                Oaths &amp; Ashes uses Monad Testnet as its verifiable settlement layer — not as a
                button-for-every-click blockchain UI.
              </p>
              <div className="monad-flow">
                <span>PLAYER</span>
                <small>↓ signed orders (EIP-712, no gas)</small>
                <span>OATHS &amp; ASHES</span>
                <small>↓ round settlement (one transaction)</small>
                <span>MONAD</span>
                <small>↓ verified game state</small>
              </div>
              <ul className="monad-list">
                <li>Verifiable battle resolution</li>
                <li>Territory ownership</li>
                <li>Resource and tax settlement</li>
                <li>Dragon Strike outcomes</li>
                <li>Immutable Chronicle events</li>
                <li>Signed player orders</li>
              </ul>
              <p className="monad-powered">Powered by Monad Testnet</p>
              <div className="compact-copy">
                <p><span>Chain ID</span><b>10143</b></p>
                <p><span>Contract</span><b>0x478643…d3010</b></p>
                <p><span>Round flow</span><b>Sign order → settle round</b></p>
                <p><span>Deployed upgrade</span><b>settleRoundWithIntents (redeploy for 1-tx settlement)</b></p>
              </div>
            </div>
          </section>
        )}

        {(status || error) && (
          <div className={`toast ${error ? "error" : ""}`}>{error || status}</div>
        )}

        {settingsOpen && (
          <div className="modal-backdrop" onClick={() => setSettingsOpen(false)}>
            <div className="modal" onClick={(event) => event.stopPropagation()}>
              <h3>Settings</h3>
              <p>
                Mode: <b>{mode}</b> — production uses Monad contract as authority.
              </p>
              <p>Network: {connected ? `Monad ${chainId}` : "Not connected"}</p>
              <p>Identity: {shortAddress}</p>
              <p>Tx: {txPhase}</p>
              <div className="split-buttons">
                <button onClick={() => void connect()} disabled={loading}>
                  {connected ? "Reconnect Wallet" : "Connect Wallet"}
                </button>
                <button onClick={() => setMode(mode === "MONAD" ? "LOCAL" : "MONAD")}>
                  Switch to {mode === "MONAD" ? "LOCAL" : "MONAD"}
                </button>
              </div>
              <div className="split-buttons">
                <button onClick={() => void handleNewGame()}>New Match</button>
                <button className="danger" onClick={() => setSettingsOpen(false)}>Close</button>
              </div>
              <a className="gallery-link" href="/reference-gallery">Open Reference Gallery</a>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
