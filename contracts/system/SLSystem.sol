// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import {Unsafe} from "../utils/Unsafe.sol";
import {UUPSUpgradeable} from "../utils/UUPSUpgradeable.sol";

import {Return} from "./parts/Return.sol";
import {ISLProject} from "../project/ISLProject.sol";
import {ISLMonsterFactory} from "../monsterFactory/ISLMonsterFactory.sol";
import {ISLRandom} from "../random/ISLRandom.sol";

contract SLSystem is Return, UUPSUpgradeable {
    using Unsafe for uint256;

    function initialize(
        ISLProject _projectContract,
        ISLMonsterFactory _monsterFactoryContract,
        ISLRandom _randomContract,
        uint256 _essenceStoneCollectionId,
        uint256 _normalMonsterCollectionId,
        uint256 _shadowMonsterCollectionId
    ) public initializer {
        __SLCotroller_init(_projectContract);
        __requiredMonsterForUpgrade_init();
        __requiredStoneForUpgrade_init();
        __requiredStoneForArise_init();
        __prcentageForArise_init();
        __essenceStoneWhenMonsterReturned_init();

        monsterFactoryContract = _monsterFactoryContract;
        randomContract = _randomContract;

        essenceStoneCollectionId = _essenceStoneCollectionId;
        normalMonsterCollectionId = _normalMonsterCollectionId;
        shadowMonsterCollectionId = _shadowMonsterCollectionId;
    }

    function _authorizeUpgrade(address) internal override onlyOperatorMaster {}

    function __requiredMonsterForUpgrade_init() private {
        requiredMonsterForUpgrade[RankType.E] = 2;
        requiredMonsterForUpgrade[RankType.D] = 2;
        requiredMonsterForUpgrade[RankType.C] = 2;
        requiredMonsterForUpgrade[RankType.B] = 2;
        requiredMonsterForUpgrade[RankType.A] = 2;
    }

    function __requiredStoneForUpgrade_init() private {
        requiredStoneForUpgrade[RankType.E] = 10;
        requiredStoneForUpgrade[RankType.D] = 10;
        requiredStoneForUpgrade[RankType.C] = 10;
        requiredStoneForUpgrade[RankType.B] = 10;
        requiredStoneForUpgrade[RankType.A] = 10;
    }

    function __requiredStoneForArise_init() private {
        requiredStoneForArise[RankType.B] = 100;
        requiredStoneForArise[RankType.A] = 100;
        requiredStoneForArise[RankType.S] = 100;
    }

    function __prcentageForArise_init() private {
        percentageForArise[RankType.B] = 10_00000;
        percentageForArise[RankType.A] = 1_50000;
        percentageForArise[RankType.S] = 50000;
    }

    function __essenceStoneWhenMonsterReturned_init() private {
        essenceStoneWhenNormalMonsterReturned[RankType.E] = 5;
        essenceStoneWhenNormalMonsterReturned[RankType.D] = 15;
        essenceStoneWhenNormalMonsterReturned[RankType.C] = 40;
        essenceStoneWhenNormalMonsterReturned[RankType.B] = 90;
        essenceStoneWhenNormalMonsterReturned[RankType.A] = 190;
        essenceStoneWhenNormalMonsterReturned[RankType.S] = 380;

        essenceStoneWhenShadowMonsterReturned[RankType.B] = 1180;
        essenceStoneWhenShadowMonsterReturned[RankType.A] = 6500;
        essenceStoneWhenShadowMonsterReturned[RankType.S] = 22500;
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

    function setEssenceStoneCollectionId(
        uint256 _essenceStoneCollectionId
    ) external onlyOperator {
        if (!projectContract.isActiveCollection(_essenceStoneCollectionId))
            revert InvalidCollectionId();

        TokenType tokenType = projectContract.getCollectionTypeByCollectionId(
            _essenceStoneCollectionId
        );

        if (tokenType != TokenType.ERC1155) revert InvalidCollectionId();

        essenceStoneCollectionId = _essenceStoneCollectionId;
    }

    function getMonsterCollectionId(
        bool _isShadow
    ) external view returns (uint256) {
        return
            _isShadow ? shadowMonsterCollectionId : normalMonsterCollectionId;
    }

    function getEssenceStoneCollectionId() external view returns (uint256) {
        return essenceStoneCollectionId;
    }

    /*
     *  Base
     */
    function setMonsterFactoryContract(
        ISLMonsterFactory _monsterFactoryContract
    ) external onlyOperator {
        monsterFactoryContract = _monsterFactoryContract;
    }

    function setRandomContract(
        ISLRandom _randomContract
    ) external onlyOperator {
        randomContract = _randomContract;
    }

    function getMonsterFactoryContract() external view returns (address) {
        return address(monsterFactoryContract);
    }

    function getRandomContract() external view returns (address) {
        return address(randomContract);
    }

    function getDenominator() external pure returns (uint256) {
        return DENOMINATOR;
    }

    function getSystemCount() external view returns (SystemCount memory) {
        SystemCount memory systemCount;

        for (uint256 i = 0; i < 6; i = i.increment()) {
            systemCount.monsterUpgradeCounts[i] = upgradeCount[RankType(i)];
            systemCount.monsterAriseCounts[i] = ariseCount[RankType(i)];
            systemCount.monsterReturnCounts[i] = returnCount[false][
                RankType(i)
            ];
            systemCount.shadowReturnCounts[i] = returnCount[true][RankType(i)];
        }

        return systemCount;
    }
}
