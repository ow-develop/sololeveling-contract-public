// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import {CountersUpgradeable} from "../utils/CountersUpgradeable.sol";
import {EnumerableSetUpgradeable} from "../utils/EnumerableSetUpgradeable.sol";

import {SLBaseUpgradeable} from "../core/SLBaseUpgradeable.sol";
import {SLControllerUpgradeable} from "../core/SLControllerUpgradeable.sol";
import {SeasonSettlementError} from "../errors/SeasonSettlementError.sol";
import {ISLSeason} from "../season/ISLSeason.sol";
import {ISLSeasonQuest} from "../seasonQuest/ISLSeasonQuest.sol";
import {ISLDungeonGate} from "../dungeonGate/ISLDungeonGate.sol";

/// @notice Core storage and event for season settlement contract
abstract contract SeasonSettlementBase is
    SLBaseUpgradeable,
    SLControllerUpgradeable,
    SeasonSettlementError
{
    /// @notice precision 100.00000%
    uint256 internal constant DENOMINATOR = 100_00000;

    // season contract
    ISLSeason internal seasonContract;

    // season quest contract
    ISLSeasonQuest internal seasonQuestContract;

    // dungeon gate contract
    ISLDungeonGate internal dungeonGateContract;

    uint256 internal SRankRewardCollectionId;
    uint256 internal seasonScoreCollectionId;

    // score per gate clear
    uint256 internal scorePerGate;

    ScoreRate internal scoreRate;

    /*
     *  Struct
     */
    struct ScoreRate {
        uint32 quest;
        uint32 activity;
        uint32 collecting;
    }

    struct SeasonScore {
        uint256 questScore;
        uint256 convertedQuestScore;
        uint256 activityScore;
        uint256 convertedActivityScore;
        uint256 collectingScore;
        uint256 convertedCollectingScore;
        uint256 seasonScore;
    }

    /*
     *  Mapping
     */
    /// @notice seasonId to hunter to claimed reward
    mapping(uint256 => mapping(address => bool)) internal rewardClaimed;

    /*
     *  Event
     */
    event SetScoreRate(
        uint256 quest,
        uint256 activity,
        uint256 collecting,
        uint256 timestamp
    );

    event SeasonRewardClaimed(
        uint256 indexed seasonId,
        address indexed hunter,
        uint256 mintedSeasonScore,
        bool isSRankRewardTokenMinted,
        uint256 SRankRewardTokenId,
        uint256 timestamp
    );
}
