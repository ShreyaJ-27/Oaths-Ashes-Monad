import React, { useMemo } from "react";
import { createLocalGame, applyLocalAction, resolveLocalRound } from "./localGame";
import { GAME_CONFIG } from "./types";
import {
  dragonById,
  eventText,
  houseById,
  houseMeta,
  territoryById,
  territoryMeta,
  asNumber,
} from "./gameMeta";

/** Dense composition gallery matching the visual reference collage. */
export function ReferenceGallery() {
  const state = useMemo(() => {
    let game = createLocalGame(5);
    game = applyLocalAction(
      game,
      GAME_CONFIG.actions.Attack,
      GAME_CONFIG.targetTypes.Territory,
      6
    );
    game = resolveLocalRound(game);
    game = applyLocalAction(
      game,
      GAME_CONFIG.actions.Diplomacy,
      GAME_CONFIG.targetTypes.House,
      3
    );
    return game;
  }, []);

  const player = state.houses.find((h) => h.houseId === state.playerHouseId)!;
  const sky = houseById(5);
  const throne = state.territories.find((t) => t.isThrone)!;
  const dragon = state.dragons[0];
  const selectedTerritory = state.territories[5];

  return (
    <main className="oaths-shell gallery-shell">
      <div className="gallery-toolbar">
        <a href="/">← Back to Game</a>
        <span>Reference Gallery · populated QA composition · 1536×1024 canvas</span>
      </div>
      <div className="game-canvas gallery-canvas">
        <section className="game-panel panel-menu">
          <header className="panel-title">Main Menu</header>
          <div className="menu-art" style={{ backgroundImage: "url(/assets/menu-bg.png)" }} />
          <h1>Oaths & Ashes</h1>
          <div className="menu-buttons">
            <button>New Game</button>
            <button>Join Match</button>
            <button>Chronicle</button>
            <button>Settings</button>
            <button>Exit</button>
          </div>
        </section>

        <section className="game-panel panel-houses">
          <header className="panel-title">House Selection</header>
          <div className="subhead">Choose your dynasty</div>
          <div className="banner-row">
            {houseMeta.map((house) => (
              <div key={house.id} className={`house-banner ${house.tone} ${house.id === 5 ? "selected" : ""}`}>
                <img src={house.banner} alt="" className="banner-art" />
                <img src={house.sigil} alt="" className="banner-sigil" />
                <strong>{house.name}</strong>
                <small>{house.subtitle}</small>
              </div>
            ))}
          </div>
          <div className="selection-info house-detail">
            <strong>{sky.name}</strong>
            <span>Leader: {sky.leader}</span>
            <span>Passive: {sky.passive}</span>
            <span>Dragon: {sky.dragon}</span>
          </div>
        </section>

        <section className="game-panel panel-war">
          <header className="panel-title">War Room (Map View)</header>
          <div className="resource-bar">
            <span>Round <b>{state.match.round}</b></span>
            <span>Time <b>32s</b></span>
            <span><img src="/assets/icons/gold.png" alt="" />{player.gold}</span>
            <span><img src="/assets/icons/influence.png" alt="" />{player.influence}</span>
            <span><img src="/assets/icons/military.png" alt="" />{player.military}</span>
            <span><img src="/assets/icons/reputation.png" alt="" />{player.reputation}</span>
          </div>
          <div className="war-layout">
            <div className="strategy-map" style={{ backgroundImage: "url(/assets/world-map.png)" }}>
              {territoryMeta.map((meta) => {
                const territory = state.territories.find((t) => t.territoryId === meta.id)!;
                const owner = houseById(territory.ownerHouseId);
                return (
                  <div
                    key={meta.id}
                    className={`territory-marker ${owner.tone} ${meta.id === 6 ? "selected throne-marker" : ""}`}
                    style={{ left: `${meta.x}%`, top: `${meta.y}%` }}
                  >
                    <img src="/assets/castle-fort.png" alt="" className="castle-marker" />
                    <em>{meta.label}</em>
                  </div>
                );
              })}
            </div>
            <aside className="war-actions">
              {["Army", "Dragon", "Diplomacy", "Chronicle", "Throne"].map((label) => (
                <button key={label}>{label}</button>
              ))}
              <div className="mini-map" style={{ backgroundImage: "url(/assets/world-map.png)" }} />
            </aside>
          </div>
        </section>

        <section className="game-panel panel-territory">
          <header className="panel-title">Territory Info</header>
          <div className="territory-wrap">
            <img src="/assets/castle-fort.png" alt="" className="territory-art" />
            <div className="compact-copy">
              <h2>{territoryById(selectedTerritory.territoryId).name}</h2>
              <small>Owned by {houseById(selectedTerritory.ownerHouseId).name}</small>
              <p><span>Resource</span><b>{selectedTerritory.resourceValue}</b></p>
              <p><span>Defense</span><b>{selectedTerritory.defensiveValue}</b></p>
              <p><span>Fortification</span><b>{selectedTerritory.fortificationLevel}</b></p>
              <p><span>Throne</span><b>Yes</b></p>
            </div>
          </div>
        </section>

        <section className="game-panel panel-battle">
          <header className="panel-title">Battle Screen</header>
          <div className="battle-grid">
            <div>
              <small className="good">Attacker</small>
              <span>{sky.name}</span>
              <img src={sky.portrait} alt="" className="battle-portrait" />
            </div>
            <div className="versus">
              <strong>Crown of Ashes</strong>
              <b className={state.battle?.victory ? "good" : "bad"}>
                {state.battle?.victory ? "Victory" : "Defeat"}
              </b>
            </div>
            <div>
              <small className="bad">Defender</small>
              <span>{houseById(state.battle?.defenderHouseId || 6).name}</span>
              <img
                src={houseById(state.battle?.defenderHouseId || 6).portrait}
                alt=""
                className="battle-portrait"
              />
            </div>
          </div>
          <div className="result-box">{state.battle?.summary || "Orders resolved."}</div>
        </section>

        <section className="game-panel panel-dragon">
          <header className="panel-title">Dragon Screen</header>
          <div className="dragon-layout">
            <img src={dragonById(dragon.dragonId).art} alt="" className="dragon-art-img" />
            <div className="stat-column">
              <h2>{dragonById(dragon.dragonId).name}</h2>
              <small>{dragonById(dragon.dragonId).type}</small>
              <p><span>Owner</span><b>{houseById(dragon.ownerHouseId).name}</b></p>
              <p><span>Power</span><b>{dragon.power}</b></p>
              <p><span>Armor</span><b>{dragon.armor}</b></p>
              <p><span>Alive</span><b>{dragon.alive ? "Yes" : "No"}</b></p>
            </div>
          </div>
        </section>

        <section className="game-panel panel-diplomacy">
          <header className="panel-title">Diplomacy Screen</header>
          <div className="target-house">
            <img src={houseById(3).banner} alt="" className="diplomacy-banner" />
            <div>
              <small>Target House</small>
              <h2>{houseById(3).name}</h2>
              <p>Relation <b>Alliance</b></p>
            </div>
          </div>
          <button className="positive">Propose Alliance</button>
          <button className="neutral">Send Tribute</button>
          <button className="destructive">Break Oath</button>
        </section>

        <section className="game-panel panel-chronicle">
          <header className="panel-title">Chronicle (Events)</header>
          <div className="event-list dense">
            {state.events.slice(0, 8).map((event) => {
              const actorId = asNumber(event.args.houseId);
              return (
                <div className="event-row" key={event.id}>
                  <img
                    src={actorId ? houseById(actorId).sigil : "/assets/icons/reputation.png"}
                    alt=""
                    className="event-icon"
                  />
                  <p>
                    <b>Round {asNumber(event.args.round) || event.blockNumber}:</b> {eventText(event)}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="game-panel panel-throne">
          <header className="panel-title">Throne Room</header>
          <div className="throne-art" style={{ backgroundImage: "url(/assets/throne-room.png)" }} />
          <div className="ruler-strip">
            <img src={houseById(throne.ownerHouseId).sigil} alt="" className="ruler-sigil" />
            <p><span>Current Ruler</span><b>{houseById(throne.ownerHouseId).name}</b></p>
            <p>Throne Streak: <b>{state.match.throneStreak} rounds</b></p>
          </div>
        </section>

        <section className="game-panel panel-inventory">
          <header className="panel-title">Inventory / Resources</header>
          {[
            ["Gold", player.gold, "/assets/icons/gold.png"],
            ["Influence", player.influence, "/assets/icons/influence.png"],
            ["Military", player.military, "/assets/icons/military.png"],
            ["Reputation", player.reputation, "/assets/icons/reputation.png"],
            ["Territories", state.territories.filter((t) => t.ownerHouseId === 5).length, "/assets/icons/territory.png"],
            ["Dragon", "Ashwing", "/assets/icons/dragon.png"],
          ].map(([label, value, icon]) => (
            <div className="resource-row" key={String(label)}>
              <img src={String(icon)} alt="" />
              <span>{label}</span>
              <b>{value}</b>
            </div>
          ))}
        </section>

        <section className="game-panel panel-profile">
          <header className="panel-title">Player Profile</header>
          <div className="profile-top">
            <img src={sky.portrait} alt="" className="profile-portrait" />
            <div className="profile-copy">
              <img src={sky.banner} alt="" className="profile-banner" />
              <h2>{sky.name}</h2>
              <span>{sky.leader}</span>
              <p><span>Gold</span><b>{player.gold}</b></p>
              <p><span>Military</span><b>{player.military}</b></p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
