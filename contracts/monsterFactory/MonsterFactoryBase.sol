// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import {CountersUpgradeable} from "../utils/CountersUpgradeable.sol";
import {EnumerableSetUpgradeable} from "../utils/EnumerableSetUpgradeable.sol";

import {SLBaseUpgradeable} from "../core/SLBaseUpgradeable.sol";
import {SLControllerUpgradeable} from "../core/SLControllerUpgradeable.sol";
import {MonsterFactoryError} from "../errors/MonsterFactoryError.sol";

/// @notice Core storage and event for monster factory contract
abstract contract MonsterFactoryBase is
    SLBaseUpgradeable,
    SLControllerUpgradeable,
    MonsterFactoryError
{
    /*
     *  Mapping
     */
    /// @notice isShadow to monsterId
    mapping(bool => CountersUpgradeable.Counter) internal monsterIds;

    /// @notice RankType to isShadow to monsterIds
    mapping(RankType => mapping(bool => EnumerableSetUpgradeable.UintSet))
        internal monsterOfRankType;

    /// @notice isShadow to monsterId to RankType
    mapping(bool => mapping(uint256 => RankType)) internal monsterRankTypes;

    /// @notice B, A, S rank before monsterId to next monsterId
    mapping(RankType => mapping(uint256 => uint256))
        internal ariseNextMonsterIds;

    /// @notice B, A, S rank next monsterId to before monsterId
    mapping(RankType => mapping(uint256 => uint256))
        internal ariseBeforeMonsterIds;

    /// @notice RankType to isShadow to monster collecting score
    mapping(RankType => mapping(bool => uint256)) internal monsterScores;

    /*
     *  Event
     */
    event AddMonster(
        RankType indexed monsterRank,
        bool indexed isShadow,
        uint256 monsterId,
        uint256 timestamp
    );

    event SetMonsterRankType(
        bool indexed isShadow,
        uint256 indexed monsterId,
        RankType monsterRank,
        uint256 timestamp
    );

    event SetAriseMonster(
        RankType indexed nextMonsterRank,
        uint256 beforeMonsterId,
        uint256 nextMonsterId,
        uint256 timestamp
    );

    event SetAriseMonsterBatch(
        RankType indexed nextMonsterRank,
        uint256[] beforeMonsterIds,
        uint256[] nextMonsterIds,
        uint256 timestamp
    );
}
