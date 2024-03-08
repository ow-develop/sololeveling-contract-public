// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import {CountersUpgradeable} from "../utils/CountersUpgradeable.sol";
import {EnumerableSetUpgradeable} from "../utils/EnumerableSetUpgradeable.sol";

import {SLBaseUpgradeable} from "../core/SLBaseUpgradeable.sol";
import {SLControllerUpgradeable} from "../core/SLControllerUpgradeable.sol";
import {SeasonError} from "../errors/SeasonError.sol";
import {ISLMonsterFactory} from "../monsterFactory/ISLMonsterFactory.sol";

/// @notice Core storage and event for season contract
abstract contract SeasonBase is
    SLBaseUpgradeable,
    SLControllerUpgradeable,
    SeasonError
{
    CountersUpgradeable.Counter internal seasonIds;

    /*
     *  Struct
     */
    struct Season {
        uint64 id;
        uint64 hunterRankCollectionId;
        uint64 seasonPackCollectionId;
        uint32 startBlock;
        uint32 endBlock;
        uint256[] seasonCollectionIds;
    }

    /*
     *  Mapping
     */
    /// @notice seasonId to Season
    mapping(uint256 => Season) internal seasons;
}
