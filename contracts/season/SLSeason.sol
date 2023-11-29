// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import {UUPSUpgradeable} from "../utils/UUPSUpgradeable.sol";

import {RankUp} from "./parts/RankUp.sol";
import {ISLProject} from "../project/ISLProject.sol";
import {ISLMonsterFactory} from "../monsterFactory/ISLMonsterFactory.sol";

contract SLSeason is RankUp, UUPSUpgradeable {
    function initialize(
        ISLProject _projectContract,
        ISLMonsterFactory _monsterFactoryContract,
        uint256 _normalMonsterCollectionId,
        uint256 _shadowMonsterCollectionId
    ) public initializer {
        __SLCotroller_init(_projectContract);
        __requiredNormalMonsterForRankUp_init();

        monsterFactoryContract = _monsterFactoryContract;

        normalMonsterCollectionId = _normalMonsterCollectionId;
        shadowMonsterCollectionId = _shadowMonsterCollectionId;
    }

    function _authorizeUpgrade(address) internal override onlyOperatorMaster {}

    function __requiredNormalMonsterForRankUp_init() private {
        // normal monster
        requiredNormalMonsterForRankUp[RankType.E] = 10;
        requiredNormalMonsterForRankUp[RankType.D] = 10;
        requiredNormalMonsterForRankUp[RankType.C] = 10;
        requiredNormalMonsterForRankUp[RankType.B] = 10;
        requiredNormalMonsterForRankUp[RankType.A] = 10;

        // shadow monster
        requiredShadowMonsterForRankUp[RankType.B] = 1;
        requiredShadowMonsterForRankUp[RankType.A] = 1;
    }

    /*
     *  Collection
     */
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

    function getMonsterFactoryContract() external view returns (address) {
        return address(monsterFactoryContract);
    }
}
