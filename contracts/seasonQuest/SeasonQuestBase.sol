// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import {CountersUpgradeable} from "../utils/CountersUpgradeable.sol";
import {EnumerableSetUpgradeable} from "../utils/EnumerableSetUpgradeable.sol";

import {SLBaseUpgradeable} from "../core/SLBaseUpgradeable.sol";
import {SLControllerUpgradeable} from "../core/SLControllerUpgradeable.sol";
import {SeasonQuestError} from "../errors/SeasonQuestError.sol";
import {ISLSeason} from "../season/ISLSeason.sol";
import {ISLMonsterFactory} from "../monsterFactory/ISLMonsterFactory.sol";
import {ISLCollectionTrait} from "../collectionTrait/ISLCollectionTrait.sol";

/// @notice Core storage and event for season quest contract
abstract contract SeasonQuestBase is
    SLBaseUpgradeable,
    SLControllerUpgradeable,
    SeasonQuestError
{
    CountersUpgradeable.Counter internal questIds;

    // monsterFactory contract
    ISLMonsterFactory internal monsterFactoryContract;

    // collectionTrait contract
    ISLCollectionTrait internal collectionTraitContract;

    // season contract
    ISLSeason internal seasonContract;

    // collectionId
    uint256 internal hunterItemCollectionId;
    uint256 internal normalMonsterCollectionId;
    uint256 internal shadowMonsterCollectionId;

    /*
     *  Struct
     */
    struct Quest {
        uint64 id;
        uint64 seasonId;
        uint128 rewardScore; // 256
        uint32 completableCount;
        uint64 requiredQuestId;
        bool isActive;
        QuestType questType;
        RankType rankType;
        uint256[] hunterItemIds;
    }

    struct MonsterSet {
        uint256[] normalMonsterIds;
        uint256[] normalMonsterAmounts;
        uint256[] shadowMonsterIds;
        uint256[] shadowMonsterAmounts;
    }

    struct MonsterTrait {
        uint256 requiredNormalMonster;
        uint256 requiredShadowMonster;
        Trait[] traits;
    }

    struct Trait {
        uint64 traitTypeId;
        uint64 traitValueId;
    }

    struct QuestInput {
        uint64 seasonId;
        uint128 rewardScore;
        uint32 completableCount;
        uint64 requiredQuestId;
        RankType rankType;
        uint256[] hunterItemIds;
    }

    /*
     *  Mapping
     */
    /// @notice questId to Quest
    mapping(uint256 => Quest) internal quests;

    /// @notice monsterSet questId to MonsterSet
    mapping(uint256 => MonsterSet) internal monsterSets;

    /// @notice monsterTrait questId to monsterTrait
    mapping(uint256 => MonsterTrait) internal monsterTraits;

    /// @notice seasonId to questIds
    mapping(uint256 => EnumerableSetUpgradeable.UintSet) internal questOfSeason;

    /// @notice seasonId to QuestType to questIds
    mapping(uint256 => mapping(QuestType => EnumerableSetUpgradeable.UintSet))
        internal questOfQuestType;

    /// @notice questId to hunter to completed count
    mapping(uint256 => mapping(address => CountersUpgradeable.Counter))
        internal questCompleted;

    /// @notice seasonId to hunter to quest score
    mapping(uint256 => mapping(address => uint256)) internal questScores;

    /*
     *  Enum
     */
    enum QuestType {
        MonsterSet,
        MonsterTrait,
        General
    }

    /*
     *  Event
     */
    event QuestCompleted(
        address indexed hunter,
        uint256 indexed questId,
        uint256 currentScore,
        uint256 timestamp
    );
}
