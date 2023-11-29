// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import {UUPSUpgradeable} from "../utils/UUPSUpgradeable.sol";

import {Confirm} from "./parts/Confirm.sol";
import {ISLProject} from "../project/ISLProject.sol";
import {ISLMonsterFactory} from "../monsterFactory/ISLMonsterFactory.sol";
import {ISLCollectionTrait} from "../collectionTrait/ISLCollectionTrait.sol";
import {ISLSeason} from "../season/ISLSeason.sol";

contract SLSeasonQuest is Confirm, UUPSUpgradeable {
    function initialize(
        ISLProject _projectContract,
        ISLMonsterFactory _monsterFactoryContract,
        ISLCollectionTrait _collectionTraitContract,
        ISLSeason _seasonContract,
        uint256 _hunterItemCollectionId,
        uint256 _normalMonsterCollectionId,
        uint256 _shadowMonsterCollectionId
    ) public initializer {
        __SLCotroller_init(_projectContract);

        monsterFactoryContract = _monsterFactoryContract;
        collectionTraitContract = _collectionTraitContract;
        seasonContract = _seasonContract;

        hunterItemCollectionId = _hunterItemCollectionId;
        normalMonsterCollectionId = _normalMonsterCollectionId;
        shadowMonsterCollectionId = _shadowMonsterCollectionId;
    }

    function _authorizeUpgrade(address) internal override onlyOperatorMaster {}

    /*
     *  Collection
     */
    function setHunterItemCollectionId(
        uint256 _hunterItemCollectionId
    ) external onlyOperator {
        if (!projectContract.isActiveCollection(_hunterItemCollectionId))
            revert InvalidCollectionId();

        TokenType tokenType = projectContract.getCollectionTypeByCollectionId(
            _hunterItemCollectionId
        );

        if (tokenType != TokenType.ERC1155) revert InvalidCollectionId();

        hunterItemCollectionId = _hunterItemCollectionId;
    }

    function setMonsterCollectionId(
        uint256 _monsterCollectionId,
        bool _isShadow
    ) external onlyOperator {
        if (!projectContract.isActiveCollection(_monsterCollectionId))
            revert InvalidCollectionId();

        TokenType tokenType = projectContract.getCollectionTypeByCollectionId(
            _monsterCollectionId
        );

        if (tokenType != TokenType.ERC1155) revert InvalidCollectionId();

        _isShadow
            ? shadowMonsterCollectionId = _monsterCollectionId
            : normalMonsterCollectionId = _monsterCollectionId;
    }

    function getHunterItemCollectionId() external view returns (uint256) {
        return hunterItemCollectionId;
    }

    function getMonsterCollectionId(
        bool _isShadow
    ) external view returns (uint256) {
        return
            _isShadow ? shadowMonsterCollectionId : normalMonsterCollectionId;
    }

    /*
     *  Base
     */
    function setMonsterFactoryContract(
        ISLMonsterFactory _monsterFactoryContract
    ) external onlyOperator {
        monsterFactoryContract = _monsterFactoryContract;
    }

    function setCollectionTraitContract(
        ISLCollectionTrait _collectionTraitContract
    ) external onlyOperator {
        collectionTraitContract = _collectionTraitContract;
    }

    function setSeasonContract(
        ISLSeason _seasonContract
    ) external onlyOperator {
        seasonContract = _seasonContract;
    }

    function getMonsterFactoryContract() external view returns (address) {
        return address(monsterFactoryContract);
    }

    function getCollectionTraitContract() external view returns (address) {
        return address(collectionTraitContract);
    }

    function getSeasonContract() external view returns (address) {
        return address(seasonContract);
    }
}
