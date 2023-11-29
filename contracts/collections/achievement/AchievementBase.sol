// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import {CountersUpgradeable} from "../../utils/CountersUpgradeable.sol";

import {SLBaseUpgradeable} from "../../core/SLBaseUpgradeable.sol";
import {SLControllerUpgradeable} from "../../core/SLControllerUpgradeable.sol";
import {AchievementError} from "../../errors/AchievementError.sol";

/// @notice Core storage and event for achievement ERC1155 SBT contract
abstract contract AchievementBase is
    SLBaseUpgradeable,
    SLControllerUpgradeable,
    AchievementError
{
    CountersUpgradeable.Counter internal achievementIds;

    string public constant name = "Achievement";
    string public constant symbol = "Achievement";

    /*
     *  Struct
     */
    struct Achievement {
        uint64 id;
        bool mintEnabled;
        AchievementType achievementType;
    }

    struct CollectionSet {
        Collection[] collections;
    }

    struct Collection {
        uint256 collectionId;
        uint256[] tokenIds;
        uint256[] amounts;
    }

    /*
     *  Mapping
     */
    /// @notice achievementId to Achievement
    mapping(uint256 => Achievement) internal achievements;

    /// @notice achievementId to CollectionSet
    mapping(uint256 => CollectionSet) internal collectionAchievements;

    /// @notice achievementId to minted supply
    mapping(uint256 => CountersUpgradeable.Counter)
        internal mintedSupplyOfToken;

    /*
     *  Enum
     */
    enum AchievementType {
        Collection,
        General
    }

    /*
     *  Event
     */
    event SetBaseTokenURI(string baseTokenURI, uint256 timestamp);

    event AchievementClaimed(
        uint256 indexed achievementId,
        address indexed hunter,
        uint256 timestmap
    );
}
