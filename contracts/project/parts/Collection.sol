// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import {IERC721} from "../../standard/ERC/ERC721/IERC721.sol";
import {IERC1155} from "../../standard/ERC/ERC1155/IERC1155.sol";
import {Unsafe} from "../../utils/Unsafe.sol";
import {CountersUpgradeable} from "../../utils/CountersUpgradeable.sol";
import {EnumerableSetUpgradeable} from "../../utils/EnumerableSetUpgradeable.sol";
import {SafeCastUpgradeable} from "../../utils/SafeCastUpgradeable.sol";
import {ERC165CheckerUpgradeable} from "../../utils/ERC165CheckerUpgradeable.sol";

import {Universe} from "./Universe.sol";

abstract contract Collection is Universe {
    using Unsafe for uint256;
    using CountersUpgradeable for CountersUpgradeable.Counter;
    using EnumerableSetUpgradeable for EnumerableSetUpgradeable.UintSet;
    using SafeCastUpgradeable for uint256;
    using ERC165CheckerUpgradeable for address;

    /*
     *  Universe
     */
    function addCollectionOfUniverse(
        uint256 _universeId,
        uint256 _collectionId
    ) external onlyOperator {
        if (!isExistUniverseById(_universeId)) {
            revert InvalidUniverseId();
        }
        if (!isExistCollectionById(_collectionId)) {
            revert InvalidCollectionId();
        }

        collectionOfUniverse[_universeId].add(_collectionId);
    }

    function removeCollectionOfUniverse(
        uint256 _universeId,
        uint256 _collectionId
    ) external onlyOperator {
        if (!isExistUniverseById(_universeId)) {
            revert InvalidUniverseId();
        }
        if (!isExistCollectionById(_collectionId)) {
            revert InvalidCollectionId();
        }

        collectionOfUniverse[_universeId].remove(_collectionId);
    }

    /*
     *  Collection
     */
    function addCollection(
        address _tokenContract,
        address _creator
    ) external onlyOperator {
        if (isExistTokenContract(_tokenContract)) {
            revert AlreadyExistTokenContract();
        }

        TokenType tokenType;

        if (_tokenContract.supportsInterface(type(IERC721).interfaceId)) {
            tokenType = TokenType.ERC721;
        } else if (
            _tokenContract.supportsInterface(type(IERC1155).interfaceId)
        ) {
            tokenType = TokenType.ERC1155;
        } else {
            revert InvalidTokenContract();
        }

        collectionIds.increment();
        uint64 collectionId = collectionIds.current().toUint64();

        collections[collectionId] = Collection({
            id: collectionId,
            createdTimestamp: block.timestamp.toUint64(),
            isActive: true,
            tokenContract: _tokenContract,
            creator: _creator,
            tokenType: tokenType
        });

        collectionByTokenContract[_tokenContract] = collectionId;

        emitCreate("Collection", collectionId);
    }

    function setCollectionTokenContract(
        uint256 _collectionId,
        address _tokenContract
    ) external onlyOperator {
        if (!isExistCollectionById(_collectionId)) {
            revert InvalidCollectionId();
        }
        if (isExistTokenContract(_tokenContract)) {
            revert AlreadyExistTokenContract();
        }

        TokenType tokenType;

        if (_tokenContract.supportsInterface(type(IERC721).interfaceId)) {
            tokenType = TokenType.ERC721;
        } else if (
            _tokenContract.supportsInterface(type(IERC1155).interfaceId)
        ) {
            tokenType = TokenType.ERC1155;
        } else {
            revert InvalidTokenContract();
        }

        Collection storage collection = collections[_collectionId];
        delete collectionByTokenContract[collection.tokenContract];

        collection.tokenContract = _tokenContract;
        collectionByTokenContract[_tokenContract] = _collectionId;
        collection.tokenType = tokenType;
    }

    function setCollectionCreator(
        uint256 _collectionId,
        address _creator
    ) external onlyOperator {
        if (!isExistCollectionById(_collectionId)) {
            revert InvalidCollectionId();
        }

        Collection storage collection = collections[_collectionId];

        collection.creator = _creator;
    }

    function setCollectionActive(
        uint256 _collectionId,
        bool _isActive
    ) external onlyOperator {
        if (!isExistCollectionById(_collectionId)) {
            revert InvalidCollectionId();
        }

        Collection storage collection = collections[_collectionId];

        collection.isActive = _isActive;
    }

    /*
     *  View
     */
    function getCollectionId() external view returns (uint256) {
        return collectionIds.current();
    }

    function isExistCollectionById(
        uint256 _collectionId
    ) public view returns (bool) {
        return _collectionId != 0 && _collectionId <= collectionIds.current();
    }

    function isExistTokenContract(
        address _tokenContract
    ) public view returns (bool) {
        uint256 collectionId = collectionByTokenContract[_tokenContract];
        return collectionId != 0 ? true : false;
    }

    function isActiveCollection(
        uint256 _collectionId
    ) external view returns (bool) {
        return collections[_collectionId].isActive;
    }

    function getCollectionById(
        uint256 _collectionId
    ) public view returns (Collection memory) {
        if (!isExistCollectionById(_collectionId)) {
            revert InvalidCollectionId();
        }

        return collections[_collectionId];
    }

    function getCollectionIdByToken(
        address _tokenContract
    ) public view returns (uint256) {
        uint256 collectionId = collectionByTokenContract[_tokenContract];

        if (collectionId == 0) {
            revert InvalidTokenContract();
        }

        return collectionId;
    }

    function isContainCollectionOfUniverse(
        uint256 _universeId,
        uint256 _collectionId
    ) external view returns (bool) {
        return collectionOfUniverse[_universeId].contains(_collectionId);
    }

    function getCollectionIdOfUniverse(
        uint256 _universeId,
        bool _activeFilter
    ) external view returns (uint256[] memory) {
        if (!isExistUniverseById(_universeId)) {
            revert InvalidUniverseId();
        }

        uint256[] memory collectionOfUniverse = collectionOfUniverse[
            _universeId
        ].values();

        if (!_activeFilter) {
            return collectionOfUniverse;
        }

        uint256 collectionCount;

        for (
            uint256 i = 0;
            i < collectionOfUniverse.length;
            i = i.increment()
        ) {
            if (collections[collectionOfUniverse[i]].isActive) {
                collectionCount = collectionCount.increment();
            }
        }

        uint256[] memory activeCollectionOfUniverse = new uint256[](
            collectionCount
        );
        uint256 index;

        for (
            uint256 i = 0;
            i < collectionOfUniverse.length;
            i = i.increment()
        ) {
            if (collections[collectionOfUniverse[i]].isActive) {
                activeCollectionOfUniverse[index] = collectionOfUniverse[i];
                index = index.increment();
            }
        }

        return activeCollectionOfUniverse;
    }

    function getCollectionByToken(
        address _tokenContract
    ) external view returns (Collection memory) {
        uint256 collectionId = collectionByTokenContract[_tokenContract];

        if (collectionId == 0) {
            revert InvalidTokenContract();
        }

        return getCollectionById(collectionId);
    }

    function getTokenContractByCollectionId(
        uint256 _collectionId
    ) external view returns (address) {
        if (!isExistCollectionById(_collectionId)) {
            revert InvalidCollectionId();
        }

        return collections[_collectionId].tokenContract;
    }

    function getCollectionTypeByCollectionId(
        uint256 _collectionId
    ) external view returns (TokenType) {
        if (!isExistCollectionById(_collectionId)) {
            revert InvalidCollectionId();
        }

        return collections[_collectionId].tokenType;
    }
}
