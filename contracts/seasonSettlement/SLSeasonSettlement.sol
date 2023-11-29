// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import {UUPSUpgradeable} from "../utils/UUPSUpgradeable.sol";

import {Reward} from "./parts/Reward.sol";
import {ISLProject} from "../project/ISLProject.sol";
import {ISLSeason} from "../season/ISLSeason.sol";
import {ISLSeasonQuest} from "../seasonQuest/ISLSeasonQuest.sol";
import {ISLDungeonGate} from "../dungeonGate/ISLDungeonGate.sol";

contract SLSeasonSettlement is Reward, UUPSUpgradeable {
    function initialize(
        ISLProject _projectContract,
        ISLSeason _seasonContract,
        ISLSeasonQuest _seasonQuestContract,
        ISLDungeonGate _dungeonGateContract,
        uint256 _SRankRewardCollectionId,
        uint256 _seasonScoreCollectionId
    ) public initializer {
        __SLCotroller_init(_projectContract);

        seasonContract = _seasonContract;
        seasonQuestContract = _seasonQuestContract;
        dungeonGateContract = _dungeonGateContract;

        SRankRewardCollectionId = _SRankRewardCollectionId;
        seasonScoreCollectionId = _seasonScoreCollectionId;

        scorePerGate = 100;
        scoreRate = ScoreRate({
            quest: 0,
            activity: 60_00000,
            collecting: 40_00000
        });
    }

    function _authorizeUpgrade(address) internal override onlyOperatorMaster {}

    /*
     *  Collection
     */
    function setSRankRewardCollectionId(
        uint256 _SRankRewardCollectionId
    ) external onlyOperator {
        if (!projectContract.isActiveCollection(_SRankRewardCollectionId))
            revert InvalidCollectionId();

        TokenType tokenType = projectContract.getCollectionTypeByCollectionId(
            _SRankRewardCollectionId
        );

        if (tokenType != TokenType.ERC1155) revert InvalidCollectionId();

        SRankRewardCollectionId = _SRankRewardCollectionId;
    }

    function setSeasonScoreCollectionId(
        uint256 _seasonScoreCollectionId
    ) external onlyOperator {
        if (!projectContract.isActiveCollection(_seasonScoreCollectionId))
            revert InvalidCollectionId();

        TokenType tokenType = projectContract.getCollectionTypeByCollectionId(
            _seasonScoreCollectionId
        );

        if (tokenType != TokenType.ERC1155) revert InvalidCollectionId();

        seasonScoreCollectionId = _seasonScoreCollectionId;
    }

    function getSRankRewardCollectionId() external view returns (uint256) {
        return SRankRewardCollectionId;
    }

    function getSeasonScoreCollectionId() external view returns (uint256) {
        return seasonScoreCollectionId;
    }

    /*
     *  Base
     */
    function setSeasonContract(
        ISLSeason _seasonContract
    ) external onlyOperator {
        seasonContract = _seasonContract;
    }

    function setSeasonQuestContract(
        ISLSeasonQuest _seasonQuestContract
    ) external onlyOperator {
        seasonQuestContract = _seasonQuestContract;
    }

    function setDungeonGateContract(
        ISLDungeonGate _dungeonGateContract
    ) external onlyOperator {
        dungeonGateContract = _dungeonGateContract;
    }

    function getSeasonContract() external view returns (address) {
        return address(seasonContract);
    }

    function getSeasonQuestContract() external view returns (address) {
        return address(seasonQuestContract);
    }

    function getDungeonGateContract() external view returns (address) {
        return address(dungeonGateContract);
    }

    function getDenominator() external pure returns (uint256) {
        return DENOMINATOR;
    }
}
