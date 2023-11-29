// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import {Unsafe} from "../../utils/Unsafe.sol";

import {ISLSeasonSettlement} from "../ISLSeasonSettlement.sol";
import {SeasonSettlementBase} from "../SeasonSettlementBase.sol";
import {ISLCollectable} from "../../collections/ISLCollectable.sol";
import {SeasonBase} from "../../season/SeasonBase.sol";

abstract contract Score is ISLSeasonSettlement, SeasonSettlementBase {
    using Unsafe for uint256;

    /*
     *  Score
     */
    function getCurrentSeasonScore(
        uint256 _seasonId,
        address _hunter
    ) external view returns (SeasonScore memory seasonScore) {
        if (!seasonContract.isCurrentSeasonById(_seasonId))
            revert InvalidSeasonId();

        uint256 questScore = _getHunterQuestScore(_seasonId, _hunter);
        uint256 activityScore = _getActivityScore(_seasonId, _hunter);
        uint256 collectingScore = _getLatestCollectingScore(_seasonId, _hunter);

        uint256 convertedQuestScore = _calculateQuestScore(questScore);
        uint256 convertedActivityScore = _calculateActivityScore(activityScore);
        uint256 convertedCollectingScore = _calculateCollectingScore(
            collectingScore
        );

        seasonScore = SeasonScore({
            questScore: questScore,
            convertedQuestScore: convertedQuestScore,
            activityScore: activityScore,
            convertedActivityScore: convertedActivityScore,
            collectingScore: collectingScore,
            convertedCollectingScore: convertedCollectingScore,
            seasonScore: convertedQuestScore +
                convertedActivityScore +
                convertedCollectingScore
        });
    }

    function getCurrentSeasonScoreBatch(
        uint256 _seasonId,
        address[] calldata _hunters
    ) external view returns (SeasonScore[] memory seasonScores) {
        if (!seasonContract.isCurrentSeasonById(_seasonId))
            revert InvalidSeasonId();

        uint256 hunterCount = _hunters.length;

        uint256[] memory questScores = _getHunterQuestScoreBatch(
            _seasonId,
            _hunters
        );
        uint256[] memory activityScores = _getActivityScoreBatch(
            _seasonId,
            _hunters
        );
        uint256[] memory collectingScores = _getLatestCollectingScoreBatch(
            _seasonId,
            _hunters
        );

        seasonScores = new SeasonScore[](hunterCount);

        for (uint256 i = 0; i < hunterCount; i = i.increment()) {
            uint256 questScore = questScores[i];
            uint256 activityScore = activityScores[i];
            uint256 collectingScore = collectingScores[i];

            uint256 convertedQuestScore = _calculateQuestScore(questScore);
            uint256 convertedActivityScore = _calculateActivityScore(
                activityScore
            );
            uint256 convertedCollectingScore = _calculateCollectingScore(
                collectingScore
            );

            seasonScores[i] = SeasonScore({
                questScore: questScore,
                convertedQuestScore: convertedQuestScore,
                activityScore: activityScore,
                convertedActivityScore: convertedActivityScore,
                collectingScore: collectingScore,
                convertedCollectingScore: convertedCollectingScore,
                seasonScore: convertedQuestScore +
                    convertedActivityScore +
                    convertedCollectingScore
            });
        }
    }

    function getEndedSeasonScore(
        uint256 _seasonId,
        address _hunter
    ) public view returns (SeasonScore memory seasonScore) {
        if (!seasonContract.isEndedSeasonById(_seasonId))
            revert InvalidSeasonId();

        uint256 questScore = _getHunterQuestScore(_seasonId, _hunter);
        uint256 activityScore = _getActivityScore(_seasonId, _hunter);
        uint256 collectingScore = _getCollectingScoreAtEnded(
            _seasonId,
            _hunter
        );

        uint256 convertedQuestScore = _calculateQuestScore(questScore);
        uint256 convertedActivityScore = _calculateActivityScore(activityScore);
        uint256 convertedCollectingScore = _calculateCollectingScore(
            collectingScore
        );

        seasonScore = SeasonScore({
            questScore: questScore,
            convertedQuestScore: convertedQuestScore,
            activityScore: activityScore,
            convertedActivityScore: convertedActivityScore,
            collectingScore: collectingScore,
            convertedCollectingScore: convertedCollectingScore,
            seasonScore: convertedQuestScore +
                convertedActivityScore +
                convertedCollectingScore
        });
    }

    function getEndedSeasonScoreBatch(
        uint256 _seasonId,
        address[] calldata _hunters
    ) external view returns (SeasonScore[] memory seasonScores) {
        if (!seasonContract.isEndedSeasonById(_seasonId))
            revert InvalidSeasonId();

        uint256 hunterCount = _hunters.length;

        uint256[] memory questScores = _getHunterQuestScoreBatch(
            _seasonId,
            _hunters
        );
        uint256[] memory activityScores = _getActivityScoreBatch(
            _seasonId,
            _hunters
        );
        uint256[] memory collectingScores = _getCollectionScoreAtEndedBatch(
            _seasonId,
            _hunters
        );

        seasonScores = new SeasonScore[](hunterCount);

        for (uint256 i = 0; i < hunterCount; i = i.increment()) {
            uint256 questScore = questScores[i];
            uint256 activityScore = activityScores[i];
            uint256 collectingScore = collectingScores[i];

            uint256 convertedQuestScore = _calculateQuestScore(questScore);
            uint256 convertedActivityScore = _calculateActivityScore(
                activityScore
            );
            uint256 convertedCollectingScore = _calculateCollectingScore(
                collectingScore
            );

            seasonScores[i] = SeasonScore({
                questScore: questScore,
                convertedQuestScore: convertedQuestScore,
                activityScore: activityScore,
                convertedActivityScore: convertedActivityScore,
                collectingScore: collectingScore,
                convertedCollectingScore: convertedCollectingScore,
                seasonScore: convertedQuestScore +
                    convertedActivityScore +
                    convertedCollectingScore
            });
        }
    }

    function _getHunterQuestScore(
        uint256 _seasonId,
        address _hunter
    ) private view returns (uint256) {
        if (address(seasonQuestContract) == address(0)) {
            return 0;
        }

        return seasonQuestContract.getHunterQuestScore(_seasonId, _hunter);
    }

    function _getHunterQuestScoreBatch(
        uint256 _seasonId,
        address[] calldata _hunters
    ) private view returns (uint256[] memory) {
        if (address(seasonQuestContract) == address(0)) {
            return new uint256[](_hunters.length);
        }

        return
            seasonQuestContract.getHunterQuestScoreBatch(_seasonId, _hunters);
    }

    function _getActivityScore(
        uint256 _seasonId,
        address _hunter
    ) private view returns (uint256) {
        if (address(dungeonGateContract) == address(0)) {
            return 0;
        }

        uint256 gateCount = dungeonGateContract.getGateCountOfSeason(
            _seasonId,
            _hunter
        );
        return gateCount * scorePerGate;
    }

    function _getActivityScoreBatch(
        uint256 _seasonId,
        address[] calldata _hunters
    ) private view returns (uint256[] memory) {
        uint256 hunterCount = _hunters.length;

        if (address(dungeonGateContract) == address(0)) {
            return new uint256[](hunterCount);
        }

        uint256[] memory gateCounts = dungeonGateContract
            .getGateCountOfSeasonBatch(_seasonId, _hunters);

        uint256[] memory activityScores = new uint256[](hunterCount);

        for (uint256 i = 0; i < hunterCount; i = i.increment()) {
            activityScores[i] = gateCounts[i] * scorePerGate;
        }

        return activityScores;
    }

    function _getLatestCollectingScore(
        uint256 _seasonId,
        address _hunter
    ) private view returns (uint256) {
        uint256 collectingScore;

        uint256[] memory seasonCollectionIds = seasonContract
            .getSeasonCollection(_seasonId);

        for (uint256 i = 0; i < seasonCollectionIds.length; i = i.increment()) {
            uint256 collectionId = seasonCollectionIds[i];
            ISLCollectable collection = ISLCollectable(
                projectContract.getTokenContractByCollectionId(collectionId)
            );

            collectingScore += collection.getLatestCollectingScore(_hunter);
        }

        return collectingScore;
    }

    function _getLatestCollectingScoreBatch(
        uint256 _seasonId,
        address[] calldata _hunters
    ) private view returns (uint256[] memory) {
        uint256 hunterCount = _hunters.length;

        uint256[] memory results = new uint256[](hunterCount);

        uint256[] memory seasonCollectionIds = seasonContract
            .getSeasonCollection(_seasonId);

        for (uint256 i = 0; i < seasonCollectionIds.length; i = i.increment()) {
            uint256 collectionId = seasonCollectionIds[i];
            ISLCollectable collection = ISLCollectable(
                projectContract.getTokenContractByCollectionId(collectionId)
            );

            uint256[] memory collectingScores = collection
                .getLatestCollectingScoreBatch(_hunters);

            for (uint256 j = 0; j < hunterCount; j = j.increment()) {
                results[j] += collectingScores[j];
            }
        }

        return results;
    }

    function _getCollectingScoreAtEnded(
        uint256 _seasonId,
        address _hunter
    ) private view returns (uint256) {
        uint256 collectingScore;
        SeasonBase.Season memory season = seasonContract.getSeasonById(
            _seasonId
        );
        uint256 blockNumber = season.endBlock;
        uint256[] memory seasonCollectionIds = season.seasonCollectionIds;
        for (uint256 i = 0; i < seasonCollectionIds.length; i = i.increment()) {
            uint256 collectionId = seasonCollectionIds[i];
            ISLCollectable collection = ISLCollectable(
                projectContract.getTokenContractByCollectionId(collectionId)
            );

            collectingScore += collection.getCollectingScoreAtBlock(
                _hunter,
                blockNumber
            );
        }

        return collectingScore;
    }

    function _getCollectionScoreAtEndedBatch(
        uint256 _seasonId,
        address[] calldata _hunters
    ) private view returns (uint256[] memory) {
        uint256 hunterCount = _hunters.length;

        uint256[] memory results = new uint256[](hunterCount);

        SeasonBase.Season memory season = seasonContract.getSeasonById(
            _seasonId
        );
        uint256 blockNumber = season.endBlock;
        uint256[] memory seasonCollectionIds = season.seasonCollectionIds;

        for (uint256 i = 0; i < seasonCollectionIds.length; i = i.increment()) {
            uint256 collectionId = seasonCollectionIds[i];

            ISLCollectable collection = ISLCollectable(
                projectContract.getTokenContractByCollectionId(collectionId)
            );

            uint256[] memory collectingScores = collection
                .getCollectingScoreAtBlockBatch(
                    _hunters,
                    _asUintArray(blockNumber, hunterCount)
                );

            for (uint256 j = 0; j < hunterCount; j = j.increment()) {
                results[j] += collectingScores[j];
            }
        }

        return results;
    }

    function _calculateQuestScore(
        uint256 _questScore
    ) private view returns (uint256) {
        return (_questScore * scoreRate.quest) / DENOMINATOR;
    }

    function _calculateActivityScore(
        uint256 _activityScore
    ) private view returns (uint256) {
        return (_activityScore * scoreRate.activity) / DENOMINATOR;
    }

    function _calculateCollectingScore(
        uint256 _collectingScore
    ) private view returns (uint256) {
        return (_collectingScore * scoreRate.collecting) / DENOMINATOR;
    }

    function _asUintArray(
        uint256 _element,
        uint256 _length
    ) private pure returns (uint256[] memory) {
        uint256[] memory array = new uint256[](_length);

        for (uint256 i = 0; i < _length; i = i.increment()) {
            array[i] = _element;
        }

        return array;
    }

    /*
     *  Base
     */
    function setScoreRate(
        uint32 _questRate,
        uint32 _activityRate,
        uint32 _collectingRate
    ) external onlyOperator {
        if (_questRate + _activityRate + _collectingRate != DENOMINATOR)
            revert InvalidRate();

        scoreRate.quest = _questRate;
        scoreRate.activity = _activityRate;
        scoreRate.collecting = _collectingRate;

        emit SetScoreRate(
            _questRate,
            _activityRate,
            _collectingRate,
            block.timestamp
        );
    }

    function setScorePerGate(uint256 _scorePerGate) external onlyOperator {
        scorePerGate = _scorePerGate;
    }

    function getScoreRate() external view returns (ScoreRate memory) {
        return scoreRate;
    }

    function getScorePerGate() external view returns (uint256) {
        return scorePerGate;
    }
}
