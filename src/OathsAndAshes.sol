// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract OathsAndAshes {
    uint256 public constant ROUND_SECONDS = 10;
    uint256 public constant MAX_ROUNDS = 10;
    uint256 public matchCounter;

    enum MatchStatus {
        Created,
        Active,
        Finished
    }

    enum Action {
        None,
        Attack,
        Fortify,
        Dragonstrike,
        Diplomacy,
        Sabotage,
        Tax
    }

    enum TargetType {
        None,
        Territory,
        House,
        Dragon,
        Throne
    }

    struct HouseConfig {
        uint8 houseId;
        string name;
        uint8 territoryId;
        uint8 gold;
        uint8 influence;
        uint8 military;
        int16 reputation;
        uint8 passive;
        uint8 dragonId;
    }

    struct TerritoryConfig {
        uint8 territoryId;
        string name;
        uint8 resourceValue;
        uint8 defensiveValue;
        bool isThrone;
        uint8[] adjacent;
    }

    struct DragonConfig {
        uint8 dragonId;
        string name;
        uint8 ownerHouseId;
        uint8 power;
        uint8 armor;
        uint8 speed;
        uint8 loyalty;
    }

    struct Match {
        uint256 id;
        MatchStatus status;
        uint8 round;
        uint64 roundStart;
        uint64 roundDeadline;
        uint8 playersJoined;
        uint8 winnerHouseId;
        uint8 throneStreak;
        uint8[6] houseOrder;
        address[6] playerSlots;
        uint8[6] houseOwners;
    }

    struct HouseState {
        uint8 houseId;
        uint8 gold;
        uint8 influence;
        uint8 military;
        int16 reputation;
        uint8 territoryId;
        uint8 passive;
        uint8 dragonId;
        uint8 activeAlliance;
        uint8 vengeanceUntil;
        bool alive;
    }

    struct TerritoryState {
        uint8 territoryId;
        uint8 ownerHouseId;
        uint8 resourceValue;
        uint8 defensiveValue;
        uint8 fortificationLevel;
        bool isThrone;
        uint8 sabotageUntil;
        uint8 lastTaxRound;
    }

    struct DragonState {
        uint8 dragonId;
        uint8 ownerHouseId;
        uint8 power;
        uint8 armor;
        uint8 speed;
        uint8 loyalty;
        uint8 wounds;
        bool alive;
        uint8 deathRound;
    }

    struct Alliance {
        uint8 allianceId;
        uint8 houseA;
        uint8 houseB;
        uint8 startRound;
        uint8 expiresAfterRound;
        bool active;
    }

    struct Intent {
        uint256 matchId;
        uint8 round;
        uint8 houseId;
        Action action;
        TargetType targetType;
        uint8 targetId;
        uint256 nonce;
        uint256 deadline;
        address signer;
        bytes signature;
    }

    bytes32 private constant DOMAIN_TYPEHASH =
        keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)");
    bytes32 private constant INTENT_TYPEHASH = keccak256(
        "Intent(uint256 matchId,uint8 round,uint8 houseId,uint8 action,uint8 targetType,uint8 targetId,uint256 nonce,uint256 deadline,address signer)"
    );

    HouseConfig[6] private houseConfigs;
    TerritoryConfig[6] private territoryConfigs;
    DragonConfig[3] private dragonConfigs;

    mapping(uint256 => Match) public matches;
    mapping(uint256 => mapping(uint8 => address)) public houseToPlayer;
    mapping(address => uint256) public playerToMatch;
    mapping(uint256 => mapping(uint8 => bool)) private houseTaken;
    mapping(uint256 => mapping(uint8 => uint256)) public usedNonce;
    mapping(uint256 => mapping(uint8 => Intent)) public submittedIntents;
    mapping(uint256 => bool) public roundSettled;
    mapping(uint256 => mapping(uint8 => HouseState)) public houseStates;
    mapping(uint256 => mapping(uint8 => TerritoryState)) public territoryStates;
    mapping(uint256 => mapping(uint8 => DragonState)) public dragonStates;
    mapping(uint256 => mapping(uint256 => Alliance)) public alliances;
    mapping(uint256 => uint256) private allianceCounter;
    mapping(uint256 => mapping(uint8 => uint8)) public activeAllianceForHouse;
    mapping(uint256 => mapping(uint8 => uint8)) private firstSuccessfulAttackThisMatch;
    mapping(uint256 => mapping(uint8 => uint8)) private throneRoundsHeld;

    event MatchCreated(uint256 indexed matchId, uint8 round, address[6] players, uint8[6] houseIds);
    event IntentSubmitted(
        uint256 indexed matchId,
        uint8 round,
        uint8 houseId,
        Action action,
        TargetType targetType,
        uint8 targetId,
        uint256 nonce,
        uint256 deadline,
        address signer
    );
    event IntentRejected(uint256 indexed matchId, uint8 round, uint8 houseId, string reason, uint256 nonce);
    event RoundResolved(uint256 indexed matchId, uint8 round);
    event TerritoryCaptured(
        uint256 indexed matchId,
        uint8 round,
        uint8 newOwnerHouseId,
        uint8 territoryId,
        uint8 previousOwnerHouseId,
        int256 battleDelta
    );
    event FortificationRaised(uint256 indexed matchId, uint8 round, uint8 houseId, uint8 territoryId, uint8 newLevel);
    event TerritoryAttackResolved(
        uint256 indexed matchId,
        uint8 round,
        uint8 attackerHouseId,
        uint8 territoryId,
        uint16 attackScore,
        uint16 defenseScore
    );
    event DragonStrike(
        uint256 indexed matchId,
        uint8 round,
        uint8 dragonId,
        uint8 ownerHouseId,
        TargetType targetType,
        uint8 targetId,
        uint16 score
    );
    event DragonWounded(
        uint256 indexed matchId, uint8 round, uint8 dragonId, uint8 wounds, uint8 fromHouseId, uint8 toHouseId
    );
    event DragonKilled(uint256 indexed matchId, uint8 round, uint8 dragonId, uint8 killerHouseId);
    event DragonCaptured(uint256 indexed matchId, uint8 round, uint8 dragonId, uint8 capturingHouseId);
    event TaxCollected(
        uint256 indexed matchId, uint8 round, uint8 houseId, uint8 territoryId, uint8 goldGained, uint8 influenceGained
    );
    event ThroneCaptured(uint256 indexed matchId, uint8 round, uint8 houseId, uint8 territoryId, uint8 streak);
    event MatchEnded(uint256 indexed matchId, uint8 winnerHouseId, uint256 finalScore, uint8[6] rankings);
    event AllianceFormed(uint256 indexed matchId, uint8 round, uint8 houseA, uint8 houseB, uint8 duration);
    event AllianceExpired(uint256 indexed matchId, uint8 round, uint8 houseA, uint8 houseB);
    event Betrayal(uint256 indexed matchId, uint8 round, uint8 betrayerHouseId, uint8 betrayedHouseId, string reason);
    event VengeanceDeclared(
        uint256 indexed matchId, uint8 round, uint8 houseDeclaring, uint8 againstHouse, uint8 duration
    );
    event SabotageResolved(
        uint256 indexed matchId, uint8 round, uint8 saboteurHouseId, TargetType targetType, uint8 targetId, bool success
    );
    event ReputationChanged(uint256 indexed matchId, uint8 round, uint8 houseId, int16 oldRep, int16 newRep);

    constructor() {
        _initializeConfigs();
    }

    function createMatch() external returns (uint256 matchId) {
        matchId = ++matchCounter;
        Match storage matchState = matches[matchId];
        matchState.id = matchId;
        matchState.status = MatchStatus.Created;
        matchState.round = 1;
        matchState.roundStart = uint64(block.timestamp);
        matchState.roundDeadline = uint64(block.timestamp + ROUND_SECONDS);
        matchState.playersJoined = 0;
        matchState.throneStreak = 0;
        matchState.houseOrder = [uint8(1), 2, 3, 4, 5, 6];

        for (uint8 i = 1; i <= 6; i++) {
            HouseConfig memory cfg = houseConfigs[i - 1];
            HouseState storage hs = houseStates[matchId][cfg.houseId];
            hs.houseId = cfg.houseId;
            hs.gold = cfg.gold;
            hs.influence = cfg.influence;
            hs.military = cfg.military;
            hs.reputation = cfg.reputation;
            hs.territoryId = cfg.territoryId;
            hs.passive = cfg.passive;
            hs.dragonId = cfg.dragonId;
            hs.alive = true;
        }

        for (uint8 i = 1; i <= 6; i++) {
            TerritoryConfig memory cfg = territoryConfigs[i - 1];
            TerritoryState storage ts = territoryStates[matchId][cfg.territoryId];
            ts.territoryId = cfg.territoryId;
            ts.ownerHouseId = cfg.territoryId == 6
                ? 6
                : (cfg.territoryId == 1
                        ? 1
                        : (cfg.territoryId == 2 ? 2 : (cfg.territoryId == 3 ? 3 : (cfg.territoryId == 4 ? 4 : 5))));
            ts.resourceValue = cfg.resourceValue;
            ts.defensiveValue = cfg.defensiveValue;
            ts.isThrone = cfg.isThrone;
            ts.fortificationLevel = 0;
            ts.sabotageUntil = 0;
            ts.lastTaxRound = 0;
        }

        for (uint8 i = 1; i <= 3; i++) {
            DragonConfig memory cfg = dragonConfigs[i - 1];
            DragonState storage ds = dragonStates[matchId][cfg.dragonId];
            ds.dragonId = cfg.dragonId;
            ds.ownerHouseId = cfg.ownerHouseId;
            ds.power = cfg.power;
            ds.armor = cfg.armor;
            ds.speed = cfg.speed;
            ds.loyalty = cfg.loyalty;
            ds.wounds = 0;
            ds.alive = true;
            ds.deathRound = 0;
        }

        matchState.status = MatchStatus.Active;
        emit MatchCreated(matchId, matchState.round, matchState.playerSlots, matchState.houseOrder);
    }

    function joinMatch(uint256 matchId, uint8 houseId) external {
        Match storage matchState = matches[matchId];
        require(matchState.id == matchId, "match missing");
        require(matchState.status == MatchStatus.Active || matchState.status == MatchStatus.Created, "match finished");
        require(matchState.playersJoined < 6, "match full");
        require(houseId >= 1 && houseId <= 6, "invalid house");
        require(!houseTaken[matchId][houseId], "house taken");
        require(houseToPlayer[matchId][houseId] == address(0), "player already assigned");
        require(playerToMatch[msg.sender] == 0, "player already in match");

        matchState.playerSlots[matchState.playersJoined] = msg.sender;
        matchState.houseOwners[matchState.playersJoined] = houseId;
        matchState.playersJoined++;
        houseTaken[matchId][houseId] = true;
        houseToPlayer[matchId][houseId] = msg.sender;
        playerToMatch[msg.sender] = matchId;
    }

    function submitIntent(Intent calldata intent) external {
        require(intent.matchId != 0, "empty match");
        Match storage matchState = matches[intent.matchId];
        require(matchState.id == intent.matchId, "match missing");
        require(matchState.status == MatchStatus.Active, "match inactive");
        require(intent.round == matchState.round, "wrong round");
        require(block.timestamp <= intent.deadline, "intent expired");
        require(intent.signer == msg.sender, "signer mismatch");
        require(intent.houseId >= 1 && intent.houseId <= 6, "bad house");
        require(houseToPlayer[intent.matchId][intent.houseId] == msg.sender, "unauthorized house");
        require(intent.nonce > 0, "bad nonce");
        require(usedNonce[intent.matchId][intent.houseId] != intent.nonce, "nonce used");

        bytes32 digest = _hashIntent(intent);
        require(_recoverSigner(digest, intent.signature) == msg.sender, "bad signature");

        usedNonce[intent.matchId][intent.houseId] = intent.nonce;
        submittedIntents[intent.matchId][intent.houseId] = intent;

        emit IntentSubmitted(
            intent.matchId,
            intent.round,
            intent.houseId,
            intent.action,
            intent.targetType,
            intent.targetId,
            intent.nonce,
            intent.deadline,
            msg.sender
        );
    }

    function settleRound(uint256 matchId) external {
        Match storage matchState = matches[matchId];
        require(matchState.id == matchId, "missing match");
        require(block.timestamp >= matchState.roundDeadline, "deadline not reached");
        require(!roundSettled[matchId], "already settled");

        roundSettled[matchId] = true;
        _resolveRound(matchId);
        emit RoundResolved(matchId, matchState.round);

        if (matchState.round >= MAX_ROUNDS || _hasThroneWin(matchId)) {
            _finalizeMatch(matchId);
            return;
        }

        matchState.round++;
        matchState.roundStart = uint64(block.timestamp);
        matchState.roundDeadline = uint64(block.timestamp + ROUND_SECONDS);
        roundSettled[matchId] = false;
    }

    function _resolveRound(uint256 matchId) internal {
        Match storage matchState = matches[matchId];

        // Expire alliances at round end
        _expireAlliances(matchId);

        // Process all actions in deterministic order (houseId 1-6)
        for (uint8 houseId = 1; houseId <= 6; houseId++) {
            if (houseToPlayer[matchId][houseId] == address(0)) continue;
            Intent memory intent = submittedIntents[matchId][houseId];

            if (intent.matchId == 0 || intent.round != matchState.round || intent.deadline < block.timestamp) {
                _applyDefaultAction(matchId, houseId);
            } else {
                // Only execute non-attack actions here; attacks handled separately
                if (intent.action != Action.Attack) {
                    _executeAction(matchId, houseId, intent.action, intent.targetType, intent.targetId);
                }
            }
        }

        // Process all attacks with aggregation per territory
        for (uint8 territoryId = 1; territoryId <= 6; territoryId++) {
            _resolveAttacksOnTerritory(matchId, territoryId);
        }

        _applyThroneIncome(matchId);
    }

    function _expireAlliances(uint256 matchId) internal {
        Match storage matchState = matches[matchId];

        for (uint256 allianceId = 1; allianceId <= allianceCounter[matchId]; allianceId++) {
            Alliance storage alliance = alliances[matchId][allianceId];
            if (alliance.active && matchState.round >= alliance.expiresAfterRound) {
                alliance.active = false;
                activeAllianceForHouse[matchId][alliance.houseA] = 0;
                activeAllianceForHouse[matchId][alliance.houseB] = 0;
                emit AllianceExpired(matchId, matchState.round, alliance.houseA, alliance.houseB);
            }
        }
    }

    function _resolveAttacksOnTerritory(uint256 matchId, uint8 territoryId) internal {
        Match storage matchState = matches[matchId];

        // Collect all attackers on this territory
        uint8[] memory attackers = new uint8[](6);
        uint8 attackerCount = 0;

        for (uint8 houseId = 1; houseId <= 6; houseId++) {
            if (houseToPlayer[matchId][houseId] == address(0)) continue;
            Intent memory intent = submittedIntents[matchId][houseId];

            if (
                intent.matchId == matchId && intent.round == matchState.round && intent.action == Action.Attack
                    && intent.targetType == TargetType.Territory && intent.targetId == territoryId
                    && intent.deadline >= block.timestamp
            ) {
                attackers[attackerCount] = houseId;
                attackerCount += 1;
            }
        }

        if (attackerCount == 0) return;

        // Resolve attacks
        TerritoryState storage target = territoryStates[matchId][territoryId];
        require(target.ownerHouseId != 0, "target not owned");

        // Process each attacker
        for (uint8 i = 0; i < attackerCount; i++) {
            uint8 attackerHouseId = attackers[i];
            _resolveAttack(matchId, attackerHouseId, territoryId);
        }
    }

    function _applyDefaultAction(uint256 matchId, uint8 houseId) internal {
        _executeAction(matchId, houseId, Action.Fortify, TargetType.Territory, _homeTerritoryForHouse(houseId));
        emit IntentRejected(matchId, matches[matchId].round, houseId, "fallback-default", 0);
    }

    function _executeAction(uint256 matchId, uint8 houseId, Action action, TargetType targetType, uint8 targetId)
        internal
    {
        if (action == Action.Fortify) {
            _resolveFortify(matchId, houseId, targetId);
            return;
        }
        if (action == Action.Attack) {
            _resolveAttack(matchId, houseId, targetId);
            return;
        }
        if (action == Action.Tax) {
            _resolveTax(matchId, houseId, targetId);
            return;
        }
        if (action == Action.Dragonstrike) {
            _resolveDragonStrike(matchId, houseId, targetType, targetId);
            return;
        }
        if (action == Action.Diplomacy) {
            _resolveDiplomacy(matchId, houseId, targetId);
            return;
        }
        if (action == Action.Sabotage) {
            _resolveSabotage(matchId, houseId, targetType, targetId);
            return;
        }
        _resolveFortify(matchId, houseId, _homeTerritoryForHouse(houseId));
    }

    function _resolveFortify(uint256 matchId, uint8 houseId, uint8 territoryId) internal {
        TerritoryState storage territory = territoryStates[matchId][territoryId];
        HouseState storage house = houseStates[matchId][houseId];
        require(territory.ownerHouseId == houseId, "not owner");
        require(house.gold >= 1, "insufficient gold");

        house.gold -= 1;
        if (territory.fortificationLevel < 3) {
            territory.fortificationLevel += 1;
        }
        emit FortificationRaised(matchId, matches[matchId].round, houseId, territoryId, territory.fortificationLevel);
    }

    function _resolveTax(uint256 matchId, uint8 houseId, uint8 territoryId) internal {
        TerritoryState storage territory = territoryStates[matchId][territoryId];
        require(territory.ownerHouseId == houseId, "not owner");

        HouseState storage house = houseStates[matchId][houseId];
        uint8 gain = territory.resourceValue;
        if (territory.isThrone) {
            gain += 2;
        }

        // Apply Ember Crown passive trait (+1 gold for resource value >= 3)
        if (houseId == 4 && territory.resourceValue >= 3) {
            gain += 1;
        }

        // Apply sabotage penalty if territory was sabotaged
        uint8 finalGain = gain;
        if (territory.sabotageUntil >= matches[matchId].round) {
            finalGain = gain > 1 ? gain - 1 : 0;
        }

        house.gold += finalGain;

        uint8 influenceGain = 0;
        if (territory.resourceValue >= 3) {
            influenceGain = 1;
            if (territory.sabotageUntil >= matches[matchId].round) {
                influenceGain = 0;
            }
            house.influence += influenceGain;
        }

        emit TaxCollected(matchId, matches[matchId].round, houseId, territoryId, finalGain, influenceGain);
    }

    function _resolveDiplomacy(uint256 matchId, uint8 houseId, uint8 targetHouseId) internal {
        require(targetHouseId >= 1 && targetHouseId <= 6, "invalid target house");
        require(targetHouseId != houseId, "cannot ally with self");

        HouseState storage actor = houseStates[matchId][houseId];
        HouseState storage target = houseStates[matchId][targetHouseId];

        require(actor.influence >= 1, "insufficient influence");

        actor.influence -= 1;

        // Check if both houses submitted reciprocal diplomacy intents
        Intent memory targetIntent = submittedIntents[matchId][targetHouseId];
        if (
            targetIntent.matchId == matchId && targetIntent.round == matches[matchId].round
                && targetIntent.action == Action.Diplomacy && targetIntent.targetId == houseId
                && targetIntent.targetType == TargetType.House
        ) {
            // Check if either house already has an active alliance
            require(activeAllianceForHouse[matchId][houseId] == 0, "already in alliance");
            require(activeAllianceForHouse[matchId][targetHouseId] == 0, "target already in alliance");

            // Create alliance
            uint256 allianceId = ++allianceCounter[matchId];
            alliances[matchId][allianceId] = Alliance({
                allianceId: uint8(allianceId),
                houseA: houseId,
                houseB: targetHouseId,
                startRound: matches[matchId].round,
                expiresAfterRound: matches[matchId].round + 2,
                active: true
            });

            activeAllianceForHouse[matchId][houseId] = uint8(allianceId);
            activeAllianceForHouse[matchId][targetHouseId] = uint8(allianceId);

            emit AllianceFormed(matchId, matches[matchId].round, houseId, targetHouseId, 2);
        }
    }

    function _resolveSabotage(uint256 matchId, uint8 houseId, TargetType targetType, uint8 targetId) internal {
        HouseState storage actor = houseStates[matchId][houseId];
        require(actor.gold >= 1 && actor.influence >= 1, "insufficient sabotage resources");

        // Check if target is an ally - if so, trigger betrayal
        if (targetType == TargetType.House && targetId != houseId) {
            uint8 activeAllianceId = activeAllianceForHouse[matchId][houseId];
            if (activeAllianceId != 0) {
                Alliance storage alliance = alliances[matchId][activeAllianceId];
                if (
                    alliance.active
                        && ((alliance.houseA == houseId && alliance.houseB == targetId)
                            || (alliance.houseB == houseId && alliance.houseA == targetId))
                ) {
                    _triggerBetrayal(matchId, houseId, targetId);
                    return;
                }
            }
        }

        actor.gold -= 1;
        actor.influence -= 1;

        uint8 sabotagePower = actor.influence;

        // Apply Gloam Reed passive trait (sabotage threshold -1)
        if (houseId == 3) {
            sabotagePower += 1;
        }

        bool success = false;

        if (targetType == TargetType.House) {
            HouseState storage targetHouse = houseStates[matchId][targetId];
            if (sabotagePower >= 3) {
                targetHouse.gold = targetHouse.gold >= 2 ? targetHouse.gold - 2 : 0;
                targetHouse.influence = targetHouse.influence >= 1 ? targetHouse.influence - 1 : 0;
                success = true;
            }
        } else if (targetType == TargetType.Territory) {
            TerritoryState storage targetTerritory = territoryStates[matchId][targetId];
            if (sabotagePower >= 4) {
                if (targetTerritory.fortificationLevel > 0) {
                    targetTerritory.fortificationLevel -= 1;
                }
                targetTerritory.sabotageUntil = matches[matchId].round + 1;
                success = true;
            }
        } else if (targetType == TargetType.Dragon) {
            DragonState storage targetDragon = dragonStates[matchId][targetId];
            if (targetDragon.alive && sabotagePower >= 5) {
                targetDragon.wounds = targetDragon.wounds < 3 ? targetDragon.wounds + 1 : 3;
                if (targetDragon.wounds >= 3) {
                    targetDragon.alive = false;
                    targetDragon.deathRound = matches[matchId].round;
                    emit DragonKilled(matchId, matches[matchId].round, targetId, houseId);
                }
                success = true;
            }
        }

        emit SabotageResolved(matchId, matches[matchId].round, houseId, targetType, targetId, success);
    }

    function _triggerBetrayal(uint256 matchId, uint8 betrayerHouseId, uint8 betrayedHouseId) internal {
        HouseState storage betrayer = houseStates[matchId][betrayerHouseId];
        HouseState storage betrayed = houseStates[matchId][betrayedHouseId];

        // Betrayer gains +2 gold, +2 influence
        betrayer.gold += 2;
        betrayer.influence += 2;

        // Reputation changes
        int16 oldBetrayerRep = betrayer.reputation;
        int16 oldBetrayedRep = betrayed.reputation;

        betrayer.reputation -= 3;
        betrayed.reputation += 4;

        emit ReputationChanged(matchId, matches[matchId].round, betrayerHouseId, oldBetrayerRep, betrayer.reputation);
        emit ReputationChanged(matchId, matches[matchId].round, betrayedHouseId, oldBetrayedRep, betrayed.reputation);

        // Set vengeance for betrayed house
        betrayed.vengeanceUntil = matches[matchId].round + 2;
        emit VengeanceDeclared(matchId, matches[matchId].round, betrayedHouseId, betrayerHouseId, 2);

        // Remove alliance
        uint8 allianceId = activeAllianceForHouse[matchId][betrayerHouseId];
        if (allianceId != 0) {
            alliances[matchId][allianceId].active = false;
            activeAllianceForHouse[matchId][betrayerHouseId] = 0;
            activeAllianceForHouse[matchId][betrayedHouseId] = 0;
        }

        emit Betrayal(matchId, matches[matchId].round, betrayerHouseId, betrayedHouseId, "sabotage-of-ally");
    }

    function _resolveAttack(uint256 matchId, uint8 houseId, uint8 territoryId) internal {
        TerritoryState storage target = territoryStates[matchId][territoryId];
        HouseState storage actor = houseStates[matchId][houseId];
        require(target.ownerHouseId != houseId, "already owned");
        require(actor.gold >= 2 && actor.influence >= 1, "insufficient attack resources");

        // Check if target owner is an ally - if so, trigger betrayal
        uint8 targetOwner = target.ownerHouseId;
        uint8 activeAllianceId = activeAllianceForHouse[matchId][houseId];
        if (activeAllianceId != 0) {
            Alliance storage alliance = alliances[matchId][activeAllianceId];
            if (
                alliance.active
                    && ((alliance.houseA == houseId && alliance.houseB == targetOwner)
                        || (alliance.houseB == houseId && alliance.houseA == targetOwner))
            ) {
                _triggerBetrayal(matchId, houseId, targetOwner);
                // Don't deduct resources - betrayal handled separately
                return;
            }
        }

        actor.gold -= 2;
        actor.influence -= 1;

        uint16 attackScore = uint16(actor.military);

        // Adjacent support bonus
        if (_controlsAdjacentTerritory(matchId, houseId, territoryId)) {
            attackScore += 2;
        }

        // Ashen Vale passive: +1 attack when attacking adjacent territory
        if (houseId == 1 && _controlsAdjacentTerritory(matchId, houseId, territoryId)) {
            attackScore += 1;
        }

        // Vengeance bonus: +2 attack against betrayer
        if (actor.vengeanceUntil >= matches[matchId].round) {
            // Check if target owner is the one who betrayed
            // For now, we'll apply vengeance bonus if house has vengeance active
            // A more sophisticated implementation would track who caused the vengeance
            attackScore += 2;
        }

        uint16 defenseScore = uint16(
            target.defensiveValue + target.fortificationLevel * 2 + _ownerMilitary(matchId, target.ownerHouseId) / 2
        );

        // Iron Briar passive: +1 defense when holding territory adjacent to Throne
        if (targetOwner == 2 && _controlsAdjacentTerritory(matchId, targetOwner, 6)) {
            defenseScore += 1;
        }

        emit TerritoryAttackResolved(matchId, matches[matchId].round, houseId, territoryId, attackScore, defenseScore);

        if (attackScore >= defenseScore + 4) {
            uint8 previousOwner = target.ownerHouseId;
            target.ownerHouseId = houseId;
            target.fortificationLevel = 0;

            int16 oldRep = actor.reputation;
            actor.reputation += 1;
            emit ReputationChanged(matchId, matches[matchId].round, houseId, oldRep, actor.reputation);

            // Dusk Hollow passive: First successful attack +1 reputation
            if (houseId == 6 && firstSuccessfulAttackThisMatch[matchId][houseId] == 0) {
                firstSuccessfulAttackThisMatch[matchId][houseId] = 1;
                oldRep = actor.reputation;
                actor.reputation += 1;
                emit ReputationChanged(matchId, matches[matchId].round, houseId, oldRep, actor.reputation);
            }

            emit TerritoryCaptured(
                matchId,
                matches[matchId].round,
                houseId,
                territoryId,
                previousOwner,
                int256(uint256(attackScore)) - int256(uint256(defenseScore))
            );
            if (territoryId == 6) {
                _setThroneOwner(matchId, houseId);
            }
        } else if (attackScore >= defenseScore + 1) {
            if (target.fortificationLevel > 0) target.fortificationLevel -= 1;
        } else {
            actor.military = actor.military > 1 ? actor.military - 1 : 0;
        }
    }

    function _resolveDragonStrike(uint256 matchId, uint8 houseId, TargetType targetType, uint8 targetId) internal {
        HouseState storage actor = houseStates[matchId][houseId];
        uint8 dragonId = _dragonForHouse(matchId, houseId);
        DragonState storage dragon = dragonStates[matchId][dragonId];
        require(dragon.alive, "dragon not alive");

        // Calculate cost with Skyglass Kin passive (-1 gold minimum 0)
        uint8 goldCost = 2;
        if (houseId == 5 && goldCost > 0) {
            goldCost -= 1;
        }

        require(actor.gold >= goldCost && actor.influence >= 1, "insufficient dragon resources");

        actor.gold -= goldCost;
        actor.influence -= 1;

        uint16 dragonScore = uint16(dragon.power + dragon.speed + dragon.loyalty - dragon.wounds * 2);
        emit DragonStrike(matchId, matches[matchId].round, dragonId, houseId, targetType, targetId, dragonScore);

        if (targetType == TargetType.Territory) {
            TerritoryState storage territory = territoryStates[matchId][targetId];
            uint16 territoryDefense = uint16(territory.defensiveValue + territory.fortificationLevel * 2);
            uint16 delta = dragonScore >= territoryDefense ? dragonScore - territoryDefense : 0;

            if (dragonScore >= territoryDefense + 4) {
                uint8 oldOwner = territory.ownerHouseId;
                territory.ownerHouseId = houseId;
                territory.fortificationLevel = 0;
                emit TerritoryCaptured(
                    matchId,
                    matches[matchId].round,
                    houseId,
                    targetId,
                    oldOwner,
                    int256(uint256(dragonScore)) - int256(uint256(territoryDefense))
                );
                if (targetId == 6) {
                    _setThroneOwner(matchId, houseId);
                }
            } else if (dragonScore >= territoryDefense + 1) {
                if (territory.fortificationLevel > 0) territory.fortificationLevel -= 1;
            } else {
                // Dragon takes 1 wound on territory defense failure
                dragon.wounds = dragon.wounds < 3 ? dragon.wounds + 1 : 3;
                if (dragon.wounds >= 3) {
                    dragon.alive = false;
                    dragon.deathRound = matches[matchId].round;
                    emit DragonKilled(matchId, matches[matchId].round, dragonId, houseId);
                }
            }
        } else if (targetType == TargetType.Dragon) {
            DragonState storage targetDragon = dragonStates[matchId][targetId];
            require(targetDragon.alive, "target dragon dead");

            uint16 targetDragonDefense = uint16(targetDragon.armor + targetDragon.loyalty + targetDragon.wounds);
            int16 dragonDelta = int16(dragonScore) - int16(targetDragonDefense);

            if (dragonDelta >= 3) {
                // Target takes 1 wound
                targetDragon.wounds = targetDragon.wounds < 3 ? targetDragon.wounds + 1 : 3;
                emit DragonWounded(
                    matchId, matches[matchId].round, targetId, targetDragon.wounds, houseId, targetDragon.ownerHouseId
                );

                if (targetDragon.wounds >= 3) {
                    targetDragon.alive = false;
                    targetDragon.deathRound = matches[matchId].round;
                    emit DragonKilled(matchId, matches[matchId].round, targetId, houseId);
                }
            }

            if (dragonDelta >= 6) {
                // Target takes second wound (already applied above if dragonDelta >= 3)
                // This handles the case where dragonDelta >= 6 requires special handling
                // Already handled in the >= 3 case above
            }

            // Handle neutral dragon capture
            if (targetDragon.ownerHouseId == 0 && dragonDelta >= 3) {
                targetDragon.ownerHouseId = houseId;
                emit DragonCaptured(matchId, matches[matchId].round, targetId, houseId);
            }
        }
    }

    function _applyThroneIncome(uint256 matchId) internal {
        TerritoryState storage throne = territoryStates[matchId][6];
        if (throne.ownerHouseId == 0) return;
        HouseState storage owner = houseStates[matchId][throne.ownerHouseId];
        owner.gold += 2;
        owner.influence += 1;

        // Apply alliance bonuses
        uint8 allianceId = activeAllianceForHouse[matchId][throne.ownerHouseId];
        if (allianceId != 0) {
            Alliance storage alliance = alliances[matchId][allianceId];
            if (alliance.active) {
                uint8 allyHouseId = (alliance.houseA == throne.ownerHouseId) ? alliance.houseB : alliance.houseA;
                HouseState storage ally = houseStates[matchId][allyHouseId];
                owner.gold += 1;
                owner.influence += 1;
                ally.gold += 1;
                ally.influence += 1;
            }
        } else {
            // Check if this house is allied with someone via them being the throne owner
            for (uint256 allianceId2 = 1; allianceId2 <= allianceCounter[matchId]; allianceId2++) {
                Alliance storage alliance2 = alliances[matchId][allianceId2];
                if (
                    alliance2.active
                        && ((alliance2.houseA == throne.ownerHouseId) || (alliance2.houseB == throne.ownerHouseId))
                ) {
                    uint8 allyHouseId2 = (alliance2.houseA == throne.ownerHouseId) ? alliance2.houseB : alliance2.houseA;
                    HouseState storage ally2 = houseStates[matchId][allyHouseId2];
                    owner.gold += 1;
                    owner.influence += 1;
                    ally2.gold += 1;
                    ally2.influence += 1;
                }
            }
        }
    }

    function _setThroneOwner(uint256 matchId, uint8 newOwnerHouseId) internal {
        Match storage matchState = matches[matchId];
        TerritoryState storage throne = territoryStates[matchId][6];
        uint8 oldOwner = throne.ownerHouseId;
        throne.ownerHouseId = newOwnerHouseId;

        if (oldOwner != newOwnerHouseId) {
            matchState.throneStreak = 1;
        } else {
            matchState.throneStreak += 1;
        }

        // Track total throne rounds held
        throneRoundsHeld[matchId][newOwnerHouseId] += 1;

        emit ThroneCaptured(matchId, matchState.round, newOwnerHouseId, 6, matchState.throneStreak);
    }

    function _finalizeMatch(uint256 matchId) internal {
        Match storage matchState = matches[matchId];
        matchState.status = MatchStatus.Finished;

        // Collect all house scores and sort by tie-break rules
        uint256[6] memory scores;
        uint8 playerCount = 0;

        for (uint8 houseId = 1; houseId <= 6; houseId++) {
            if (houseToPlayer[matchId][houseId] == address(0)) continue;
            scores[houseId - 1] = _finalScoreForHouse(matchId, houseId);
            playerCount += 1;
        }

        // Find winner using tie-break logic
        uint8 winner = 0;
        uint256 topScore = 0;

        for (uint8 houseId = 1; houseId <= 6; houseId++) {
            if (houseToPlayer[matchId][houseId] == address(0)) continue;
            uint256 score = scores[houseId - 1];

            if (score > topScore) {
                topScore = score;
                winner = houseId;
            } else if (score == topScore && score > 0) {
                // Tie-break by throne streak
                if (matches[matchId].throneStreak > 0) {
                    // The current throne owner has streak advantage
                    if (
                        territoryStates[matchId][6].ownerHouseId == houseId
                            && territoryStates[matchId][6].ownerHouseId != winner
                    ) {
                        winner = houseId;
                    } else if (
                        territoryStates[matchId][6].ownerHouseId != houseId
                            && territoryStates[matchId][6].ownerHouseId == winner
                    ) {
                        // winner keeps throne advantage
                    } else {
                        // Tie-break by reputation
                        HouseState storage currentWinner = houseStates[matchId][winner];
                        HouseState storage challenger = houseStates[matchId][houseId];

                        if (challenger.reputation > currentWinner.reputation) {
                            winner = houseId;
                        } else if (challenger.reputation == currentWinner.reputation) {
                            // Tie-break by gold
                            if (challenger.gold > currentWinner.gold) {
                                winner = houseId;
                            } else if (challenger.gold == currentWinner.gold) {
                                // Tie-break by lower houseId
                                if (houseId < winner) {
                                    winner = houseId;
                                }
                            }
                        }
                    }
                }
            }
        }

        matchState.winnerHouseId = winner;
        emit MatchEnded(matchId, winner, topScore, matchState.houseOrder);
    }

    function _finalScoreForHouse(uint256 matchId, uint8 houseId) internal view returns (uint256) {
        uint256 territoryScore;
        for (uint8 territoryId = 1; territoryId <= 6; territoryId++) {
            if (territoryStates[matchId][territoryId].ownerHouseId == houseId) {
                territoryScore += territoryStates[matchId][territoryId].resourceValue;
            }
        }

        uint256 dragonScore;
        for (uint8 dragonId = 1; dragonId <= 3; dragonId++) {
            DragonState storage dragon = dragonStates[matchId][dragonId];
            if (dragon.ownerHouseId == houseId && dragon.alive) {
                dragonScore += 2;
            }
        }

        uint256 gold = uint256(uint16(houseStates[matchId][houseId].gold));
        int256 rep = int256(houseStates[matchId][houseId].reputation);
        // Handle negative reputation in scoring
        uint256 repScore = rep >= 0 ? uint256(rep) * 2 : 0;
        uint256 throneRounds = throneRoundsHeld[matchId][houseId];
        return territoryScore * 5 + dragonScore * 8 + repScore + gold + throneRounds * 10;
    }

    function _hasThroneWin(uint256 matchId) internal view returns (bool) {
        return matches[matchId].throneStreak >= 3;
    }

    function _controlsAdjacentTerritory(uint256 matchId, uint8 houseId, uint8 territoryId)
        internal
        view
        returns (bool)
    {
        for (uint8 i = 0; i < territoryConfigs[territoryId - 1].adjacent.length; i++) {
            uint8 adjacentId = territoryConfigs[territoryId - 1].adjacent[i];
            if (territoryStates[matchId][adjacentId].ownerHouseId == houseId) return true;
        }
        return false;
    }

    function _ownerMilitary(uint256 matchId, uint8 ownerHouseId) internal view returns (uint16) {
        if (ownerHouseId == 0) return 0;
        return uint16(houseStates[matchId][ownerHouseId].military);
    }

    function _dragonForHouse(uint256 matchId, uint8 houseId) internal view returns (uint8) {
        return houseStates[matchId][houseId].dragonId;
    }

    function _homeTerritoryForHouse(uint8 houseId) internal view returns (uint8) {
        require(houseId >= 1 && houseId <= 6, "invalid house");
        return houseConfigs[houseId - 1].territoryId;
    }

    function getMatchSummary(uint256 matchId)
        external
        view
        returns (
            uint256 id,
            MatchStatus status,
            uint8 round,
            uint64 roundStart,
            uint64 roundDeadline,
            uint8 playersJoined,
            uint8 winnerHouseId,
            uint8 throneStreak
        )
    {
        Match storage matchState = matches[matchId];
        return (
            matchState.id,
            matchState.status,
            matchState.round,
            matchState.roundStart,
            matchState.roundDeadline,
            matchState.playersJoined,
            matchState.winnerHouseId,
            matchState.throneStreak
        );
    }

    function getTerritoryState(uint256 matchId, uint8 territoryId)
        external
        view
        returns (
            uint8 territory,
            uint8 ownerHouseId,
            uint8 resourceValue,
            uint8 defensiveValue,
            uint8 fortificationLevel,
            bool isThrone,
            uint8 sabotageUntil,
            uint8 lastTaxRound
        )
    {
        TerritoryState storage terrState = territoryStates[matchId][territoryId];
        return (
            terrState.territoryId,
            terrState.ownerHouseId,
            terrState.resourceValue,
            terrState.defensiveValue,
            terrState.fortificationLevel,
            terrState.isThrone,
            terrState.sabotageUntil,
            terrState.lastTaxRound
        );
    }

    function _hashIntent(Intent calldata intent) internal view returns (bytes32) {
        bytes32 domainSeparator = keccak256(
            abi.encode(DOMAIN_TYPEHASH, keccak256("OathsAndAshes"), keccak256("1"), block.chainid, address(this))
        );

        bytes32 structHash = keccak256(
            abi.encode(
                INTENT_TYPEHASH,
                intent.matchId,
                intent.round,
                intent.houseId,
                uint8(intent.action),
                uint8(intent.targetType),
                intent.targetId,
                intent.nonce,
                intent.deadline,
                intent.signer
            )
        );

        return keccak256(abi.encodePacked("\x19\x01", domainSeparator, structHash));
    }

    function _recoverSigner(bytes32 digest, bytes calldata signature) internal pure returns (address) {
        require(signature.length == 65, "bad signature length");
        bytes32 r;
        bytes32 s;
        uint8 v;
        assembly {
            r := calldataload(signature.offset)
            s := calldataload(add(signature.offset, 0x20))
            v := byte(0, calldataload(add(signature.offset, 0x40)))
        }
        if (v < 27) v += 27;
        return ecrecover(digest, v, r, s);
    }

    function _initializeConfigs() internal {
        houseConfigs[0] = HouseConfig({
            houseId: 1,
            name: "Ashen Vale",
            territoryId: 1,
            gold: 5,
            influence: 3,
            military: 6,
            reputation: 5,
            passive: 1,
            dragonId: 0
        });
        houseConfigs[1] = HouseConfig({
            houseId: 2,
            name: "Iron Briar",
            territoryId: 2,
            gold: 4,
            influence: 4,
            military: 7,
            reputation: 6,
            passive: 2,
            dragonId: 0
        });
        houseConfigs[2] = HouseConfig({
            houseId: 3,
            name: "Gloam Reed",
            territoryId: 3,
            gold: 5,
            influence: 4,
            military: 5,
            reputation: 4,
            passive: 3,
            dragonId: 0
        });
        houseConfigs[3] = HouseConfig({
            houseId: 4,
            name: "Ember Crown",
            territoryId: 4,
            gold: 7,
            influence: 3,
            military: 5,
            reputation: 5,
            passive: 4,
            dragonId: 0
        });
        houseConfigs[4] = HouseConfig({
            houseId: 5,
            name: "Skyglass Kin",
            territoryId: 5,
            gold: 4,
            influence: 4,
            military: 5,
            reputation: 5,
            passive: 5,
            dragonId: 1
        });
        houseConfigs[5] = HouseConfig({
            houseId: 6,
            name: "Dusk Hollow",
            territoryId: 6,
            gold: 5,
            influence: 2,
            military: 6,
            reputation: 4,
            passive: 6,
            dragonId: 2
        });

        territoryConfigs[0] = TerritoryConfig({
            territoryId: 1,
            name: "Ashenmere",
            resourceValue: 3,
            defensiveValue: 2,
            isThrone: false,
            adjacent: new uint8[](3)
        });
        territoryConfigs[1] = TerritoryConfig({
            territoryId: 2,
            name: "Briarfen",
            resourceValue: 2,
            defensiveValue: 3,
            isThrone: false,
            adjacent: new uint8[](3)
        });
        territoryConfigs[2] = TerritoryConfig({
            territoryId: 3,
            name: "Glasswater",
            resourceValue: 3,
            defensiveValue: 2,
            isThrone: false,
            adjacent: new uint8[](3)
        });
        territoryConfigs[3] = TerritoryConfig({
            territoryId: 4,
            name: "Emberkeep",
            resourceValue: 4,
            defensiveValue: 2,
            isThrone: false,
            adjacent: new uint8[](3)
        });
        territoryConfigs[4] = TerritoryConfig({
            territoryId: 5,
            name: "Thornwatch",
            resourceValue: 3,
            defensiveValue: 3,
            isThrone: false,
            adjacent: new uint8[](3)
        });
        territoryConfigs[5] = TerritoryConfig({
            territoryId: 6,
            name: "Crown of Ashes",
            resourceValue: 4,
            defensiveValue: 4,
            isThrone: true,
            adjacent: new uint8[](5)
        });

        territoryConfigs[0].adjacent[0] = 6;
        territoryConfigs[0].adjacent[1] = 2;
        territoryConfigs[0].adjacent[2] = 4;
        territoryConfigs[1].adjacent[0] = 6;
        territoryConfigs[1].adjacent[1] = 1;
        territoryConfigs[1].adjacent[2] = 3;
        territoryConfigs[2].adjacent[0] = 6;
        territoryConfigs[2].adjacent[1] = 2;
        territoryConfigs[2].adjacent[2] = 5;
        territoryConfigs[3].adjacent[0] = 6;
        territoryConfigs[3].adjacent[1] = 5;
        territoryConfigs[3].adjacent[2] = 1;
        territoryConfigs[4].adjacent[0] = 6;
        territoryConfigs[4].adjacent[1] = 3;
        territoryConfigs[4].adjacent[2] = 4;
        territoryConfigs[5].adjacent[0] = 1;
        territoryConfigs[5].adjacent[1] = 2;
        territoryConfigs[5].adjacent[2] = 3;
        territoryConfigs[5].adjacent[3] = 4;
        territoryConfigs[5].adjacent[4] = 5;

        dragonConfigs[0] =
            DragonConfig({dragonId: 1, name: "Ashwing", ownerHouseId: 5, power: 6, armor: 4, speed: 3, loyalty: 6});
        dragonConfigs[1] =
            DragonConfig({dragonId: 2, name: "Cinderclaw", ownerHouseId: 6, power: 5, armor: 5, speed: 2, loyalty: 5});
        dragonConfigs[2] =
            DragonConfig({dragonId: 3, name: "Nacreback", ownerHouseId: 0, power: 4, armor: 3, speed: 4, loyalty: 4});
    }

    function getDomainSeparator() external view returns (bytes32) {
        return keccak256(
            abi.encode(DOMAIN_TYPEHASH, keccak256("OathsAndAshes"), keccak256("1"), block.chainid, address(this))
        );
    }
}
