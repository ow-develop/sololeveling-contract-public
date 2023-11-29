// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import {Score} from "./Score.sol";
import {ISLMT} from "../../collections/ISLMT.sol";

abstract contract Reward is Score {
    /*
     *  Reward
     */
    function claimSeasonReward(uint256 _seasonId) external {
        address hunter = _msgSender();

        if (isSeasonRewardClaimed(_seasonId, hunter)) revert AlreadyClaimed();

        rewardClaimed[_seasonId][hunter] = true;

        SeasonScore memory seasonScore = getEndedSeasonScore(_seasonId, hunter);
        RankType hunterRank = seasonContract.getHunterRank(_seasonId, hunter);

        bool isSRankRewardTokenMinted;
        uint256 SRankRewardTokenId;

        if (hunterRank == RankType.S && SRankRewardCollectionId != 0) {
            ISLMT rewardCollection = ISLMT(
                projectContract.getTokenContractByCollectionId(
                    SRankRewardCollectionId
                )
            );

            isSRankRewardTokenMinted = true;
            SRankRewardTokenId = _seasonId;
            rewardCollection.mint(hunter, _seasonId, 1);
        }

        uint256 mintedSeasonScore;

        if (seasonScore.seasonScore > 0 && seasonScoreCollectionId != 0) {
            ISLMT seasonScoreCollection = ISLMT(
                projectContract.getTokenContractByCollectionId(
                    seasonScoreCollectionId
                )
            );

            seasonScoreCollection.mint(
                hunter,
                _seasonId,
                seasonScore.seasonScore
            );
            mintedSeasonScore = seasonScore.seasonScore;
        }

        emit SeasonRewardClaimed(
            _seasonId,
            hunter,
            mintedSeasonScore,
            isSRankRewardTokenMinted,
            SRankRewardTokenId,
            block.timestamp
        );
    }

    function isSeasonRewardClaimed(
        uint256 _seasonId,
        address _hunter
    ) public view returns (bool) {
        return rewardClaimed[_seasonId][_hunter];
    }
}
