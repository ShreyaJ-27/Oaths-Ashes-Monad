# OATHS & ASHES — PHASE 2 AUDIT REPORT

**Date:** 2026-08-14  
**Status:** INITIAL AUDIT — GAPS IDENTIFIED  
**Auditor:** Phase 2 Implementation Agent

---

## EXECUTIVE SUMMARY

Phase 2 implementation has established a foundational contract structure with basic match creation, player joining, and simple action resolution (FORTIFY, ATTACK, TAX, DRAGONSTRIKE).

**However, the current implementation is INCOMPLETE and DOES NOT satisfy all Phase 1 requirements.**

**Major functionality gaps identified:**

1. **DIPLOMACY action** — Not implemented (critical)
2. **SABOTAGE action** — Not implemented (critical)
3. **Alliance system** — Not implemented (critical)
4. **Betrayal mechanics** — Not implemented (critical)
5. **Vengeance system** — Tracked but not applied (critical)
6. **Passive traits** — Not applied to formulas (affects balance)
7. **Multiple attacker aggregation** — Not implemented (critical)
8. **Dragon capture/transfer** — Not implemented (critical)
9. **EIP-712 compliance** — Missing domain prefix (security)
10. **Chronicle events** — Incomplete (diagnostic)

**Test coverage:** Minimal smoke tests only; behavioral coverage absent.

---

## PART 1: AUDIT CHECKLIST

### 1. GAME SCOPE AND STRUCTURE

| Requirement | Status | Evidence | Gap | Fix Required |
|---|---|---|---|---|
| 6 houses defined | ✅ PASS | `houseConfigs[6]` with all 6 houses | None | No |
| 6 territories defined | ✅ PASS | `territoryConfigs[6]` with Throne | None | No |
| 3 dragons defined | ✅ PASS | `dragonConfigs[3]` including neutral | None | No |
| 1 throne territory | ✅ PASS | Territory ID 6 marked `isThrone=true` | None | No |
| 6 actions defined | ⚠️ PARTIAL | Only 4 of 6 implemented (missing DIPLOMACY, SABOTAGE) | Major | **YES** |
| 10-round loop | ✅ PASS | `MAX_ROUNDS=10`, round increments properly | None | No |
| 6 players per match | ✅ PASS | Match struct supports 6 slots | None | No |
| 10-second decision window | ✅ PASS | `ROUND_SECONDS=10` enforced | None | No |
| Signed intents | ⚠️ PARTIAL | Implemented but EIP-712 domain prefix missing | Medium | **YES** |
| Deterministic settlement | ✅ PASS | No randomness in resolution | None | No |

### 2. HOUSE AND TERRITORY STATE

| Requirement | Status | Evidence | Gap | Fix Required |
|---|---|---|---|---|
| Six distinct houses with IDs 1..6 | ✅ PASS | `HouseConfig` array properly indexed | None | No |
| Starting gold values correct | ✅ PASS | Values match spec (5,4,5,7,4,5) | None | No |
| Starting influence correct | ✅ PASS | Values match spec (3,4,4,3,4,2) | None | No |
| Starting military correct | ✅ PASS | Values match spec (6,7,5,5,5,6) | None | No |
| Starting reputation correct | ✅ PASS | Values match spec (5,6,4,5,5,4) | None | No |
| Dragon bonding correct | ✅ PASS | D1→House5, D2→House6, D3→None | None | No |
| Territories track owner | ✅ PASS | `TerritoryState.ownerHouseId` | None | No |
| Territories track fortification | ✅ PASS | `TerritoryState.fortificationLevel` (0..3) | None | No |
| Adjacency graph defined | ✅ PASS | `TerritoryConfig.adjacent[]` arrays | None | No |
| Adjacency logic correct | ✅ PASS | 5-node cycle + center hub | None | No |
| Throne uniquely identified | ✅ PASS | `TerritoryState.isThrone=true` for ID 6 | None | No |

### 3. RESOURCES

| Requirement | Status | Evidence | Gap | Fix Required |
|---|---|---|---|---|
| Gold stored and tracked | ✅ PASS | `HouseState.gold` as uint8 | None | No |
| Influence stored and tracked | ✅ PASS | `HouseState.influence` as uint8 | None | No |
| Reputation stored and tracked | ✅ PASS | `HouseState.reputation` as int16 | None | No |
| Military stored and tracked | ✅ PASS | `HouseState.military` as uint8 | None | No |
| Gold cannot go negative | ✅ PASS | Cost validation before execution | None | No |
| Influence cannot go negative | ✅ PASS | Cost validation before execution | None | No |
| Reputation can go negative | ✅ PASS | int16 allows negative | None | No |
| Dragon wounds tracked | ✅ PASS | `DragonState.wounds` as uint8 | None | No |

### 4. ACTIONS — SPECIFICATION COVERAGE

| Action | Implemented | Status | Evidence | Gap | Fix Required |
|---|---|---|---|---|---|
| ATTACK | Yes | ⚠️ PARTIAL | Basic attack works; missing: multiple attacker aggregation, passive bonuses | Major | **YES** |
| FORTIFY | Yes | ✅ PASS | Working correctly | None | No |
| DRAGONSTRIKE | Yes | ⚠️ PARTIAL | Basic strike works; missing: dragon-on-dragon combat, capture, transfer | Major | **YES** |
| DIPLOMACY | No | ❌ FAIL | Not implemented at all | Critical | **YES** |
| SABOTAGE | No | ❌ FAIL | Not implemented at all | Critical | **YES** |
| TAX | Yes | ⚠️ PARTIAL | Basic tax works; missing: passive bonuses, sabotage reduction | Minor | **YES** |

### 5. ATTACK ACTION AUDIT

| Requirement | Status | Evidence | Gap | Fix Required |
|---|---|---|---|---|
| Legal targets: enemy territory | ✅ PASS | `require(target.ownerHouseId != houseId)` | None | No |
| Cost: 2 gold, 1 influence | ✅ PASS | Deducted correctly | None | No |
| Adjacent support bonus +2 | ⚠️ PARTIAL | `_controlsAdjacentTerritory()` works | None | No |
| Passive trait: Ashen Vale +1 attack power | ❌ FAIL | Not applied to formula | Major | **YES** |
| Formula: `attackScore = military + adjacentBonus + passiveBonus` | ⚠️ PARTIAL | Missing passive bonus | Minor | **YES** |
| Formula: `defense = defensiveValue + fortification*2 + ownerMilitary/2` | ❌ FAIL | Missing ownerMilitary/2 contribution | Major | **YES** |
| Multiple attackers aggregated | ❌ FAIL | Not implemented; each resolves independently | Major | **YES** |
| Tie-break: reputation first | ❌ FAIL | Not implemented | Major | **YES** |
| Tie-break: houseId second | ❌ FAIL | Not implemented | Major | **YES** |
| Capture if `delta >= 4` | ✅ PASS | Condition correct | None | No |
| Reduce fortification if `1 <= delta < 4` | ✅ PASS | Logic correct | None | No |
| Reduce attacker military if `delta <= 0` | ✅ PASS | Logic correct | None | No |
| Reputation +1 on capture | ✅ PASS | Applied correctly | None | No |
| Event: `TerritoryAttackResolved` | ✅ PASS | Emitted | None | No |
| Event: `TerritoryCaptured` | ✅ PASS | Emitted on success | None | No |

### 6. FORTIFY ACTION AUDIT

| Requirement | Status | Evidence | Gap | Fix Required |
|---|---|---|---|---|
| Legal targets: own territory | ✅ PASS | Validated | None | No |
| Cost: 1 gold | ✅ PASS | Deducted correctly | None | No |
| Effect: increment fortification | ✅ PASS | Level incremented | None | No |
| Max fortification: 3 | ✅ PASS | Capped correctly | None | No |
| Event: `FortificationRaised` | ✅ PASS | Emitted | None | No |

### 7. TAX ACTION AUDIT

| Requirement | Status | Evidence | Gap | Fix Required |
|---|---|---|---|---|
| Legal targets: own territory | ✅ PASS | Validated | None | No |
| Cost: 0 gold, 0 influence | ✅ PASS | No deduction | None | No |
| Base gold: `territory.resourceValue` | ✅ PASS | Applied | None | No |
| Throne bonus: +2 gold | ✅ PASS | Applied | None | No |
| Passive trait: Ember Crown +1 gold | ❌ FAIL | Not applied | Minor | **YES** |
| Influence: +1 if resourceValue >= 3 | ❌ FAIL | Always 0 in event | Minor | **YES** |
| Sabotage penalty: -1 gold, -1 influence | ❌ FAIL | Sabotage not implemented | Major | **YES** |
| Event: `TaxCollected` | ✅ PASS | Emitted | None | No |

### 8. DRAGONSTRIKE ACTION AUDIT

| Requirement | Status | Evidence | Gap | Fix Required |
|---|---|---|---|---|
| Legal targets: territory or dragon | ⚠️ PARTIAL | Territory works; dragon not validated | Major | **YES** |
| Cost: 2 gold, 1 influence | ✅ PASS | Deducted (except Skyglass Kin -1 gold) | None | No |
| Skyglass Kin passive: -1 gold | ❌ FAIL | Not applied | Minor | **YES** |
| Formula: `dragonScore = power + speed + loyalty - wounds*2` | ✅ PASS | Correct | None | No |
| Dragon targeting territory | ✅ PASS | Basic logic works | None | No |
| Dragon-on-dragon combat | ❌ FAIL | Not implemented | Major | **YES** |
| Dragon capture (neutral) | ❌ FAIL | Not implemented | Major | **YES** |
| Dragon capture (transfer) | ❌ FAIL | Not implemented | Major | **YES** |
| Dragon wounds increment | ❌ FAIL | Not implemented | Major | **YES** |
| Dragon death (wounds >= 3) | ❌ FAIL | Not implemented | Major | **YES** |
| Event: `DragonStrike` | ✅ PASS | Emitted | None | No |
| Event: `DragonWounded` | ❌ FAIL | Not emitted | Major | **YES** |
| Event: `DragonKilled` | ❌ FAIL | Not emitted | Major | **YES** |
| Event: `DragonCaptured` | ❌ FAIL | Not emitted | Major | **YES** |

### 9. DIPLOMACY ACTION AUDIT

| Requirement | Status | Evidence | Gap | Fix Required |
|---|---|---|---|---|
| Action exists | ❌ FAIL | Not implemented | Critical | **YES** |
| Reciprocal proposal-accept model | ❌ FAIL | Not implemented | Critical | **YES** |
| 2-round duration | ❌ FAIL | Not implemented | Critical | **YES** |
| Max 1 active alliance per house | ❌ FAIL | Not implemented | Critical | **YES** |
| Non-aggression while allied | ❌ FAIL | Not implemented | Critical | **YES** |
| +1 gold per house per round | ❌ FAIL | Not implemented | Critical | **YES** |
| +1 influence per house per round | ❌ FAIL | Not implemented | Critical | **YES** |
| Cost: 1 influence | ❌ FAIL | Not implemented | Critical | **YES** |
| Event: `AllianceFormed` | ❌ FAIL | Not emitted | Critical | **YES** |
| Event: `AllianceExpired` | ❌ FAIL | Not emitted | Critical | **YES** |

### 10. SABOTAGE ACTION AUDIT

| Requirement | Status | Evidence | Gap | Fix Required |
|---|---|---|---|---|
| Action exists | ❌ FAIL | Not implemented | Critical | **YES** |
| Target: house or territory | ❌ FAIL | Not implemented | Critical | **YES** |
| Cost: 1 gold, 1 influence | ❌ FAIL | Not implemented | Critical | **YES** |
| Formula: `sabotagePower = influence + passiveBonus - defense` | ❌ FAIL | Not implemented | Critical | **YES** |
| Target house effect (power >= 3) | ❌ FAIL | Not implemented | Critical | **YES** |
| Target territory effect (power >= 4) | ❌ FAIL | Not implemented | Critical | **YES** |
| Target dragon effect (power >= 5) | ❌ FAIL | Not implemented | Critical | **YES** |
| Ally sabotage = betrayal | ❌ FAIL | Not implemented | Critical | **YES** |
| Event: `SabotageResolved` | ❌ FAIL | Not emitted | Critical | **YES** |

### 11. ROUND SYSTEM AUDIT

| Requirement | Status | Evidence | Gap | Fix Required |
|---|---|---|---|---|
| Exactly 10 rounds | ✅ PASS | `MAX_ROUNDS=10` | None | No |
| 10-second decision window | ✅ PASS | `ROUND_SECONDS=10` enforced | None | No |
| `roundDeadline = roundStart + 10` | ✅ PASS | Deadline set correctly | None | No |
| Reject intents after deadline | ✅ PASS | `require(block.timestamp <= intent.deadline)` | None | No |
| Reject stale round intents | ✅ PASS | `require(intent.round == matchState.round)` | None | No |
| Prevent double settlement | ✅ PASS | `require(!roundSettled[matchId])` | None | No |
| Fallback to FORTIFY on missing | ✅ PASS | `_applyDefaultAction()` implemented | None | No |
| Round advances by 1 | ✅ PASS | `matchState.round++` | None | No |
| Match ends at round 10 | ✅ PASS | `matchState.round >= MAX_ROUNDS` | None | No |

### 12. SIGNED INTENT SECURITY AUDIT

| Requirement | Status | Evidence | Gap | Fix Required |
|---|---|---|---|---|
| `matchId` field | ✅ PASS | In struct, validated | None | No |
| `round` field | ✅ PASS | In struct, validated | None | No |
| `houseId` field | ✅ PASS | In struct, validated | None | No |
| `action` field | ✅ PASS | In struct | None | No |
| `targetType` field | ✅ PASS | In struct | None | No |
| `targetId` field | ✅ PASS | In struct | None | No |
| `nonce` field | ✅ PASS | In struct, validated | None | No |
| `deadline` field | ✅ PASS | In struct, validated | None | No |
| `signer` field | ✅ PASS | In struct, recovered | None | No |
| EIP-712 domain separator | ⚠️ PARTIAL | Computed but not used in digest | Medium | **YES** |
| Domain: name = "OathsAndAshes" | ✅ PASS | In separator | None | No |
| Domain: version = "1" | ✅ PASS | In separator | None | No |
| Domain: chainId | ✅ PASS | In separator | None | No |
| Domain: verifyingContract | ✅ PASS | In separator (this) | None | No |
| Intent type hash | ✅ PASS | Defined correctly | None | No |
| Digest construction | ❌ FAIL | Missing EIP-712 prefix `\x19\x01` | Medium | **YES** |
| Signer recovery | ✅ PASS | `ecrecover()` works | None | No |
| Nonce uniqueness | ✅ PASS | `usedNonce` mapping prevents reuse | None | No |
| Signer authorization | ✅ PASS | Validated against `houseToPlayer` | None | No |
| Replay protection | ✅ PASS | Round + nonce prevents replay | None | No |
| Stale intent rejection | ✅ PASS | Round validation | None | No |

### 13. ALLIANCES / BETRAYAL / VENGEANCE AUDIT

| Requirement | Status | Evidence | Gap | Fix Required |
|---|---|---|---|---|
| Alliance formation | ❌ FAIL | No DIPLOMACY action | Critical | **YES** |
| Alliance state tracking | ❌ FAIL | Struct exists but not used | Critical | **YES** |
| Alliance expiration | ❌ FAIL | No implementation | Critical | **YES** |
| Betrayal detection | ❌ FAIL | No implementation | Critical | **YES** |
| Betrayal reputation loss | ❌ FAIL | Not applied | Critical | **YES** |
| Vengeance flag | ⚠️ PARTIAL | `vengeanceUntil` in struct but never set | Major | **YES** |
| Vengeance combat bonus | ❌ FAIL | Not applied | Major | **YES** |
| Vengeance duration | ❌ FAIL | No implementation | Major | **YES** |
| Alliance income | ❌ FAIL | +1 gold/influence not applied | Critical | **YES** |
| Non-aggression during alliance | ❌ FAIL | Not enforced | Critical | **YES** |
| Event: `AllianceFormed` | ❌ FAIL | Not emitted | Critical | **YES** |
| Event: `AllianceExpired` | ❌ FAIL | Not emitted | Critical | **YES** |
| Event: `Betrayal` | ❌ FAIL | Not emitted | Critical | **YES** |
| Event: `VengeanceDeclared` | ❌ FAIL | Not emitted | Critical | **YES** |

### 14. DRAGON COMBAT & STATE AUDIT

| Requirement | Status | Evidence | Gap | Fix Required |
|---|---|---|---|---|
| 3 dragons defined | ✅ PASS | dragonConfigs[3] | None | No |
| Dragon ownership tracked | ✅ PASS | `DragonState.ownerHouseId` | None | No |
| Dragon wounds tracked | ✅ PASS | `DragonState.wounds` | None | No |
| Dragon alive status | ✅ PASS | `DragonState.alive` | None | No |
| Dragon death round recorded | ✅ PASS | `DragonState.deathRound` | None | No |
| Dragon-to-dragon combat | ❌ FAIL | Not implemented | Critical | **YES** |
| Dragon capture (neutral) | ❌ FAIL | Not implemented | Critical | **YES** |
| Dragon transfer on ownership change | ❌ FAIL | Not implemented | Critical | **YES** |
| Dragon wound infliction | ❌ FAIL | Not implemented | Critical | **YES** |
| Dragon death (wounds >= 3) | ❌ FAIL | Not implemented | Critical | **YES** |
| Dead dragon cannot be used | ❌ FAIL | No check in settlement | Critical | **YES** |
| Dead dragon cannot recover | ❌ FAIL | No recovery attempted but no test | Minor | No |
| Event: `DragonWounded` | ❌ FAIL | Not emitted | Critical | **YES** |
| Event: `DragonKilled` | ❌ FAIL | Not emitted | Critical | **YES** |
| Event: `DragonCaptured` | ❌ FAIL | Not emitted | Critical | **YES** |

### 15. THRONE AUDIT

| Requirement | Status | Evidence | Gap | Fix Required |
|---|---|---|---|---|
| Throne is central territory ID 6 | ✅ PASS | Configuration correct | None | No |
| Throne is unique | ✅ PASS | Only one `isThrone=true` | None | No |
| Throne capture on attack delta >= 4 | ✅ PASS | Logic in `_resolveAttack` | None | No |
| Throne ownership tracking | ✅ PASS | `territoryStates[matchId][6].ownerHouseId` | None | No |
| Throne streak increments | ✅ PASS | `_setThroneOwner()` increments | None | No |
| Throne streak resets on ownership change | ✅ PASS | Logic correct | None | No |
| Throne victory: 3 consecutive rounds | ✅ PASS | `throneStreak >= 3` triggers early end | None | No |
| Throne provides +2 gold per round | ✅ PASS | `_applyThroneIncome()` adds 2 gold | None | No |
| Throne provides +1 influence per round | ✅ PASS | `_applyThroneIncome()` adds 1 influence | None | No |
| Early match end on throne victory | ✅ PASS | `_hasThroneWin()` checked | None | No |
| Event: `ThroneCaptured` | ✅ PASS | Emitted | None | No |

### 16. REPUTATION AUDIT

| Requirement | Status | Evidence | Gap | Fix Required |
|---|---|---|---|---|
| Reputation +1 on attack capture | ✅ PASS | Applied in attack resolution | None | No |
| Reputation loss on betrayal | ❌ FAIL | Betrayal not implemented | Critical | **YES** |
| Reputation gain on surviving betrayal | ❌ FAIL | Betrayal not implemented | Critical | **YES** |
| Reputation affects tie-break | ❌ FAIL | Tie-break not implemented | Critical | **YES** |
| Reputation displayed in final score | ❌ FAIL | Included in scoring but not properly weighted | Minor | No |
| Event: `ReputationChanged` | ❌ FAIL | Not emitted | Minor | **YES** |

### 17. FINAL RANKING AUDIT

| Requirement | Status | Evidence | Gap | Fix Required |
|---|---|---|---|---|
| Scoring formula correct | ⚠️ PARTIAL | `territoryScore*5 + dragonScore*8 + rep*2 + gold + throneRounds*10` matches spec | None | No |
| Territory score calculation | ✅ PASS | Resource values summed | None | No |
| Dragon score (2 per alive) | ✅ PASS | Only alive dragons count | None | No |
| Reputation in score | ✅ PASS | Weighted by 2 | None | No |
| Gold in score | ✅ PASS | Direct sum | None | No |
| Throne control rounds | ⚠️ PARTIAL | Uses `throneStreak` but should use total rounds held | Major | **YES** |
| Tie-break: throne streak | ❌ FAIL | Not implemented | Major | **YES** |
| Tie-break: reputation | ❌ FAIL | Not implemented | Major | **YES** |
| Tie-break: gold | ❌ FAIL | Not implemented | Major | **YES** |
| Tie-break: lower houseId | ❌ FAIL | Not implemented | Major | **YES** |
| Deterministic ranking | ⚠️ PARTIAL | Same input should yield same output; not tested | Medium | **YES** |

### 18. CHRONICLE EVENTS AUDIT

| Requirement | Status | Evidence | Gap | Fix Required |
|---|---|---|---|---|
| `MatchCreated` | ✅ PASS | Emitted | None | No |
| `IntentSubmitted` | ✅ PASS | Emitted | None | No |
| `IntentRejected` | ✅ PASS | Emitted | None | No |
| `RoundResolved` | ✅ PASS | Emitted | None | No |
| `TerritoryCaptured` | ✅ PASS | Emitted | None | No |
| `FortificationRaised` | ✅ PASS | Emitted | None | No |
| `TerritoryAttackResolved` | ✅ PASS | Emitted | None | No |
| `DragonStrike` | ✅ PASS | Emitted | None | No |
| `DragonWounded` | ❌ FAIL | Not emitted | Major | **YES** |
| `DragonKilled` | ❌ FAIL | Not emitted | Major | **YES** |
| `DragonCaptured` | ❌ FAIL | Not emitted | Major | **YES** |
| `AllianceFormed` | ❌ FAIL | Not emitted | Critical | **YES** |
| `AllianceExpired` | ❌ FAIL | Not emitted | Critical | **YES** |
| `Betrayal` | ❌ FAIL | Not emitted | Critical | **YES** |
| `VengeanceDeclared` | ❌ FAIL | Not emitted | Critical | **YES** |
| `TaxCollected` | ✅ PASS | Emitted | None | No |
| `SabotageResolved` | ❌ FAIL | Not emitted | Critical | **YES** |
| `ThroneCaptured` | ✅ PASS | Emitted | None | No |
| `ReputationChanged` | ❌ FAIL | Not emitted | Minor | **YES** |
| `MajorVictory` | ❌ FAIL | Not emitted | Minor | **YES** |
| `MatchEnded` | ✅ PASS | Emitted | None | No |

### 19. SECURITY & INVARIANTS AUDIT

| Requirement | Status | Evidence | Gap | Fix Required |
|---|---|---|---|---|
| Unauthorized mutation prevented | ✅ PASS | Access control via `houseToPlayer` | None | No |
| Forged signatures rejected | ✅ PASS | `ecrecover()` validation | None | No |
| Replay attacks prevented | ✅ PASS | Nonce + round check | None | No |
| Duplicate intent rejected | ✅ PASS | `usedNonce` prevents reuse | None | No |
| Stale intents rejected | ✅ PASS | Round and deadline checks | None | No |
| Double settlement prevented | ✅ PASS | `roundSettled` flag | None | No |
| Invalid targets rejected | ⚠️ PARTIAL | Basic validation works; missing some cases | Minor | **YES** |
| Invalid actions rejected | ⚠️ PARTIAL | Enum prevents invalid action type | None | No |
| Invalid house rejected | ✅ PASS | Range check | None | No |
| Cross-match contamination prevented | ✅ PASS | matchId in every lookup | None | No |
| Cross-round contamination prevented | ✅ PASS | Round validation | None | No |
| Dead dragon exploitation | ⚠️ PARTIAL | Not checked properly | Major | **YES** |
| Alliance exploitation | ❌ FAIL | No alliance system | Critical | **YES** |
| Post-match mutation | ✅ PASS | Match status check | None | No |
| Integer overflow/underflow | ✅ PASS | All values bounded by uint8/int16 | None | No |

### 20. TEST COVERAGE AUDIT

| Area | Tests Exist | Coverage | Gap | Fix Required |
|---|---|---|---|---|
| Match creation | ✅ Yes | Basic only | Low | **YES** |
| Player joining | ✅ Yes | Basic only | Low | **YES** |
| Intent submission | ✅ Yes | Happy path only | Low | **YES** |
| Round settlement | ✅ Yes | Minimal | Low | **YES** |
| ATTACK action | ⚠️ Partial | Not tested with multiple attackers, passive bonus | Major | **YES** |
| FORTIFY action | ⚠️ Partial | Not tested exhaustively | Minor | **YES** |
| TAX action | ⚠️ Partial | Not tested with sabotage, passive bonus | Minor | **YES** |
| DRAGONSTRIKE action | ⚠️ Partial | Only territory tested; not dragon combat | Major | **YES** |
| DIPLOMACY action | ❌ No | N/A | Critical | **YES** |
| SABOTAGE action | ❌ No | N/A | Critical | **YES** |
| Alliance formation | ❌ No | N/A | Critical | **YES** |
| Betrayal mechanics | ❌ No | N/A | Critical | **YES** |
| Dragon combat | ❌ No | N/A | Critical | **YES** |
| Dragon capture | ❌ No | N/A | Critical | **YES** |
| Dragon death | ❌ No | N/A | Critical | **YES** |
| Throne victory | ❌ No | N/A | Critical | **YES** |
| Final ranking | ❌ No | N/A | Critical | **YES** |
| Signature validation | ⚠️ Partial | No cross-contract, cross-chain tests | Minor | **YES** |
| Nonce replay protection | ❌ No | N/A | Critical | **YES** |
| Determinism | ❌ No | N/A | Critical | **YES** |
| Invariants | ❌ No | N/A | Critical | **YES** |

---

## PART 2: CRITICAL GAPS SUMMARY

### Actions Not Implemented (2 of 6)

1. **DIPLOMACY** — Required for alliance system
2. **SABOTAGE** — Required for tactical play

### Mechanics Not Implemented

1. **Alliance system** — Formation, tracking, expiration
2. **Betrayal detection** — Attack/sabotage against ally triggers breach
3. **Betrayal consequences** — Reputation loss, reputation gain, vengeance
4. **Vengeance application** — Combat bonuses, block diplomacy
5. **Dragon capture** — Neutral and owned dragons not capturable
6. **Dragon transfer** — Ownership changes not implemented
7. **Dragon combat** — Dragon-vs-dragon battles not implemented
8. **Multiple attacker aggregation** — All attacks resolved independently
9. **Tie-break logic** — No reputation/gold/houseId tie-breaking
10. **Passive trait application** — Bonuses not applied to formulas

### Security & Compliance Issues

1. **EIP-712 domain separator** — Not used in digest (missing `\x19\x01` prefix)
2. **Defense formula** — Missing `ownerMilitary/2` contribution
3. **Final scoring** — Throne rounds should count total held, not just streak

### Test Gaps

- No action tests for DIPLOMACY, SABOTAGE
- No alliance formation/betrayal tests
- No dragon combat tests
- No dragon capture tests
- No multiple attacker aggregation tests
- No tie-break tests
- No determinism tests
- No invariant tests
- No signature validation tests (cross-contract, cross-chain)
- No nonce replay tests

---

## PART 3: IMPLEMENTATION PRIORITIES

### Priority 1 — CRITICAL (must implement)

1. [ ] DIPLOMACY action + alliance system
2. [ ] SABOTAGE action
3. [ ] Betrayal detection & consequences
4. [ ] Dragon capture & transfer
5. [ ] Dragon combat (dragon-vs-dragon)
6. [ ] Multiple attacker aggregation
7. [ ] Tie-break logic implementation
8. [ ] EIP-712 domain separator in digest
9. [ ] Comprehensive test coverage

### Priority 2 — HIGH (should implement)

1. [ ] Passive trait application (all 6 houses)
2. [ ] Defense formula fix (add ownerMilitary/2)
3. [ ] Vengeance combat bonus
4. [ ] Final scoring - throne round counting
5. [ ] Dragon death permanent state

### Priority 3 — MEDIUM (nice-to-have)

1. [ ] Additional Chronicle events
2. [ ] ReputationChanged event
3. [ ] MajorVictory event
4. [ ] Determinism tests

---

## PART 4: LICENSE STATUS

**Current state:** The repository was initialized with MIT license from Foundry default.

**Intended state:** Apache License 2.0

**Action required:** Update `LICENSE` file and any package metadata to Apache-2.0.

---

## PART 5: REPOSITORY HYGIENE

**Status:** ✅ PASS

- [ ] No `.env` files committed
- [ ] No private keys visible
- [ ] `.gitignore` present with standard patterns
- [ ] Source files present and organized
- [ ] Build artifacts not committed

---

## PART 6: STATISTICS

- **Total requirements audited:** 150+
- **Requirements passing (✅):** ~65
- **Requirements partial (⚠️):** ~15
- **Requirements failing (❌):** ~70
- **Critical gaps:** 12
- **Major gaps:** 20
- **Minor gaps:** 10

---

## PART 7: FINAL STATUS

**Phase 2 is NOT READY FOR DEPLOYMENT.**

Current implementation is approximately 43% complete relative to Phase 1 specification.

The contract requires substantial additional implementation to meet all requirements before frontend work or mainnet deployment.

**Next steps:**

1. Implement Priority 1 items
2. Expand test coverage
3. Create INTENT_SIGNING_SPEC.md
4. Re-audit after implementation
5. Final verification
6. Only then declare Phase 2 complete

---

Generated: 2026-08-14  
Audit tool: Phase 2 Implementation Agent  
Status: DRAFT — IN PROGRESS
