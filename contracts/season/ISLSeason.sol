// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import {BaseStorage} from "../core/BaseStorage.sol";
import {SeasonBase} from "./SeasonBase.sol";

interface ISLSeason {
    /*
     *  Season
     */
    function addSeason(
        uint256 _hunterRankCollectionId,
        uint256 _seasonPackCollectionId,
        uint256 _startBlock,
        uint256 _endBlock,
        uint256[] calldata _seasonCollectionIds
    ) external;

    function setSeasonCollection(
        uint256 _seasonId,
        uint256 _hunterRankCollectionId,
        uint256 _seasonPackCollectionId,
        uint256[] calldata _seasonCollectionIds
    ) external;

    function setSeasonBlock(
        uint256 _seasonId,
        uint256 _startBlock,
        uint256 _endBlock
    ) external;

    function isExistSeasonById(uint256 _seasonId) external view returns (bool);

    function isCurrentSeasonById(
        uint256 _seasonId
    ) external view returns (bool);

    function isEndedSeasonById(uint256 _seasonId) external view returns (bool);

    function isStartSeasonById(uint256 _seasonId) external view returns (bool);

    function getSeasonById(
        uint256 _seasonId
    ) external view returns (SeasonBase.Season memory);

    function getSeasonPackCollectionId(
        uint256 _seasonId
    ) external view returns (uint256);

    function getSeasonCollection(
        uint256 _seasonId
    ) external view returns (uint256[] memory);

    function getSeasonLength() external view returns (uint256);

    /*
     *  HunterRank
     */
    function getHunterRankTokenBalance(
        uint256 _seasonId,
        address _hunter
    ) external view returns (uint256[] memory);

    function getHunterRank(
        uint256 _seasonId,
        address _hunter
    ) external view returns (BaseStorage.RankType);
}
