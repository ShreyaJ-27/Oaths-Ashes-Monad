# Oaths & Ashes — Phase 1 Game State & Rules Specification

## 1. Game Design Goal

Oaths & Ashes is a deterministic six-player tactical dynasty-war game for Monad. It is designed to fit a fast 10-second decision loop with strategic depth, direct multiplayer tension, and meaningful onchain settlement.

The core loop is:

JOIN → CHOOSE HOUSE → ROUND START → 10-SECOND DECISION → ACTION INTENT LOCKED → SETTLEMENT → WORLD STATE CHANGES → EVENTS → VISUAL RESOLUTION → NEXT ROUND → FINAL RESULT

Design goals:

- 6-player match, deterministic and contract-executable
- fast, understandable decision model
- meaningful diplomacy and betrayal
- strategic value in territory control, dragon management, and reputation
- onchain source-of-truth with signed-intent submission and settlement on Monad
- room for later Phaser visual interpretation without changing the ruleset
- no token economy, no pay-to-win, no deceptive fake blockchain logic

This specification is locked for Phase 1. No frontend, Solidity, wallet flow, or visual asset work is included.

---

## 2. Define the Six Houses

There are exactly 6 playable houses. Each house has a distinct strategic identity, but none is objectively strongest.

| House | Sigil concept | Strategic identity | Starting territory | Starting gold | Starting influence | Starting military | Starting reputation | Dragon relationship | Passive trait |
|---|---|---|---|---:|---:|---:|---:|---|---|
| Ashen Vale | a blackened flame within a bronze ring | military pressure and direct conquest | Ashenmere | 5 | 3 | 6 | 5 | none | +1 attack power when attacking an adjacent enemy territory |
| Iron Briar | a thorned iron crown | defense, attrition, and space control | Briarfen | 4 | 4 | 7 | 6 | none | +1 defense while holding a territory adjacent to the Throne |
| Gloam Reed | a veiled reed over a moonlit blade | deception, intrigue, and sabotage | Glasswater | 5 | 4 | 5 | 4 | none | Sabotage success threshold is reduced by 1 |
| Ember Crown | a furnace-coin crest | economy, taxation, and sustained power | Emberkeep | 7 | 3 | 5 | 5 | none | Tax yields +1 extra gold in owned territories with resource value >= 3 |
| Skyglass Kin | a winged glass sigil | dragon mastery and aerial pressure | Thornwatch | 4 | 4 | 5 | 5 | bonded to Ashwing | Dragonstrike costs 1 less gold (minimum 0) |
| Dusk Hollow | a crimson raven over a black banner | aggression, early claims, and risk-taking | Throne | 5 | 2 | 6 | 4 | bonded to Cinderclaw | First successful attack each match gains +1 reputation |

House-specific rule notes:

- Each house has a unique `houseId` from 1..6.
- The player controls one house for the full match.
- Houses are persistent across rounds, not recreated each round.
- Every house can be represented in the smart contract as a struct with persistent stats.

---

## 3. Define the Six Territories

There are exactly 6 territories total:

- 5 outer territories
- 1 central throne territory

### Territory list

| Territory | Type | Map position | Starting owner | Resource value | Defensive value | Strategic purpose |
|---|---|---|---|---:|---:|---|
| Ashenmere | Outer | North-east | Ashen Vale | 3 gold | 2 | economic pressure and expansion lane |
| Briarfen | Outer | East | Iron Briar | 2 gold | 3 | defensive anchor and choke point |
| Glasswater | Outer | South-east | Gloam Reed | 3 influence | 2 | diplomacy and disruption lane |
| Emberkeep | Outer | South-west | Ember Crown | 4 gold | 2 | tax and industrial income |
| Thornwatch | Outer | West | Skyglass Kin | 3 military | 3 | dragon approach and military staging |
| Crown of Ashes | Throne | Center | Dusk Hollow | 4 combined yield (2 gold + 2 influence equivalent) | 4 | central objective; throne control and final victory |

### Adjacency graph

The territory graph is simple, connected, and deterministic.

- Ashenmere: adjacent to Throne, Briarfen, Emberkeep
- Briarfen: adjacent to Throne, Ashenmere, Glasswater
- Glasswater: adjacent to Throne, Briarfen, Thornwatch
- Thornwatch: adjacent to Throne, Glasswater, Emberkeep
- Emberkeep: adjacent to Throne, Thornwatch, Ashenmere
- Throne: adjacent to Ashenmere, Briarfen, Glasswater, Thornwatch, Emberkeep

This yields a 5-node outer cycle plus the center node connected to each outer node. It is simple enough for both map rendering and Solidity graph logic.

Graph representation conceptually:

- `T = Throne`
- `A = Ashenmere`
- `B = Briarfen`
- `G = Glasswater`
- `U = Thornwatch`
- `E = Emberkeep`

Adjacency:

- `T: [A, B, G, U, E]`
- `A: [T, B, E]`
- `B: [T, A, G]`
- `G: [T, B, U]`
- `U: [T, G, E]`
- `E: [T, U, A]`

Territory rules:

- Every territory has a `fortificationLevel` from 0..3.
- Every territory has an `ownerHouseId` or `NONE`.
- The throne is unique and can never be neutral.
- A house can only fortify territories it controls.
- A territory can be captured by ATTACK, DRAGONSTRIKE, or throne-taking resolution if the formula resolves it.

---

## 4. Resources

The game uses a minimal but meaningful resource system.

### Resource summary

| Resource | Starting value | Min | Max | How it changes | Used by | Generated by | Persistent | Onchain |
|---|---:|---:|---:|---|---|---|---|---|
| Gold | 5 to 7 by house | 0 | 20 | changes each round and on capture | ATTACK, FORTIFY, DRAGONSTRIKE, SABOTAGE | TAX, territory yields, throne control | yes | yes |
| Influence | 2 to 4 by house | 0 | 12 | changes each round via diplomacy and throne control | ATTACK, DIPLOMACY, SABOTAGE, DRAGONSTRIKE | DIPLOMACY, throne control | yes | yes |
| Reputation | 4 to 6 by house | -10 | 50 | changes on betrayals, victories, throne control, successful defense | modifies diplomacy and vengeance, scoring | victories, defenses, throne control | yes | yes |
| Military | house-specific | 0 | 20 | changes from combat losses and rewards | ATTACK, defense calculations | no direct generation | yes | yes |
| Dragon wounds / health | per dragon | 0 | 3 | changes when hit by Dragonstrike or battle | dragon combat resolution | none | yes | yes |

Design decisions:

- There is no token economy.
- There are no NFTs.
- There is no staking and no conversion between in-game resources and real-world value.
- `Gold` and `Influence` are the only direct spend currencies.
- `Reputation` is a persistent stat with gameplay consequences, not only cosmetic text.
- `Military` is not a generic "currency"; it reflects combat strength and is modified by combat outcomes.
- `Dragon wounds` are tracked as a property of each dragon, not a separate house resource.

### Resource rules

- Gold is always stored as an integer.
- Influence is always stored as an integer.
- Reputation is always stored as an integer between -10 and 50.
- Military strength on a house is always stored as an integer and is reduced by casualties.
- Negative values are allowed only for reputation; never allow negative gold or negative influence. If a cost would exceed available value, the action fails and no partial application occurs.
- Resource changes occur after resolution, not during intent submission.

---

## 5. Define the Six Actions

There are exactly six actions. Each action is an explicit, deterministic intent that is settled onchain after round-end validation.

### Action list

1. ATTACK
2. FORTIFY
3. DRAGONSTRIKE
4. DIPLOMACY
5. SABOTAGE
6. TAX

### Common action rules

- Each house may submit at most one action per round.
- `targetType` and `targetId` must be valid for the chosen action.
- If a house does not submit or submits invalid data, the contract applies the default action: `FORTIFY` on the house's home territory.
- The action cannot be partially executed; it either fully resolves or fails with no side effect unless otherwise specified.
- The round backend validates the action against house state, round, nonce, signature, and legality rules before settlement.

### Action 1: ATTACK

Intent parameters:

- `action = ATTACK`
- `targetTerritoryId`
- Optional `sourceTerritoryId` only for validation if the player declares a staging base, otherwise default to home territory

Legal targets:

- any enemy-controlled territory
- throne territory if belonging to any enemy house
- one adjacent enemy territory only if the attacking house controls a territory adjacent to the target or the attack originates from home territory as a direct attack path

Resource cost:

- 2 gold
- 1 influence

Effect:

- resolves a contested battle against a target territory
- may capture a territory if attack exceeds defense sufficiently
- may reduce fortification and cause military casualties

Duration:

- instantaneous; all effects resolve in the same round

Risk:

- if attack fails, the attacker loses resources and may lose military strength

Cooldown:

- none

Can fail:

- yes, if cost cannot be paid or target invalid

Multiple attackers:

- all ATTACK intents targeting the same territory are aggregated before resolution
- each house contributes one attack score
- highest total attack score wins; ties are broken by `higher reputation`, then `lower houseId`

Resolution formula:

- `attackScore(h, t) = house.military + adjacentSupportBonus + passiveBonus - targetFortificationPenalty`
- `adjacentSupportBonus = 2 if the attacking house controls a territory adjacent to the target territory; otherwise 0`
- `targetDefense(t) = territory.defensiveValue + fortificationLevel*2 + ownerHouseMilitary/2`
- `battleDelta = sum(attackScore for all attackers) - targetDefense`

Deterministic outcomes:

- if `battleDelta >= 4` and the winning house is one of the attackers, the target territory is captured by the winning house
- if `battleDelta >= 1` and `battleDelta < 4`, no capture; reduce target fortification by 1
- if `battleDelta <= 0`, no capture; losing attacker military is reduced by `max(1, abs(battleDelta)/2)`

Event emission:

- `TerritoryAttackResolved`
- `TerritoryCaptured` if capture happens
- `FortificationDamaged` if fortification is reduced without capture

### Action 2: FORTIFY

Intent parameters:

- `action = FORTIFY`
- `targetTerritoryId`

Legal targets:

- any territory currently owned by the acting house

Resource cost:

- 1 gold

Effect:

- increments `fortificationLevel` by 1 on that territory
- maximum `fortificationLevel = 3`
- if a territory is fortified and later attacked in the same round, the fortification is applied before attack resolution

Duration:

- resolves immediately and lasts until the end of the next round unless destroyed in combat

Risk:

- low; can be wasted if no attack occurs

Cooldown:

- none

Can fail:

- yes, if the target is not controlled by the acting house or gold is insufficient

Multiple players targeting same territory:

- only the acting house can fortify its own territory
- if multiple houses target the same territory, only the owner can apply a fortify action; others are invalid

Resolution formula:

- `newFortification = min(3, oldFortification + 1)`
- `defenseBonus = newFortification * 2`

Event emission:

- `Fortified`

### Action 3: DRAGONSTRIKE

Intent parameters:

- `action = DRAGONSTRIKE`
- `dragonId`
- `targetType` = `territory`, `dragon`, or `throne`
- `targetId`

Legal targets:

- any dragon controlled by an enemy house
- any enemy territory if the acting house controls that dragon and the dragon is not wounded beyond threshold
- the throne if the acting house controls a dragon and the target is enemy-controlled

Resource cost:

- 2 gold
- 1 influence
- reduced by 1 gold if the acting house has the `Skyglass Kin` passive trait

Effect:

- uses a dragon as a strategic weapon instead of a simple attack button
- dragon combat can wound, capture, or kill a dragon

Duration:

- instantaneous; dragon uses and resolves in the same round

Risk:

- high; if target dragon is larger or better armored, the attacking dragon may be wounded or killed

Cooldown:

- none

Can fail:

- yes, if dragon is not controlled by the acting house, not alive, or target invalid

Multiple players targeting the same dragon:

- all dragon attacks are aggregated into a dragon battle
- if multiple houses attack the same enemy dragon, the highest `dragonAttackScore` wins the exchange
- ties are broken by higher `dragon.speed`, then lower `houseId`

Resolution formulas:

- `dragonAttackScore = dragon.power + dragon.speed + ownerHousePassiveDragonBonus - dragon.wounds*2`
- `dragonDefenseScore = targetDragon.armor + targetDragon.loyalty + targetDragon.wounds`
- `dragonDelta = dragonAttackScore - dragonDefenseScore`

For a dragon attacking a territory:

- `territoryTargetDefense = territory.defensiveValue + fortificationLevel*2`
- `dragonDelta = dragonAttackScore - territoryTargetDefense`
- if `dragonDelta >= 4`, territory is captured by the attacking house
- if `1 <= dragonDelta < 4`, the territory loses 1 fortification and no control change
- else no capture and dragon suffers 1 wound

For a dragon attacking an enemy dragon:

- if `dragonDelta >= 3`, enemy dragon takes 1 wound
- if `dragonDelta >= 6`, enemy dragon takes a second wound
- if cumulative wounds >= 3, dragon dies permanently and is removed from game state

Dragon death rule:

- `alive = false` when `wounds >= 3`
- `deathRound` is recorded
- `dragonHistory` is appended with permanent death
- the dragon is removed from active ownership and cannot recover in the same match

Transfer rule:

- if a dragon is defeated and belongs to a house, it transfers to the victor by default if the victor is the acting house
- if a dragon is neutral and captured, the capturing house becomes its owner immediately after settlement

Event emission:

- `DragonStrike`
- `DragonWounded`
- `DragonKilled`
- `DragonCaptured`
- `DragonTransferred`

### Action 4: DIPLOMACY

Intent parameters:

- `action = DIPLOMACY`
- `targetHouseId`
- `diplomacyType` = `proposal` or `accept`

Legal targets:

- any other house

Resource cost:

- 1 influence

Effect:

- creates a temporary alliance between houses if both sides submit matching diplomacy intents in the same round and both agree
- or, if an existing alliance is active, it can extend or renew it within the allowed rules

Duration:

- alliance duration is 2 rounds from the end of settlement
- maximum active alliance length is 2 rounds
- after expiry, alliance is removed automatically

Risk:

- low immediate risk, but broken alliances cause severe reputation loss and vengeance triggers

Cooldown:

- none

Can fail:

- yes, if the target house does not reciprocate or the ally already has another alliance within the maximum allowed duration

Multiple players targeting same entity:

- alliances are pairwise; a house may hold at most one active alliance at a time
- if a house has an active alliance and attempts to form another, the new proposal is invalid until the previous one expires

Resolution formula:

- `proposalValid = (targetHouseId != actingHouseId) && (influence >= 1) && (no existing active alliance with target)`
- `acceptanceRequires = target house also submits DIPLOMACY to acting house in same round`
- if both submit reciprocal requests, `alliance` is created
- alliance grants:
  - mutual non-aggression
  - +1 gold to each house at the end of each round while alliance is active
  - +1 influence to each house at the end of each round while alliance is active

Restrictions:

- allied houses cannot attack each other
- allied houses cannot sabotage each other without causing betrayal
- allied houses can still attack enemy territories jointly but cannot both be declared as the same owner in a single conquest event

Event emission:

- `AllianceFormed`
- `AllianceExtended`
- `AllianceExpired`

### Action 5: SABOTAGE

Intent parameters:

- `action = SABOTAGE`
- `targetHouseId` or `targetTerritoryId`
- `sabotageType` = `house` or `territory`

Legal targets:

- enemy house
- enemy-controlled territory
- dragon under enemy ownership

Resource cost:

- 1 gold
- 1 influence

Effect:

- reduces enemy resources, disrupts a territory, or damages a dragon
- sabotage against an allied house is treated as betrayal, not normal sabotage

Duration:

- instantaneous

Risk:

- moderate; if the target is prepared or retaliates, the saboteur may lose influence or trigger vengeance

Cooldown:

- none

Can fail:

- yes, if the target is invalid or if the acting house lacks resources

Multiple players targeting the same target:

- the target can be sabotaged by multiple houses in the same round, but each sabotage attempt is resolved in order of houseId ascending
- all sabotage effects are deterministic and additive up to a cap of 2 per target per round

Resolution formula:

- `sabotagePower = actingHouse.influence + (actingHouse.passiveSabotageBonus ? 1 : 0) - targetDefense`
- if `targetType == house`:
  - if `sabotagePower >= 3`, targeted house loses 2 gold and 1 influence
  - else no effect
- if `targetType == territory`:
  - if `sabotagePower >= 4`, target territory loses 1 fortification and yields -1 gold for 1 round
  - else no effect
- if `targetType == dragon`:
  - if `sabotagePower >= 5`, target dragon gains 1 wound
  - else no effect

If the target is an ally:

- this is automatically an `AllianceBetrayed` event
- the acting house immediately loses 3 reputation
- the betrayed house gains 4 reputation and receives a `VENGEANCE` flag for 2 rounds

Event emission:

- `SabotageResolved`
- `TerritorySabotaged`
- `DragonSabotaged`
- `AllianceBetrayed`

### Action 6: TAX

Intent parameters:

- `action = TAX`
- `targetTerritoryId`

Legal targets:

- any territory the acting house currently controls

Resource cost:

- 0 gold
- 0 influence

Effect:

- collects revenue from a controlled territory

Duration:

- instantaneous, but income persists to next round

Risk:

- if a territory is sabotaged or under attack in the same round, tax yield is reduced

Cooldown:

- none

Can fail:

- yes, if the territory is not owned by the acting house or if the target is neutral

Multiple players targeting same territory:

- no conflict; each house taxes its own owned territory independently

Resolution formula:

- `baseTaxGold = territory.resourceValue`
- `taxGold = baseTaxGold + (territory == Throne ? 2 : 0) + (house passive tax bonus ? 1 : 0)`
- `taxInfluence = 1 if territory.resourceValue >= 3 else 0`
- if the territory suffered sabotage or attack this round, reduce `taxGold` by 1 and `taxInfluence` by 1, minimum 0

Event emission:

- `TaxCollected`

---

## 6. Round System

The match lasts exactly 10 rounds.

### Round lifecycle

1. Round start
2. Decision window opens
3. Players submit signed intents
4. Deadline enforced by contract using block time
5. Settlement and resolution
6. State updates
7. Event generation
8. Visual resolution phase
9. Next round begins

### Exact round timing

- Each round has a decision window of 10 seconds.
- `roundStartTimestamp` is recorded at the first block in the new round.
- The contract deadline is defined as:

`roundDeadline = roundStartTimestamp + 10 seconds`

The game frontend timer is advisory only. The contract uses the onchain timestamp from the last block that contains the transaction. If the player submits after the contract deadline, the intent is rejected as late.

### Submission rules

- A valid signed intent must include:
  - `matchId`
  - `round`
  - `houseId`
  - `action`
  - `targetType`
  - `targetId`
  - `nonce`
  - `deadline`
  - `signature`
  - `chainId`

The contract must reject:

- mismatched `matchId`
- stale round values
- invalid signer address
- wrong house ownership
- duplicate nonce reuse
- replayed old intent for same round
- target not legal for that action
- late submission after `deadline`

### Missing player fallback

If a house does not submit a valid action by deadline, the fallback action is:

- `FORTIFY` on the house's home territory

The fallback is deterministic and not player-controlled.

### Failure handling

If a transaction fails:

- the intent is not accepted
- no state changes are applied from that transaction
- the player retains their prior state and must resubmit within the round deadline

If an intent is invalid:

- the contract rejects it and emits `IntentRejected`
- the fallback action is used if the house never submits a valid action in time

If a player disconnects:

- the contract does not care; the frontend is not authoritative
- the contract still uses the last valid action or fallback action

If a player submits twice:

- only the first valid submission for that nonce is accepted
- the second is rejected as duplicate

If a player attempts to replay an old intent:

- the contract rejects it because the round or nonce is no longer valid

Late submission rule:

- submission after deadline is invalid regardless of wallet status or frontend timer display

Default action rule:

- `DEFAULT_ACTION = FORTIFY(homeTerritory)`
- This is the legal fallback for missing, invalid, or disconnected players

---

## 7. Hybrid Signed-Intent Model

The game uses a hybrid architecture:

- frontend prepares and signs an intent offchain
- the frontend may optimistically show the intent as committed
- the smart contract validates it on Monad at settlement time
- final world state is authoritative onchain

### Intent structure

Conceptually, a valid signed intent is:

```text
Intent {
  matchId: bytes32,
  round: uint8,
  houseId: uint8,
  player: address,
  action: Action,
  targetType: TargetType,
  targetId: uint8,
  nonce: uint256,
  deadline: uint256,
  chainId: uint256,
  payloadHash: bytes32,
  signature: bytes
}
```

Required fields:

- `matchId` ensures the action belongs to the correct match
- `round` ensures the action applies to the correct round only
- `houseId` identifies the acting house
- `player` is the authorized signer or the wallet used for this house
- `action` identifies the action type
- `targetType` selects the desired target category
- `targetId` identifies the specific territory, house, or dragon
- `nonce` prevents replay and duplicate submissions
- `deadline` prevents stale actions
- `signature` proves intent authenticity
- `payloadHash` ensures exact payload matching without broadcast of full signed message

Additional required data may be added if necessary for a valid action, such as `sourceTerritoryId`, `allianceId`, or `dragonId` where a more precise target is needed. The contract must reject ambiguous payloads.

### Contract verification requirements

The contract must verify:

- the signer is a registered player for the house in the match
- the house is still alive and valid in this match
- the round is the current round being settled
- the intent was signed within the round deadline
- the nonce has not been used before
- the action is legal for the house in that round
- the target exists and is valid for the action
- the action cost can be paid from the house state
- the player is not submitting an old or future round intent
- the submitted intent is not an already-processed duplicate

### Replay protection

- The contract stores `usedNonces[matchId][houseId][nonce]`.
- Once used, the same nonce cannot be used again.
- A duplicate intent must revert.
- Replaying an older signed action is rejected by round mismatch or by nonce reuse.

### Duplicate and stale handling

- Same nonce + same match + same house = invalid on second submission
- Same action with a different nonce is still valid if the round and legality match
- Old round payloads are invalid once the round is closed

### Malicious change after signing

- The action payload is signed as a complete object. If the frontend changes target, round, nonce, or action after signing, the signature fails verification.
- The contract never accepts a signature that does not exactly match the intended payload.

---

## 8. Alliances / Diplomacy

Temporary alliances are a major strategic mechanic. They are pairwise, limited, and visible.

### Alliance rules

- A proposal is a `DIPLOMACY` action targeted at another house.
- The target house can accept by also submitting a reciprocal `DIPLOMACY` action to the proposer in the same round.
- Alliance is valid only if both houses are not already in another active alliance.
- A house may have only one active alliance at a time.

### Alliance duration and benefits

- Duration: 2 rounds from settlement
- Maximum alliance duration: 2 rounds
- Benefits while active:
  - mutual non-aggression
  - +1 gold each round for each allied house
  - +1 influence each round for each allied house
- Restrictions:
  - allies cannot attack each other
  - allies cannot sabotage each other without triggering betrayal
  - allies can still attack common enemies

### Alliance visibility

- Alliance status is onchain and visible to all players as a `AllianceState`.
- The alliance is included in world state and emitted in the Chronicle.

### Alliance expiration

- At the end of the final round of an alliance, the state is removed automatically.
- The event `AllianceExpired` is emitted before the next round begins.

### Breaking alliances

- A house that attacks or sabotages an alliance partner is automatically in breach.
- Breaking an alliance is a betrayal event and immediately triggers reputation penalties and vengeance state.

---

## 9. Betrayal

Betrayal is intentionally risky, tempting, and strategically meaningful.

### What counts as betrayal

A betrayal occurs when a house does any of the following against an active alliance partner:

- ATTACK their ally
- SABOTAGE their ally
- DRAGONSTRIKE an ally's dragon
- attempts to capture an ally's territory while allied

### When betrayal happens

- It is detected during round settlement if the action target is an active alliance partner.

### Immediate benefit

- The betrayer gains +2 gold immediately for the round
- The betrayer gains +2 influence immediately for the round
- The betrayer receives a short tactical advantage in the same resolve stage when their allied target is under attack or sabotage

### Cost and penalty

- Betrayer loses 3 reputation immediately
- The betrayed house gains 4 reputation immediately
- Both houses lose alliance status; the alliance is removed instantly
- The betrayer is marked as `Betrayer` for 2 rounds

### Vengeance mechanic

- The betrayed house gains `VENGEANCE` status for 2 rounds after betrayal.
- During vengeance, the betrayed house gains +2 attack power against the betrayer and cannot accept any diplomacy requests from them.
- Vengeance ends automatically after 2 rounds or when the betrayer is eliminated from the match.

### Can betrayal happen every round?

- Yes, but only once per house-to-house pair per round.
- Repeated betrayal history is stored in the Chronicle and accumulates reputation penalties.

### Chronicle note

- Every betrayal should emit `Betrayal` and a `ChronicleEntry` describing the pair and cause.

---

## 10. Dragons

There are exactly 3 dragons in the match.

### Dragon roster

| Dragon ID | Name | Starting owner | Power | Armor | Speed | Loyalty | Wounds | Alive | Notes |
|---|---|---|---:|---:|---:|---:|---:|---|---|
| D1 | Ashwing | Skyglass Kin | 6 | 4 | 3 | 6 | 0 | true | bonded dragon with strong attack profile |
| D2 | Cinderclaw | Dusk Hollow | 5 | 5 | 2 | 5 | 0 | true | durable but slower raid dragon |
| D3 | Nacreback | none | 4 | 3 | 4 | 4 | 0 | true | neutral dragon, can be captured |

### Dragon state fields

Each dragon has:

- `dragonId`
- `name`
- `ownerHouseId` or `NONE`
- `power`
- `armor`
- `speed`
- `loyalty`
- `wounds`
- `alive`
- `lastBattleRound`
- `captureRound`
- `history[]`

### Capture and transfer rules

- A neutral dragon can be captured by a house that uses DRAGONSTRIKE successfully against it.
- A dragon owned by a house can be challenged and wounded, but capture only occurs if the owning house is defeated in battle or the dragon is released by the owner.
- Transfer is immediate on settlement when a dragon’s owner changes.

### Death rules

- If `wounds >= 3`, the dragon is dead.
- Dead dragons are permanently removed from the game.
- Dead dragons cannot be revived or recovered.
- `deathRound` is recorded and the dragon is included in `dragonHistory`.

### Recovery rules

- There is no recovery from death.
- There is no dragon resurrection.
- Wounds are persistent across rounds until the dragon dies.

### Dragon vulnerability

- Dragons are vulnerable to attack from enemy dragon actions and sabotage.
- A dragon may be wounded by ranged sabotage, dragon combat, or a vicious round of attack.
- A dragon cannot be used for multiple actions in the same round; it can only resolve one dragon action per round.

### Dragon history

A dragon’s history records:

- born or entered game
- bonded or captured
- wounded
- killed
- transferred
- involved in throne battle or capture

This is stored in the persistent `dragonHistory[]` and included in the Chronicle.

---

## 11. Throne

The throne is the single central territory: `Crown of Ashes`.

### Throne capture requirements

A house captures the throne if it either:

- wins an ATTACK against the throne territory and the battle delta is sufficient, or
- uses a DRAGONSTRIKE on the throne territory with sufficient delta

The throne is always the center objective. It is not a passive reward and cannot be won by diplomacy alone.

### Throne pressure

- Controlling the throne grants: +2 gold and +1 influence at the end of each round
- The throne territory grants +2 defense to its owner when under attack
- The throne cannot be used by multiple houses simultaneously; it has a single owner at a time

### Consecutive control requirement

To win the match, a house must hold the throne for 3 consecutive rounds.

Formal rule:

- Let `throneControlStreak` be the number of consecutive round-end states in which a house owns the throne.
- A house wins immediately at the end of a round when `throneControlStreak >= 3`.
- If a different house captures the throne, `throneControlStreak` resets to 0.
- The throne count is evaluated at the final state after all actions are resolved in that round.

### Throne scoring

- Each round of throne control adds `+10` to the house’s final match score if used for end-of-match ranking.
- If the throne is captured in a round and then lost, the previous streak resets.

### Final win condition

Primary win condition:

- a house controls the throne for 3 consecutive rounds at the end of settlement

Secondary fallback:

- if no house reaches this condition after 10 rounds, the final ranking is computed by score defined in Section 15.

---

## 12. Reputation

Reputation is a meaningful persistent stat used in diplomacy, vengeance, and ranking.

### Reputation sources

| Event | Change |
|---|---:|
| Successful defense of a territory | +2 |
| Captured territory | +1 |
| Throne control for 1 round | +2 |
| Victory against a dragon | +3 |
| Alliance formed | +1 |
| Alliance broken by betrayal | -3 to betrayer; +2 to betrayed |
| Betrayal committed | -3 |
| Successful betrayal | +2 to betrayer if the attack succeeds |
| Failed defence of a territory | -1 |
| Dragon kill | +2 |
| Major victory | +4 |

### Reputation mechanics

- Reputation affects tie-breaking in all combat and scoring outcomes.
- Reputation does not allow direct action generation by itself; it modifies the authority of the house in diplomacy and final ranking.
- A negative reputation does not ban actions, but it increases the chance of being targeted and reduces diplomatic trust.
- Reputation is always stored onchain and is persistent across rounds.

---

## 13. Chronicle

The Chronicle is a persistent event log for meaningful world events.

### Event model

Every Chronicle entry contains:

```text
ChronicleEntry {
  matchId: bytes32,
  round: uint8,
  eventName: string,
  actorHouseId: uint8 | null,
  targetHouseId: uint8 | null,
  territoryId: uint8 | null,
  dragonId: uint8 | null,
  metadata: bytes32[] | tuple,
  timestamp: uint256
}
```

### Minimum Chronicle events

| Event name | Trigger | Fields required |
|---|---|---|
| MatchStarted | match creation | matchId, round, player list |
| AllianceFormed | two houses accept an alliance | matchId, round, actorHouseId, targetHouseId |
| AllianceExpired | alliance duration ends | matchId, round, actorHouseId, targetHouseId |
| TerritoryCaptured | territory changes owner | matchId, round, attackerHouseId, targetTerritoryId, previousOwnerHouseId |
| FortificationRaised | fortify action resolved | matchId, round, houseId, territoryId, level |
| SabotageResolved | sabotage success | matchId, round, actorHouseId, targetHouseId or territoryId |
| Betrayal | betrayal detected | matchId, round, actorHouseId, targetHouseId, reason |
| DragonWounded | dragon loses a wound | matchId, round, dragonId, houseId, wounds |
| DragonKilled | dragon death | matchId, round, dragonId, attackerHouseId |
| ThroneCaptured | throne changes owner | matchId, round, houseId, territoryId |
| ThroneStreakExtended | throne control continues | matchId, round, houseId, streak |
| MajorVictory | end-of-round scoring threshold met | matchId, round, houseId, details |
| MatchEnded | final resolution | matchId, winnerHouseId, scoreTally |

This event model must be emitted directly from Solidity in Phase 2.

---

## 14. Combat / Resolution Engine

This is the deterministic core logic of the match.

### Resolution order

The contract must resolve the round in the exact order below:

1. Validate signed intents
2. Apply defaults for missing invalid intents
3. Resolve diplomacy proposals and acceptances
4. Resolve sabotage
5. Resolve tax collection
6. Resolve fortification effects
7. Resolve ATTACK contests
8. Resolve DRAGONSTRIKE actions
9. Apply resource changes and casualty updates
10. Update territory ownership and control
11. Update throne ownership and streak count
12. Update reputation and vengeance state
13. Check win condition for throne rule
14. Emit Chronicle events
15. End round and prepare next round

### Why this order

This order ensures:

- diplomacy is settled before combat begins
- sabotage can disrupt taxes and preparation before damage is applied
- fortification is built before attack resolution to reflect pre-battle defense
- attack and dragon actions are resolved in a deterministic contest order
- reputation and throne streak are applied after final state is known
- Chronicle entries reflect the fully settled state

### Conflict handling rules

#### 1. Two houses attack the same territory

- The contract aggregates all acts of ATTACK against the same target into one battle result.
- The target territory’s defense is computed once.
- The highest resulting attack score wins.
- In ties, the house with higher reputation wins; if still tied, lower `houseId` wins.

#### 2. A attacks B while B attacks A

- This is a simultaneous duel with both attack scores computed against their respective targets.
- Each house can capture its chosen enemy territory only if the battle delta qualifies.
- If both capture simultaneously, the last owner is resolved by the same tie-breaker in the battle engine for that territory; if both are present, the target is set to the house who won the stronger contest.

#### 3. A fortifies while B attacks

- Fortification is applied before attack resolution.
- The attack is calculated against the fortified defense value.

#### 4. A dragonstrikes a territory being fortified

- Dragon action is resolved after fortification, but before ownership is updated.
- If the dragon attack delta exceeds threshold, the territory may be captured or the fortification reduced.

#### 5. A sabotages someone who attacks them

- Sabotage resolves before attack resolution.
- The target loses gold or lowers fortification first.
- If the attacking house is also sabotaged, attack proceeds with the sabotage penalty applied first.

#### 6. Allies target the same enemy

- Joint attacks are allowed in principle, but the contract resolves them as a shared target contest.
- The controlling house that wins the contest gains the territory.
- Allied houses do not receive shared ownership.

#### 7. Two houses try to capture the same territory

- The battle is a contest and only one winner can own the territory after settlement.
- If no house meets the capture threshold, the territory remains with its previous owner.

#### 8. A dragon is attacked and used in the same round

- The dragon action and attack are both resolved in the same round; the dragon may be wounded or killed in the same cycle as its own action.
- A dragon cannot resolve more than one action in a single round.

### Deterministic output guarantee

All combat and diplomacy outcomes must be reproducible from the exact same state plus the set of valid intents. There must be no randomization or frontend-only magic.

---

## 15. Win Condition

### Primary match win condition

A house wins immediately if, after settlement, it has held the throne for 3 consecutive rounds.

### If nobody reaches this condition by round 10

The match ends at the end of round 10 with a final ranking computed by the following score formula:

`FinalScore = territoryScore*5 + dragonScore*8 + reputation*2 + gold + throneControlRounds*10`

Where:

- `territoryScore = sum(resourceValue of each controlled territory)`
- `dragonScore = number of dragons controlled or killed by the house` with `+2` for each living dragon controlled and `+1` for each enemy dragon killed
- `reputation` is the current reputation score
- `gold` is current gold the house holds
- `throneControlRounds` counts number of rounds the house had the throne during the match

### Tie-breaking rule

If two houses share the same final score:

1. higher throne streak wins
2. higher reputation wins
3. higher gold wins
4. lower houseId wins

### Final ranking

The final ranking is sorted in descending order by final score and ties are broken using the tiebreak rules above.

---

## 16. Complete State Model

The authoritative state model for the match is conceptual but should be stored as Solidity structs and mappings.

```text
Match {
  matchId: bytes32,
  round: uint8,
  status: MatchStatus,
  currentRoundStart: uint256,
  currentRoundDeadline: uint256,
  roundCount: uint8,
  players: Player[6],
  houses: House[6],
  territories: Territory[6],
  dragons: Dragon[3],
  alliances: Alliance[12],
  throne: ThroneState,
  reputation: mapping(uint8 => int16),
  intents: mapping(bytes32 => Intent),
  chronicle: ChronicleEntry[],
  winnerHouseId: uint8 | null,
  finalRankings: uint8[6]
}
```

### Player

```text
Player {
  address: address,
  houseId: uint8,
  joinedAtRound: uint8,
  isActive: bool,
  lastValidIntentNonce: uint256,
  isConnected: bool
}
```

Purpose: associates a wallet to a house in a match.

Who can modify it: match owner or house registration logic.

When it changes: at join and when a player’s house is removed or replaced.

Onchain: yes.

### House

```text
House {
  houseId: uint8,
  name: string,
  sigil: string,
  territoryId: uint8,
  gold: uint16,
  influence: uint16,
  military: uint16,
  reputation: int16,
  passiveTrait: uint8,
  dragonBondId: uint8 | null,
  activeAllianceId: uint8 | null,
  vengeanceUntilRound: uint8,
  isAlive: bool
}
```

Purpose: persistent strategic identity and stats.

Who can modify it: settlement engine.

When it changes: each round and on house-specific events.

Onchain: yes.

### Territory

```text
Territory {
  territoryId: uint8,
  name: string,
  ownerHouseId: uint8 | null,
  defensiveValue: uint16,
  resourceValue: uint16,
  fortificationLevel: uint8,
  adjacentIds: uint8[3],
  capturedRound: uint8,
  sabotageUntilRound: uint8,
  taxYieldModifier: int8
}
```

Purpose: world-state control and revenue source.

Who can modify it: settlement engine.

When it changes: capture, fortify, sabotage, tax.

Onchain: yes.

### Dragon

```text
Dragon {
  dragonId: uint8,
  name: string,
  ownerHouseId: uint8 | null,
  power: uint8,
  armor: uint8,
  speed: uint8,
  loyalty: uint8,
  wounds: uint8,
  alive: bool,
  deathRound: uint8 | null,
  history: bytes32[]
}
```

Purpose: strategic mobile combat unit for dragon mastery and death-state tracking.

Who can modify it: dragon resolution engine.

When it changes: wounds, capture, transfer, death.

Onchain: yes.

### Alliance

```text
Alliance {
  allianceId: uint8,
  houseA: uint8,
  houseB: uint8,
  startRound: uint8,
  expiresAtRound: uint8,
  accepted: bool,
  broken: bool,
  cause: bytes32 | null
}
```

Purpose: diplomacy state.

Who can modify it: diplomacy resolution engine.

When it changes: creation, expiration, breaking.

Onchain: yes.

### ThroneState

```text
ThroneState {
  territoryId: uint8,
  ownerHouseId: uint8 | null,
  controlStreak: uint8,
  lastCapturedRound: uint8,
  pressure: uint8
}
```

Purpose: central objective tracking.

Who can modify it: settlement engine.

When it changes: capture, loss, streak continuation.

Onchain: yes.

### Intent

```text
Intent {
  intentHash: bytes32,
  matchId: bytes32,
  round: uint8,
  houseId: uint8,
  action: Action,
  targetType: TargetType,
  targetId: uint8,
  nonce: uint256,
  deadline: uint256,
  signer: address,
  signature: bytes,
  processed: bool
}
```

Purpose: canonical signed action for settlement.

Who can modify it: on-chain settlement only.

When it changes: on submission and after execution.

Onchain: yes.

### Reputation mapping

Purpose: persistent historical identity and tie-breaker.

Who can modify it: settlement engine.

Onchain: yes.

---

## 17. Smart Contract Events

The contract should emit a complete event list. Each event must include enough state to reconstruct the chronology in the client.

### Proposed Solidity event list

| Event | Fields |
|---|---|
| `MatchCreated` | `matchId`, `round`, `playerAddresses[]`, `houseIds[]` |
| `IntentSubmitted` | `matchId`, `round`, `houseId`, `action`, `targetType`, `targetId`, `nonce`, `deadline`, `signer` |
| `IntentRejected` | `matchId`, `round`, `houseId`, `reason`, `nonce` |
| `RoundResolved` | `matchId`, `round`, `timestamp`, `resolvedBy` |
| `TerritoryCaptured` | `matchId`, `round`, `newOwnerHouseId`, `territoryId`, `previousOwnerHouseId`, `battleDelta` |
| `FortificationRaised` | `matchId`, `round`, `houseId`, `territoryId`, `newLevel` |
| `TerritoryAttackResolved` | `matchId`, `round`, `attackerHouseId`, `territoryId`, `defenseScore`, `attackScore` |
| `DragonStrike` | `matchId`, `round`, `dragonId`, `ownerHouseId`, `targetType`, `targetId`, `attackScore` |
| `DragonWounded` | `matchId`, `round`, `dragonId`, `wounds`, `fromHouseId`, `toHouseId` |
| `DragonKilled` | `matchId`, `round`, `dragonId`, `killerHouseId` |
| `DragonCaptured` | `matchId`, `round`, `dragonId`, `newOwnerHouseId`, `oldOwnerHouseId` |
| `AllianceFormed` | `matchId`, `round`, `houseA`, `houseB`, `allianceId` |
| `AllianceExpired` | `matchId`, `round`, `houseA`, `houseB`, `allianceId` |
| `Betrayal` | `matchId`, `round`, `houseA`, `houseB`, `cause`, `reputationDeltaA`, `reputationDeltaB` |
| `VengeanceDeclared` | `matchId`, `round`, `aggrievedHouseId`, `betrayerHouseId`, `duration` |
| `TaxCollected` | `matchId`, `round`, `houseId`, `territoryId`, `goldGained`, `influenceGained` |
| `SabotageResolved` | `matchId`, `round`, `actorHouseId`, `targetHouseId`, `targetTerritoryId`, `effect` |
| `ThroneCaptured` | `matchId`, `round`, `houseId`, `territoryId`, `streak` |
| `ThroneStreakExtended` | `matchId`, `round`, `houseId`, `streak` |
| `ReputationChanged` | `matchId`, `round`, `houseId`, `oldValue`, `newValue`, `reason` |
| `MajorVictory` | `matchId`, `round`, `houseId`, `score`, `reason` |
| `MatchEnded` | `matchId`, `winnerHouseId`, `finalRankings`, `finalScore[]` |
| `ChronicleEntryAdded` | `matchId`, `round`, `eventName`, `actorHouseId`, `targetHouseId`, `territoryId`, `dragonId` |

These events must later be emitted directly by the contract. This is the contract-facing event API for Phase 2.

---

## 18. Onchain vs Offchain Boundary

| Feature | Onchain | Offchain | Reason |
|---|---|---|---|
| Match state | Yes | No | authoritative state must be verifiable on Monad |
| Territory ownership | Yes | No | must be final and source-of-truth |
| Action intent | Yes, as signed payload validated onchain | Yes, as UI preview and optimistic intent | ensures anti-cheat and canonical resolution |
| Action resolution | Yes | No | all combat and settlement are deterministic |
| Dragon state | Yes | No | permanent combat state and death must be onchain |
| Reputation | Yes | No | persistent identity and scoring must be canonical |
| Alliance state | Yes | No | diplomacy influences resolution and narration |
| Chronicle events | Yes | No | game history must be provable and permanent |
| Animations | No | Yes | visual-only, not logic-critical |
| Map rendering | No | Yes | visual rendering only |
| Timer visualization | No | Yes | the contract does not trust frontend timers |
| Sound | No | Yes | non-authoritative effect |
| Particles | No | Yes | visual-only |
| UI | No | Yes | presentation layer only |

The chain is the legal source of truth. The frontend is observational and presentational only.

---

## 19. Security / Fairness Requirements

The future contract must enforce all of the following.

| Threat | Rule the contract must enforce |
|---|---|
| Replayed intents | Reject if `nonce` already used for same match and house |
| Forged signatures | Validate `signature` against the exact payload and registered player address |
| Stale intents | Reject if `deadline` has passed or round mismatches current round |
| Duplicate submissions | Reject second valid intent with same nonce or same round+house+action beyond the first |
| Unauthorized house control | Only the registered house owner may act for that house |
| Action manipulation | Validate target and action legality before process; reject invalid target types |
| Frontend cheating | The contract ignores any frontend-only state or timers and enforces chain-validated rules only |
| Client timer manipulation | Contract uses `block.timestamp` and not UI timer values |
| Double settlement | Ensure each round can only settle once; state must be idempotent or guarded by `roundResolved` |
| Invalid target | Reject if target absent, enemy-owned but target is not valid, or illegal for action |
| Post-deadline actions | Reject if submitted after `roundDeadline` |
| Conflicting state updates | Use deterministic ordering and single settlement per round to avoid race-like logic |
| Hidden action changes after sign | Signature must cover all fields; any mutation invalidates the signature |
| House ID mismatch | Validate `houseId` matches signer, match membership, and assigned house |
| Alliance abuse | One alliance max per house, pairwise, and active only within duration rules |
| Dragon exploitation | Dragon actions must include owner-house validation and alive-state validation |

---

## 20. Balance Check

The game is tuned for a fast political war experience, not theoretical perfect optimization. The following checks ensure no single strategy is obviously dominant.

### Example scenarios

#### 1. Aggressive player

House Dusk Hollow attacks the throne early. It can secure early pressure, but if it overextends, it loses influence and risks losing the throne to retaliation. This is fun and risky.

#### 2. Defensive player

Iron Briar heavily fortifies Briarfen and blocks adjacent routes. This slows aggression but gives up tempo on tax and diplomacy. It is strong in attrition but weaker if the throne story is not pursued.

#### 3. Diplomacy-heavy player

Gloam Reed builds a fragile alliance network. This is strong when the player can avoid betrayal and manipulate timing. However, if they break alliance, reputation drop and vengeance can spiral out of control.

#### 4. Dragon-heavy player

Skyglass Kin focuses on Ashwing. This is powerful but expensive and vulnerable if the dragon is wounded or if the dragon is forced to defend multiple fronts. It creates a visible tactical spike, but the dragon is a high-risk resource.

#### 5. Betrayal-heavy player

A player intentionally forms alliances and breaks them. This can produce immediate gold and influence, but repeated betrayal reduces reputation and almost guarantees future vengeance. It is viable but not dominant if repeated too often.

### Balance decisions

- No house is objectively strongest because their passive traits are asymmetric but not universal.
- Attack is powerful but has a gold/influence cost and can trigger casualties.
- FORTIFY is safe and strong for defense, but it never directly wins the match.
- TAX is steady and low risk, but weaker than immediate military pressure.
- DRAGONSTRIKE is high-impact but high-risk and not a free win button.
- Diplomacy is crucial but vulnerable to betrayal and stateful penalties.
- The throne is decisive but requires three rounds of ownership and can be disrupted by active aggression.

The rules are intentionally tuned for high drama and repeated tactical mistakes rather than perfect, analytical math-dominance.

---

## 21. Final Game Spec

### A. One-page rules summary

- Six houses vie for control of six territories and a single throne.
- Each round, each house submits one signed action intent within 10 seconds.
- The contract validates, settles, and resolves the round deterministically.
- Houses can attack, fortify, tax, sabotage, dragonstrike, or diplomatically form alliances.
- Betrayal is possible and punishes reputation, resources, and future diplomacy.
- Dragons are living combat entities that can wound, capture, and kill.
- The throne is the central objective; holding it for 3 consecutive rounds wins the match.
- If no house achieves the throne rule by round 10, a final ranking is computed by score.

### B. Complete numerical rules

See house stats, territory stats, and action formulas described above. All formulas are to be implemented with integer arithmetic only.

### C. State model

See Section 16.

### D. Action resolution table

| Action | Legal target | Cost | Success threshold | Effect |
|---|---|---|---|---|
| ATTACK | enemy territory | 2 gold, 1 influence | battle delta >= 4 | capture or disrupt enemy territory |
| FORTIFY | owned territory | 1 gold | always if legal | +1 fortification, max 3 |
| DRAGONSTRIKE | enemy dragon/territory/throne | 2 gold, 1 influence | delta per target formula | wound, capture, or kill |
| DIPLOMACY | other house | 1 influence | reciprocal acceptance in same round | alliance established |
| SABOTAGE | enemy house/territory/dragon | 1 gold, 1 influence | saboteur threshold formula | resource theft, fortification loss, or dragon wound |
| TAX | owned territory | none | always if legal | gain gold and influence |

### E. Territory adjacency table

| Territory | Adjacent |
|---|---|
| Throne | Ashenmere, Briarfen, Glasswater, Thornwatch, Emberkeep |
| Ashenmere | Throne, Briarfen, Emberkeep |
| Briarfen | Throne, Ashenmere, Glasswater |
| Glasswater | Throne, Briarfen, Thornwatch |
| Thornwatch | Throne, Glasswater, Emberkeep |
| Emberkeep | Throne, Thornwatch, Ashenmere |

### F. House balance table

| House | Style | Boons | Risks |
|---|---|---|---|
| Ashen Vale | Military | high pressure and open aggression | high cost and easy retaliation |
| Iron Briar | Defense | durable and fortify-heavy | slower tempo and less economy |
| Gloam Reed | Deception | sabotage and diplomacy manipulation | highly reputation-sensitive |
| Ember Crown | Economy | best tax engine | weak direct pressure |
| Skyglass Kin | Dragon mastery | high dragon impact | dragon vulnerability and resource cost |
| Dusk Hollow | Aggression | early claim and high-risk pressure | fragile if attacked early |

### G. Dragon stats table

| Dragon | Owner | Power | Armor | Speed | Loyalty | Wounds | State |
|---|---|---:|---:|---:|---:|---:|---|
| Ashwing | Skyglass Kin | 6 | 4 | 3 | 6 | 0 | alive |
| Cinderclaw | Dusk Hollow | 5 | 5 | 2 | 5 | 0 | alive |
| Nacreback | none | 4 | 3 | 4 | 4 | 0 | alive |

### H. Alliance / betrayal rules

- Max alliance duration: 2 rounds
- Max one alliance per house at any time
- Allies cannot attack each other
- Betrayal triggers immediate reputation loss and vengeance
- Betrayals are logged and persistent in history

### I. Throne rules

- single throne territory
- must be captured by combat or dragon attack
- a house wins if it controls it for 3 consecutive rounds
- throne control yields gold and influence each round
- a change of throne owner resets streak

### J. Reputation rules

- persistent integer value
- changes on betrayal, victory, defense, throne control, dragon kill, and alliance breaches
- reward and penalty values are specified in Section 12
- used for score tie-breaking and vengeance conditions

### K. Chronicle event schema

Implementation contract must emit the event list defined in Section 13 and Section 17.

### L. Onchain/offchain boundary

See Section 18.

### M. Security requirements

See Section 19.

### N. Exact Phase 2 implementation checklist

The Phase 2 contract must implement:

1. Match creation with 6 houses and 6 territories
2. Player registration and house assignment
3. Round lifecycle with 10-second intent deadline based on block timestamp
4. Intent validation, signature checks, and nonce tracking
5. Default action rule for missing or invalid intents
6. Territory adjacency and control map
7. Action settlement engine for all six actions
8. Diplomacy proposal and acceptance logic
9. Alliance tracking and expiration
10. Betrayal detection and vengeance logic
11. Dragon state model, wounds, transfer, and death
12. Throne control, streak logic, scoring, and win detection
13. Reputation update engine
14. Chronicle log and all event emissions
15. Deterministic final scoring for round 10
16. Match end condition and ranking output
17. Reentrancy-safe, permission-checked settlement logic
18. Authoritative chain-of-truth storage and event auditability

---

## Consistency Review and Design Decisions

This specification resolves the likely edge cases that would otherwise make the game impossible to implement cleanly in Solidity:

- No frontend timer is authoritative; block timestamp is authoritative.
- No action is partially applied; it is valid or invalid.
- No state is randomized; all outputs are deterministic.
- Diplomacy is pairwise and limited to avoid unbounded alliance complexity.
- Betrayal is strongly penalized to keep the mechanic meaningful without making it a mandatory strategy.
- Dragons are permanent stateful entities, not ephemeral attack buttons.
- Throne control requires consecutive rounds to keep the win condition meaningful but not too easy.
- The Chronicle is event-driven and includes all critical transitions.

This leaves no undefined core gameplay mechanism. Phase 2 can implement the contract without inventing primary rules on the fly.
