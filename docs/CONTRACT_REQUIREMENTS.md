# Phase 2 Solidity Contract Requirements

This document contains only the requirements Phase 2 must satisfy for the Oaths & Ashes Monad smart contract.

## 1. Core Match Rules

- The contract must support a 6-player match.
- The match must contain exactly 6 houses and 6 territories.
- The match must contain exactly 1 central throne territory and 3 dragons.
- The match must run for exactly 10 rounds.
- Resolution must be deterministic and not dependent on frontend-only timers.
- The contract must use block timestamp as the authoritative time source for round deadlines.

## 2. House and Territory State

- The contract must store all six original houses with unique IDs and distinct stats.
- The contract must store all six territories and the adjacency graph.
- The throne territory must be explicitly identified as central and unique.
- Each territory must track owner, defensive value, resource value, fortification level, and adjacency list.
- Territory ownership changes must be deterministic and derived from settlement results.

## 3. Resource Rules

- The contract must store gold, influence, reputation, and military values for each house.
- The resource model must be integer-based and deterministic.
- No token, staking, NFT, or pay-to-win economics may be introduced.
- Resource costs must be enforced before execution.
- Currency values cannot go below zero unless the rules explicitly allow it for reputation.

## 4. Action Model

The contract must support exactly these six actions:

1. ATTACK
2. FORTIFY
3. DRAGONSTRIKE
4. DIPLOMACY
5. SABOTAGE
6. TAX

The contract must:

- validate legal targets
- prevent invalid or ambiguous targets
- reject non-owned or illegal territory actions
- enforce resource costs
- apply fallback default action for missing or invalid intents
- maintain deterministic resolution order

## 5. Round System

- The contract must define round start and settlement phases.
- Each round must have a 10-second decision window.
- `roundDeadline = roundStartTimestamp + 10 seconds` must be enforced by the contract.
- The contract must reject intents submitted after the deadline.
- The contract must reject stale round intents.
- The contract must ensure only one valid settlement occurs per round.
- The contract must apply deterministic fallback behavior for missing/invalid actions.

## 6. Signed Intent Requirements

The contract must validate a signed intent containing, at minimum:

- `matchId`
- `round`
- `houseId`
- `action`
- `targetType`
- `targetId`
- `nonce`
- `deadline`
- `signature`
- `player` or signer address

The contract must verify:

- signer authorization for the house
- match membership
- round validity
- deadline validity
- nonce uniqueness
- exact payload matching
- legal target and action pair
- resource ability to pay the cost

The contract must reject:

- replayed stale intents
- duplicate nonce reuse
- old round payloads
- modified payloads after signing
- actions from unauthorized houses

## 7. Diplomacy and Alliances

- The contract must support reciprocal diplomacy-based alliance formation.
- A house may have at most one active alliance at a time.
- Alliance duration must be exactly 2 rounds from creation.
- Allies must gain non-aggression while the alliance is active.
- Allies may gain gold and influence each round while active.
- The contract must detect alliance breaking and betrayal.
- The contract must expire alliances automatically.

## 8. Betrayal and Vengeance

- The contract must detect betrayal against an active ally.
- Betrayal must trigger immediate reputation loss and alliance termination.
- The betrayed house must gain vengeance state for 2 rounds.
- Vengeance must provide combat advantage against the betrayer.
- The contract must record betrayal in the Chronicle.

## 9. Dragon Requirements

- The contract must support exactly 3 dragons.
- Each dragon must have persistent state: owner, power, armor, speed, loyalty, wounds, alive/dead, and history.
- Dragons are not simple attack triggers; they are stateful combat entities.
- The contract must allow dragon wounds and death.
- Dragon death is permanent; dead dragons cannot recover.
- Dragons can be captured, transferred, and killed based on deterministic combat logic.
- Dragon actions must be validated against alive status and ownership.

## 10. Throne Rules

- The contract must track a single central throne territory.
- A house must hold the throne for 3 consecutive rounds to win.
- The throne grants continuous gold and influence while controlled.
- Throne owner changes must reset streak if the throne changes hands.
- The contract must detect and resolve throne capture.
- The final match winner must be determined by throne rule first, then by score if no throne win occurs.

## 11. Reputation Rules

- Reputation must be persistent across rounds.
- Reputation must be recorded onchain as part of the authoritative state.
- Reputation changes must be emitted in events.
- Reputation must affect tie-breakers and vengeance conditions.
- Reputation must be modified by combat, betrayal, defense, throne control, and historical successes.

## 12. Chronicle Event Model

The contract must emit the required Chronicle entries for:

- match start
- alliance formation
- alliance expiration
- territory capture
- fortification change
- sabotage
- betrayal
- dragon wound
- dragon death
- throne capture
- throne streak extension
- major victory
- match end

Each event must include relevant identifiers, round, and related house/territory/dragon state.

## 13. Combat Resolution Engine

The contract must resolve all rounds in the following deterministic order:

1. Validate intents
2. Apply defaults for missing invalid intents
3. Resolve diplomacy
4. Resolve sabotage
5. Resolve tax
6. Resolve fortification
7. Resolve attack contests
8. Resolve dragon strikes
9. Apply resource and casualty changes
10. Update territory ownership
11. Update throne state
12. Update reputation and vengeance
13. Check win condition
14. Emit Chronicle events
15. Finalize round

The contract must define explicit integer formulas for combat and action resolution.

## 14. Final Ranking Rules

- The match ends at round 10 or earlier if a house wins by throne rule.
- If no throne win occurs by round 10, the contract must compute final score and ranking.
- Final score must follow the Formula:

`FinalScore = territoryScore*5 + dragonScore*8 + reputation*2 + gold + throneControlRounds*10`

- Ties must be resolved by the specified tiebreak order:
  1. throne streak
  2. reputation
  3. gold
  4. lower houseId

## 15. Contract Event API

The contract must emit these events at minimum:

- `MatchCreated`
- `IntentSubmitted`
- `IntentRejected`
- `RoundResolved`
- `TerritoryCaptured`
- `FortificationRaised`
- `TerritoryAttackResolved`
- `DragonStrike`
- `DragonWounded`
- `DragonKilled`
- `DragonCaptured`
- `AllianceFormed`
- `AllianceExpired`
- `Betrayal`
- `VengeanceDeclared`
- `TaxCollected`
- `SabotageResolved`
- `ThroneCaptured`
- `ThroneStreakExtended`
- `ReputationChanged`
- `MajorVictory`
- `MatchEnded`
- `ChronicleEntryAdded`

## 16. Security Requirements

The contract must reject all of the following:

- replayed intents
- forged signatures
- stale or late intents
- duplicate submissions
- unauthorized house actions
- target manipulation
- hidden state mutation after signing
- double settlement
- invalid actions or invalid targets
- post-deadline settlement
- alliance abuse
- dragon state exploitation

## 17. Authoritative State Requirements

The contract must be the source of truth for:

- match state
- territory ownership
- resource balances
- dragon status and death
- alliance state
- reputation
- throne state
- Chronicle entries
- final rankings

The frontend may render optimistic UI, but the onchain contract is authoritative.

## 18. Non-Goals for Phase 2

The contract implementation must not include:

- frontend code
- Phaser assets or rendering logic
- wallet UI or auth flows
- deployments or infra scripts
- fake blockchain behavior
- token economics
- staking or pay-to-win features
- non-deterministic random-effects logic

## 19. Acceptance Criteria

Phase 2 is complete when:

- all six houses, six territories, three dragons, and six actions exist in contract state
- all round and signed-intent rules are enforced by Solidity logic
- all diplomacy, betrayal, and vengeance gates are enforced
- dragon wounds and death are permanent and recorded
- throne rule and score rules are implemented deterministically
- Chronicle events are emitted for all major transitions
- match winner and ranking are deterministic and reproducible
- the code is implementable without inventing major new mechanics
