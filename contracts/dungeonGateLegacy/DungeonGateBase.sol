// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import {CountersUpgradeable} from "../utils/CountersUpgradeable.sol";
import {EnumerableSetUpgradeable} from "../utils/EnumerableSetUpgradeable.sol";

import {SLBaseUpgradeable} from "../core/SLBaseUpgradeable.sol";
import {SLControllerUpgradeable} from "../core/SLControllerUpgradeable.sol";
import {DungeonGateError} from "../errors/DungeonGateError.sol";
import {ISLRandom} from "../random/ISLRandom.sol";
import {ISLSeason} from "../season/ISLSeason.sol";
import {ISLShop} from "../shopLegacy/ISLShop.sol";
import {ISLMonsterFactory} from "../monsterFactory/ISLMonsterFactory.sol";

/// @notice Core storage and event for dungeon gate contract
abstract contract DungeonGateBase is
    SLBaseUpgradeable,
    SLControllerUpgradeable,
    DungeonGateError
{
    CountersUpgradeable.Counter internal gateIds;

    // season contract
    ISLSeason internal seasonContract;

    // random contract
    ISLRandom internal randomContract;

    // shop contract
    ISLShop internal shopContract;

    // monsterFactory contract
    ISLMonsterFactory internal monsterFactoryContract;

    //  collectionId
    uint256 internal essenceStoneCollectionId;
    uint256 internal gateKeyCollectionId;
    uint256 internal normalMonsterCollectionId;

    // boost block count per 1 essence stone
    uint256 internal boostBlockCount;

    /*
     *  Struct
     */
    struct Gate {
        uint64 id;
        uint64 seasonId;
        uint32 startBlock;
        uint32 endBlock;
        uint32 usedStone;
        bool cleared;
        RankType gateRank;
        address hunter;
    }

    struct GateReward {
        uint256[7] rewardTokens;
    }

    struct MonsterReward {
        uint256[] monsterIds;
        uint256[] monsterAmounts;
    }

    struct SeasonPackReward {
        uint256 seasonPackId;
        uint256 amount;
    }

    struct RewardMintInfo {
        address hunter;
        uint256 signatureIndex;
        uint256[7] rewardTokens;
        uint256 rewardCount;
    }

    /*
     *  Mapping
     */
    /// @notice gateRank to gate block
    mapping(RankType => uint256) internal gateBlockPerRank; // E - S

    /// @notice hunterRank to slot
    mapping(RankType => uint256) internal slotPerHunterRank; // E - S

    /**
     * @notice gateRank to monster E-S rank & season pack reward count
     *     0 index = E rank monster reward count
     *     1 index = D rank monster reward count
     *     2 index = C rank monster reward count
     *     3 index = B rank monster reward count
     *     4 index = A rank monster reward count
     *     5 index = S rank monster reward count
     *     6 index = seasonPack reward count
     */
    mapping(RankType => uint256[7]) internal rewardTokensPerRank; // E - S

    /// @notice gateId to Gate
    mapping(uint256 => Gate) internal gates;

    /// @notice hunter to gateIds
    mapping(address => EnumerableSetUpgradeable.UintSet)
        internal gateOfHunterSlot;

    /// @notice seasonId to hunter to gate count
    mapping(uint256 => mapping(address => CountersUpgradeable.Counter))
        internal gateCountOfSeason;

    /*
     *  Event
     */
    event GateCreated(
        uint256 indexed seasonId,
        RankType indexed gateRank,
        address indexed hunter,
        uint256 gateId,
        uint256 startBlock,
        uint256 endBlock
    );

    event GateCleared(
        RankType indexed gateRank,
        address indexed hunter,
        uint256 indexed gateId,
        uint256 seasonId,
        uint256 usedStone,
        bytes[] gateSignatures,
        MonsterReward monsterReward,
        SeasonPackReward seasonPackReward,
        uint256 timestamp
    );
}
