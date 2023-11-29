// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import {Unsafe} from "../../utils/Unsafe.sol";
import {CountersUpgradeable} from "../../utils/CountersUpgradeable.sol";
import {EnumerableSetUpgradeable} from "../../utils/EnumerableSetUpgradeable.sol";
import {SafeCastUpgradeable} from "../../utils/SafeCastUpgradeable.sol";

import {ISLCollectionTrait} from "../ISLCollectionTrait.sol";
import {CollectionTraitBase} from "../CollectionTraitBase.sol";

abstract contract Trait is ISLCollectionTrait, CollectionTraitBase {
    using Unsafe for uint256;
    using CountersUpgradeable for CountersUpgradeable.Counter;
    using EnumerableSetUpgradeable for EnumerableSetUpgradeable.UintSet;
    using SafeCastUpgradeable for uint256;

    /*
     *  TraitType
     */
    function addTraitType(string calldata _name) external onlyOperator {
        if (isExistTraitTypeByName(_name)) revert AlreadyExistTypeName();

        traitTypeIds.increment();
        uint64 typeId = traitTypeIds.current().toUint64();

        traitTypes[typeId] = TraitType({
            id: typeId,
            createdTimestamp: block.timestamp.toUint64(),
            isActive: true,
            name: _name
        });

        bytes32 name = keccak256(bytes(_name));
        typeIdByName[name] = typeId;

        emitCreate("TraitType", typeId);
    }

    function setTraitTypeName(
        uint256 _typeId,
        string calldata _name
    ) external onlyOperator {
        if (!isExistTraitTypeById(_typeId)) revert InvalidTraitTypeId();
        if (isExistTraitTypeByName(_name)) revert AlreadyExistTypeName();

        TraitType storage traitType = traitTypes[_typeId];

        bytes32 beforeName = keccak256(bytes(traitType.name));
        typeIdByName[beforeName] = 0;

        traitType.name = _name;

        bytes32 name = keccak256(bytes(_name));
        typeIdByName[name] = _typeId;
    }

    function setTraitTypeActive(
        uint256 _typeId,
        bool _isActive
    ) external onlyOperator {
        if (!isExistTraitTypeById(_typeId)) revert InvalidTraitTypeId();

        traitTypes[_typeId].isActive = _isActive;
    }

    /*
     *  TraitType View
     */
    function isExistTraitTypeById(uint256 _typeId) public view returns (bool) {
        return _typeId != 0 && _typeId <= traitTypeIds.current();
    }

    function isActiveTraitType(uint256 _typeId) external view returns (bool) {
        return traitTypes[_typeId].isActive;
    }

    function isExistTraitTypeByName(
        string calldata _name
    ) public view returns (bool) {
        return getTraitTypeIdByName(_name) != 0;
    }

    function getTraitTypeIdByName(
        string calldata _name
    ) public view returns (uint256) {
        bytes32 name = keccak256(bytes(_name));
        return typeIdByName[name];
    }

    function getTraitTypeById(
        uint256 _typeId
    ) external view returns (TraitType memory) {
        if (!isExistTraitTypeById(_typeId)) revert InvalidTraitTypeId();

        return traitTypes[_typeId];
    }

    function getTraitTypeLength() external view returns (uint256) {
        return traitTypeIds.current();
    }

    function getCollectionLengthOfTraitType(
        uint256 _typeId
    ) external view returns (uint256) {
        if (!isExistTraitTypeById(_typeId)) revert InvalidTraitTypeId();

        return collectionOfTraitType[_typeId].length();
    }

    function getCollectionIdOfTraitType(
        uint256 _typeId
    ) external view returns (uint256[] memory) {
        if (!isExistTraitTypeById(_typeId)) revert InvalidTraitTypeId();

        return collectionOfTraitType[_typeId].values();
    }

    /*
     *  TraitValue
     */
    function addTraitValue(
        uint256 _typeId,
        string calldata _name
    ) external onlyOperator {
        if (!isExistTraitTypeById(_typeId)) revert InvalidTraitTypeId();
        if (isExistTraitValueByName(_typeId, _name))
            revert AlreadyExistValueName();

        traitValueIds.increment();
        uint64 valueId = traitValueIds.current().toUint64();

        traitValues[valueId] = TraitValue({
            id: valueId,
            typeId: _typeId.toUint64(),
            createdTimestamp: block.timestamp.toUint64(),
            name: _name
        });

        bytes32 name = keccak256(bytes(_name));
        valueIdByName[_typeId][name] = valueId;

        traitValueOfType[_typeId].add(valueId);

        emitCreate("MonsterTraitValue", valueId);
    }

    function removeTraitValue(uint256 _valueId) external onlyOperator {
        if (getCollectionLengthOfTraitValue(_valueId) != 0) {
            revert AlreadyExistToken();
        }

        TraitValue storage traitValue = traitValues[_valueId];
        traitValue.id = 0;

        bytes32 name = keccak256(bytes(traitValue.name));
        delete valueIdByName[traitValue.typeId][name];

        traitValueOfType[traitValue.typeId].remove(_valueId);
    }

    /*
     *  TraitValue View
     */
    function isExistTraitValueById(
        uint256 _valueId
    ) public view returns (bool) {
        return traitValues[_valueId].id != 0;
    }

    function isExistTraitValueByName(
        uint256 _typeId,
        string calldata _name
    ) public view returns (bool) {
        return getTraitValueIdByName(_typeId, _name) != 0;
    }

    function isContainTraitValueOfType(
        uint256 _typeId,
        uint256 _valueId
    ) public view returns (bool) {
        return traitValueOfType[_typeId].contains(_valueId);
    }

    function isContainTraitValueOfTypeBatch(
        uint256 _typeId,
        uint256[] calldata _valueIds
    ) external view returns (bool) {
        for (uint256 i = 0; i < _valueIds.length; i = i.increment()) {
            if (!traitValueOfType[_typeId].contains(_valueIds[i])) return false;
        }

        return true;
    }

    function getTraitValueIdByName(
        uint256 _typeId,
        string calldata _name
    ) public view returns (uint256) {
        bytes32 name = keccak256(bytes(_name));
        return valueIdByName[_typeId][name];
    }

    function getTraitValueById(
        uint256 _valueId
    ) external view returns (TraitValue memory) {
        if (!isExistTraitValueById(_valueId)) revert InvalidTraitValueId();

        return traitValues[_valueId];
    }

    function getTraitValueIdOfType(
        uint256 _typeId
    ) public view returns (uint256[] memory) {
        if (!isExistTraitTypeById(_typeId)) revert InvalidTraitTypeId();

        return traitValueOfType[_typeId].values();
    }

    function getTraitValueOfType(
        uint256 _typeId
    ) external view returns (TraitValue[] memory) {
        uint256[] memory valueIds = getTraitValueIdOfType(_typeId);

        TraitValue[] memory traitValues = new TraitValue[](valueIds.length);

        for (uint256 i = 0; i < valueIds.length; i = i.increment()) {
            traitValues[i] = traitValues[valueIds[i]];
        }

        return traitValues;
    }

    function getCollectionLengthOfTraitValue(
        uint256 _typeId
    ) public view returns (uint256) {
        if (!isExistTraitValueById(_typeId)) revert InvalidTraitValueId();

        return collectionOfTraitValue[_typeId].length();
    }

    function getCollectionIdOfTraitValue(
        uint256 _typeId
    ) external view returns (uint256[] memory) {
        if (!isExistTraitValueById(_typeId)) revert InvalidTraitValueId();

        return collectionOfTraitValue[_typeId].values();
    }
}
