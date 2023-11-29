// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import {SLBaseUpgradeable} from "../core/SLBaseUpgradeable.sol";
import {SLControllerUpgradeable} from "../core/SLControllerUpgradeable.sol";
import {SystemError} from "../errors/SystemError.sol";
import {ISLMonsterFactory} from "../monsterFactory/ISLMonsterFactory.sol";
import {ISLRandom} from "../random/ISLRandom.sol";

/// @notice Core storage and event for system contract
abstract contract SystemBase is
    SLBaseUpgradeable,
    SLControllerUpgradeable,
    SystemError
{
    /// @notice precision 100.00000%
    uint256 internal constant DENOMINATOR = 100_00000;

    // monsterFactory contract
    ISLMonsterFactory internal monsterFactoryContract;

    // random contract
    ISLRandom internal randomContract;

    // collectionId
    uint256 internal essenceStoneCollectionId;
    uint256 internal normalMonsterCollectionId;
    uint256 internal shadowMonsterCollectionId;

    /*
     *  Struct
     */
    struct MonsterSet {
        uint256[] normalMonsterIds;
        uint256[] normalMonsterAmounts;
        uint256[] shadowMonsterIds;
        uint256[] shadowMonsterAmounts;
    }

    struct UseMonster {
        uint256[] monsterIds;
        uint256[] monsterAmounts;
    }

    struct SystemCount {
        uint256[6] monsterUpgradeCounts;
        uint256[6] monsterAriseCounts;
        uint256[6] monsterReturnCounts;
        uint256[6] shadowReturnCounts;
    }

    /*
     *  Mapping
     */
    /// @notice RankType to required monster count for normal monster upgrade
    mapping(RankType => uint256) internal requiredMonsterForUpgrade; // E - A normalMonster

    /// @notice RankType to required essence stone count for normal monster upgrade
    mapping(RankType => uint256) internal requiredStoneForUpgrade; // E - A normalMonster

    /**
     * @notice RankType to required essence stone count for shadow monster arise
     *     RankType.B = S rank normal monster required
     *     RankType.A = B rank shadow monster required
     *     RankType.S = A rank shadow monster required
     */
    mapping(RankType => uint256) internal requiredStoneForArise; // B - S

    /// @notice B, A, S rank to shadow monster arise percentage
    mapping(RankType => uint256) internal percentageForArise; // B - S

    /// @notice RankType to essence stone count when 1 normal monster returned
    mapping(RankType => uint256) internal essenceStoneWhenNormalMonsterReturned; // E - S normalMonster

    /// @notice RankType to essence stone count when 1 shadow monster returned
    mapping(RankType => uint256) internal essenceStoneWhenShadowMonsterReturned; // B - S shadowMonster

    /// @notice hunter to RankType to monster upgrade count
    mapping(address => mapping(RankType => uint256))
        internal hunterUpgradeCount;

    /// @notice hunter to RankType to monster arise count
    mapping(address => mapping(RankType => uint256)) internal hunterAriseCount;

    /// @notice hunter to isShadow to RankType to monster return count
    mapping(address => mapping(bool => mapping(RankType => uint256)))
        internal hunterReturnCount;

    /// @notice RankType to monster upgrade count
    mapping(RankType => uint256) upgradeCount;

    /// @notice RankType to monster arise count
    mapping(RankType => uint256) ariseCount;

    /// @notice isShadow to RankType to monster return count
    mapping(bool => mapping(RankType => uint256)) returnCount;

    /*
     *  Event
     */
    event MonsterUpgraded(
        address indexed hunter,
        RankType indexed upgradedRank,
        uint256 upgradedAmount,
        UseMonster usedMonster,
        uint256 usedStone,
        uint256[] resultMonsterIds,
        uint256 timestamp
    );

    event MonsterArose(
        address indexed hunter,
        RankType indexed nextMonsterRank,
        uint256 indexed monsterId,
        uint256 requestAmount,
        uint256 aroseCount,
        uint256 usedStone,
        bool isSuccess,
        uint256 nextMonsterId,
        uint256 timestamp
    );

    event MonsterReturned(
        address indexed hunter,
        RankType indexed monsterRank,
        bool indexed isShadow,
        uint256 essenceStone,
        uint256[] monsterIds,
        uint256[] monsterAmounts,
        uint256 timestamp
    );

    event MonsterReturnedBatch(
        address indexed hunter,
        uint256 essenceStone,
        MonsterSet returnedMonster,
        uint256 timestamp
    );
}
