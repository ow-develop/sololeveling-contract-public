// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import {SeasonSettlementBase} from "./SeasonSettlementBase.sol";
import {ISLSeason} from "../season/ISLSeason.sol";
import {ISLSeasonQuest} from "../seasonQuest/ISLSeasonQuest.sol";
import {ISLDungeonGate} from "../dungeonGate/ISLDungeonGate.sol";

interface ISLSeasonSettlement {
    /*
     *  Score
     */
    function getCurrentSeasonScore(
        uint256 _seasonId,
        address _hunter
    )
        external
        view
        returns (SeasonSettlementBase.SeasonScore memory seasonScore);

    function getCurrentSeasonScoreBatch(
        uint256 _seasonId,
        address[] calldata _hunters
    )
        external
        view
        returns (SeasonSettlementBase.SeasonScore[] memory seasonScores);

    function getEndedSeasonScore(
        uint256 _seasonId,
        address _hunter
    )
        external
        view
        returns (SeasonSettlementBase.SeasonScore memory seasonScore);

    function getEndedSeasonScoreBatch(
        uint256 _seasonId,
        address[] calldata _hunters
    )
        external
        view
        returns (SeasonSettlementBase.SeasonScore[] memory seasonScores);

    /*
     *  Score Base
     */
    function setScoreRate(
        uint32 _questRate,
        uint32 _activityRate,
        uint32 _collectingRate
    ) external;

    function setScorePerGate(uint256 _scorePerGate) external;

    function getScoreRate()
        external
        view
        returns (SeasonSettlementBase.ScoreRate memory);

    function getScorePerGate() external view returns (uint256);

    /*
     *  Reward
     */
    function claimSeasonReward(uint256 _seasonId) external;

    function isSeasonRewardClaimed(
        uint256 _seasonId,
        address _hunter
    ) external view returns (bool);

    /*
     *  Collection
     */
    function setSRankRewardCollectionId(
        uint256 _SRankRewardCollectionId
    ) external;

    function setSeasonScoreCollectionId(
        uint256 _seasonScoreCollectionId
    ) external;

    function getSRankRewardCollectionId() external view returns (uint256);

    function getSeasonScoreCollectionId() external view returns (uint256);

    /*
     *  Base
     */
    function setSeasonContract(ISLSeason _seasonContract) external;

    function setSeasonQuestContract(
        ISLSeasonQuest _seasonQuestContract
    ) external;

    function setDungeonGateContract(
        ISLDungeonGate _dungeonGateContract
    ) external;

    function getSeasonContract() external view returns (address);

    function getSeasonQuestContract() external view returns (address);

    function getDungeonGateContract() external view returns (address);

    function getDenominator() external pure returns (uint256);
}
