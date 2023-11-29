// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import {BaseStorage} from "../core/BaseStorage.sol";
import {CollectionTraitBase} from "./CollectionTraitBase.sol";

interface ISLCollectionTrait {
    /*
     *  TraitType
     */
    function addTraitType(string calldata _name) external;

    function setTraitTypeName(uint256 _typeId, string calldata _name) external;

    function setTraitTypeActive(uint256 _typeId, bool _isActive) external;

    /*
     *  TraitType View
     */
    function isExistTraitTypeById(uint256 _typeId) external view returns (bool);

    function isActiveTraitType(uint256 _typeId) external view returns (bool);

    function isExistTraitTypeByName(
        string calldata _name
    ) external view returns (bool);

    function getTraitTypeIdByName(
        string calldata _name
    ) external view returns (uint256);

    function getTraitTypeById(
        uint256 _typeId
    ) external view returns (CollectionTraitBase.TraitType memory);

    function getTraitTypeLength() external view returns (uint256);

    /*
     *  TraitValue
     */
    function addTraitValue(uint256 _typeId, string calldata _name) external;

    function removeTraitValue(uint256 _valueId) external;

    /*
     *  TraitValue View
     */
    function isExistTraitValueById(
        uint256 _valueId
    ) external view returns (bool);

    function isExistTraitValueByName(
        uint256 _typeId,
        string calldata _name
    ) external view returns (bool);

    function isContainTraitValueOfType(
        uint256 _typeId,
        uint256 _valueId
    ) external view returns (bool);

    function isContainTraitValueOfTypeBatch(
        uint256 _typeId,
        uint256[] calldata _valueIds
    ) external view returns (bool);

    function getTraitValueIdByName(
        uint256 _typeId,
        string calldata _name
    ) external view returns (uint256);

    function getTraitValueById(
        uint256 _valueId
    ) external view returns (CollectionTraitBase.TraitValue memory);

    function getTraitValueIdOfType(
        uint256 _typeId
    ) external view returns (uint256[] memory);

    function getTraitValueOfType(
        uint256 _typeId
    ) external view returns (CollectionTraitBase.TraitValue[] memory);

    /*
     *  Trait Token
     */
    function addTokenOfTrait(
        uint256 _typeId,
        uint256 _valueId,
        uint256 _collectionId,
        uint256[] calldata _tokenIds
    ) external;

    function removeTokenOfTrait(
        uint256 _valueId,
        uint256 _collectionId,
        uint256[] calldata _tokenIds
    ) external;

    /*
     *  Trait Token View
     */
    function isContainTokenOfTraitType(
        uint256 _typeId,
        uint256 _collectionId,
        uint256 _tokenId
    ) external view returns (bool);

    function isContainTokenOfTraitTypeBatch(
        uint256 _typeId,
        uint256 _collectionId,
        uint256[] calldata _tokenIds
    ) external view returns (bool);

    function isContainTokenOfTraitValue(
        uint256 _valueId,
        uint256 _collectionId,
        uint256 _tokenId
    ) external view returns (bool);

    function isContainTokenOfTraitValueBatch(
        uint256 _valueId,
        uint256 _collectionId,
        uint256[] calldata _tokenIds
    ) external view returns (bool);

    function getTokenLengthOfTraitType(
        uint256 _typeId,
        uint256 _collectionId
    ) external view returns (uint256);

    function getTokenLengthOfTraitValue(
        uint256 _valueId,
        uint256 _collectionId
    ) external view returns (uint256);

    function getTokenIdOfTraitType(
        uint256 _typeId,
        uint256 _collectionId
    ) external view returns (uint256[] memory);

    function getTokenIdOfTraitValue(
        uint256 _valueId,
        uint256 _collectionId
    ) external view returns (uint256[] memory);
}
