// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import {CountersUpgradeable} from "../utils/CountersUpgradeable.sol";
import {EnumerableSetUpgradeable} from "../utils/EnumerableSetUpgradeable.sol";

import {SLBaseUpgradeable} from "../core/SLBaseUpgradeable.sol";
import {SLControllerUpgradeable} from "../core/SLControllerUpgradeable.sol";
import {CollectionTraitError} from "../errors/CollectionTraitError.sol";

/// @notice Core storage and event for collection trait contract
abstract contract CollectionTraitBase is
    SLBaseUpgradeable,
    SLControllerUpgradeable,
    CollectionTraitError
{
    CountersUpgradeable.Counter internal traitTypeIds;
    CountersUpgradeable.Counter internal traitValueIds;

    /*
     *  Struct
     */
    struct TraitType {
        uint64 id;
        uint64 createdTimestamp;
        bool isActive;
        string name;
    }

    struct TraitValue {
        uint64 id;
        uint64 typeId;
        uint64 createdTimestamp;
        string name;
    }

    struct TraitMonsterSet {
        uint256 valueId;
        uint256[] normalMonsterIds;
        uint256[] shadowMonsterIds;
    }

    /*
     *  Mapping
     */
    /// @notice traitTypeId to TraitType
    mapping(uint256 => TraitType) internal traitTypes;

    /// @notice valueId to TraitValue
    mapping(uint256 => TraitValue) internal traitValues;

    /// @notice traitType name to traitTypeId
    mapping(bytes32 => uint256) internal typeIdByName;

    /// @notice traitTypeId to traitValue name to traitValueId
    mapping(uint256 => mapping(bytes32 => uint256)) internal valueIdByName;

    /// @notice traitTypeId to traitValueIds
    mapping(uint256 => EnumerableSetUpgradeable.UintSet)
        internal traitValueOfType;

    /// @notice traitTypeId to collectionId to tokenIds
    mapping(uint256 => mapping(uint256 => EnumerableSetUpgradeable.UintSet))
        internal tokenOfTraitType;

    /// @notice traitValueId to collectionId to tokenIds
    mapping(uint256 => mapping(uint256 => EnumerableSetUpgradeable.UintSet))
        internal tokenOfTraitValue;

    /// @notice traitTypeId to collectionIds
    mapping(uint256 => EnumerableSetUpgradeable.UintSet)
        internal collectionOfTraitType;

    /// @notice traitValueId to collectionIds
    mapping(uint256 => EnumerableSetUpgradeable.UintSet)
        internal collectionOfTraitValue;
}
