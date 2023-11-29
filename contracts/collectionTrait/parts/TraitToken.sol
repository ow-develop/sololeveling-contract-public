// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import {Unsafe} from "../../utils/Unsafe.sol";
import {EnumerableSetUpgradeable} from "../../utils/EnumerableSetUpgradeable.sol";

import {Trait} from "./Trait.sol";

abstract contract TraitToken is Trait {
    using Unsafe for uint256;
    using EnumerableSetUpgradeable for EnumerableSetUpgradeable.UintSet;

    /*
     *  Trait Token
     */
    function addTokenOfTrait(
        uint256 _typeId,
        uint256 _valueId,
        uint256 _collectionId,
        uint256[] calldata _tokenIds
    ) external onlyOperator {
        if (!isExistTraitTypeById(_typeId)) revert InvalidTraitTypeId();

        if (!projectContract.isActiveCollection(_collectionId))
            revert InvalidCollectionId();

        if (!isContainTraitValueOfType(_typeId, _valueId))
            revert InvalidTraitValueId();

        for (uint256 i = 0; i < _tokenIds.length; i = i.increment()) {
            if (isContainTokenOfTraitType(_typeId, _collectionId, _tokenIds[i]))
                revert AlreadyExistToken();

            tokenOfTraitType[_typeId][_collectionId].add(_tokenIds[i]);
            tokenOfTraitValue[_valueId][_collectionId].add(_tokenIds[i]);
        }

        collectionOfTraitType[_typeId].add(_collectionId);
        collectionOfTraitValue[_valueId].add(_collectionId);
    }

    function removeTokenOfTrait(
        uint256 _valueId,
        uint256 _collectionId,
        uint256[] calldata _tokenIds
    ) external onlyOperator {
        if (!isExistTraitValueById(_valueId)) revert InvalidTraitValueId();

        uint256 typeId = traitValues[_valueId].typeId;

        for (uint256 i = 0; i < _tokenIds.length; i = i.increment()) {
            tokenOfTraitType[typeId][_collectionId].remove(_tokenIds[i]);
            tokenOfTraitValue[_valueId][_collectionId].remove(_tokenIds[i]);
        }

        if (tokenOfTraitType[typeId][_collectionId].length() == 0) {
            collectionOfTraitType[typeId].remove(_collectionId);
        }

        if (tokenOfTraitValue[_valueId][_collectionId].length() == 0) {
            collectionOfTraitValue[_valueId].remove(_collectionId);
        }
    }

    /*
     *  Trait Token View
     */
    function isContainTokenOfTraitType(
        uint256 _typeId,
        uint256 _collectionId,
        uint256 _tokenId
    ) public view returns (bool) {
        return tokenOfTraitType[_typeId][_collectionId].contains(_tokenId);
    }

    function isContainTokenOfTraitTypeBatch(
        uint256 _typeId,
        uint256 _collectionId,
        uint256[] calldata _tokenIds
    ) external view returns (bool) {
        for (uint256 i = 0; i < _tokenIds.length; i++) {
            if (
                !isContainTokenOfTraitType(_typeId, _collectionId, _tokenIds[i])
            ) return false;
        }

        return true;
    }

    function isContainTokenOfTraitValue(
        uint256 _valueId,
        uint256 _collectionId,
        uint256 _tokenId
    ) public view returns (bool) {
        return tokenOfTraitValue[_valueId][_collectionId].contains(_tokenId);
    }

    function isContainTokenOfTraitValueBatch(
        uint256 _valueId,
        uint256 _collectionId,
        uint256[] calldata _tokenIds
    ) external view returns (bool) {
        for (uint256 i = 0; i < _tokenIds.length; i++) {
            if (
                !isContainTokenOfTraitValue(
                    _valueId,
                    _collectionId,
                    _tokenIds[i]
                )
            ) return false;
        }

        return true;
    }

    function getTokenLengthOfTraitType(
        uint256 _typeId,
        uint256 _collectionId
    ) external view returns (uint256) {
        if (!isExistTraitTypeById(_typeId)) revert InvalidTraitTypeId();

        return tokenOfTraitType[_typeId][_collectionId].length();
    }

    function getTokenLengthOfTraitValue(
        uint256 _valueId,
        uint256 _collectionId
    ) external view returns (uint256) {
        if (!isExistTraitValueById(_valueId)) revert InvalidTraitValueId();

        return tokenOfTraitValue[_valueId][_collectionId].length();
    }

    function getTokenIdOfTraitType(
        uint256 _typeId,
        uint256 _collectionId
    ) external view returns (uint256[] memory) {
        return tokenOfTraitType[_typeId][_collectionId].values();
    }

    function getTokenIdOfTraitValue(
        uint256 _valueId,
        uint256 _collectionId
    ) external view returns (uint256[] memory) {
        return tokenOfTraitValue[_valueId][_collectionId].values();
    }
}
