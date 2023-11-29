// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import {CountersUpgradeable} from "../utils/CountersUpgradeable.sol";
import {EnumerableSetUpgradeable} from "../utils/EnumerableSetUpgradeable.sol";

import {SLBaseUpgradeable} from "../core/SLBaseUpgradeable.sol";
import {ProjectError} from "../errors/ProjectError.sol";
import {ISLRoleWallet} from "../wallet/ISLRoleWallet.sol";

/// @notice Core storage and event for project contract
abstract contract ProjectBase is SLBaseUpgradeable, ProjectError {
    CountersUpgradeable.Counter internal universeIds;
    CountersUpgradeable.Counter internal collectionIds;

    /// @notice operator multisig wallet
    ISLRoleWallet internal operator;

    /*
     *  Struct
     */
    struct Universe {
        uint64 id;
        uint64 createdTimestamp;
        bool isActive;
    }

    struct Collection {
        uint64 id;
        uint64 createdTimestamp;
        bool isActive;
        address tokenContract;
        address creator;
        TokenType tokenType;
    }

    /*
     *  Mapping
     */
    /// @notice universeId to Universe
    mapping(uint256 => Universe) internal universes;

    /// @notice collectionId to Collection
    mapping(uint256 => Collection) internal collections;

    /// @notice universeId to collectionIds
    mapping(uint256 => EnumerableSetUpgradeable.UintSet)
        internal collectionOfUniverse;

    /// @notice tokenContract to collectionId
    mapping(address => uint256) internal collectionByTokenContract;

    /*
     *  Event
     */
    event SetOperator(address operator, uint256 timestamp);
}
