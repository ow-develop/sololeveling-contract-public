// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import {Unsafe} from "../../utils/Unsafe.sol";

import {Upgrade} from "./Upgrade.sol";
import {ISLMT} from "../../collections/ISLMT.sol";

abstract contract Arise is Upgrade {
    using Unsafe for uint256;

    /*
     *  Arise
     */
    function ariseMonster(
        RankType _nextMonsterRank, // B, A, S
        uint256 _monsterId,
        uint256 _requestAmount,
        bytes[] calldata _monsterSignatures
    ) external {
        if (_requestAmount == 0) revert InvalidArgument();

        if (_nextMonsterRank < RankType.B) revert InvalidRankType();

        if (_monsterSignatures.length != _requestAmount)
            revert InvalidMonsterSignature();

        address hunter = _msgSender();

        if (_nextMonsterRank == RankType.B) {
            if (
                !monsterFactoryContract.isValidMonster(
                    RankType.S,
                    false,
                    _monsterId
                )
            ) revert InvalidMonster();
        } else {
            if (
                !monsterFactoryContract.isValidMonster(
                    RankType(uint256(_nextMonsterRank) - 1),
                    true,
                    _monsterId
                )
            ) revert InvalidMonster();
        }

        uint256 requiredStoneAmount = requiredStoneForArise[_nextMonsterRank] *
            _requestAmount;

        ISLMT essenceStone = ISLMT(
            projectContract.getTokenContractByCollectionId(
                essenceStoneCollectionId
            )
        );

        if (
            essenceStone.balanceOf(hunter, ESSENCE_STONE_TOKEN_ID) <
            requiredStoneAmount
        ) revert DoesNotEnoughStoneBalance();

        (
            bool isSuccess,
            uint256 count,
            uint256 nextMonsterId
        ) = _getAroseMonster(
                hunter,
                _nextMonsterRank,
                _monsterId,
                _monsterSignatures
            );

        if (isSuccess) {
            ISLMT shadowMonster = ISLMT(
                projectContract.getTokenContractByCollectionId(
                    shadowMonsterCollectionId
                )
            );

            if (_nextMonsterRank == RankType.B) {
                ISLMT normalMonster = ISLMT(
                    projectContract.getTokenContractByCollectionId(
                        normalMonsterCollectionId
                    )
                );

                normalMonster.burn(hunter, _monsterId, 1);
            } else {
                shadowMonster.burn(hunter, _monsterId, 1);
            }

            shadowMonster.mint(hunter, nextMonsterId, 1);
        }

        uint256 usedStone = requiredStoneForArise[_nextMonsterRank] * count;
        essenceStone.burn(hunter, ESSENCE_STONE_TOKEN_ID, usedStone);

        hunterAriseCount[hunter][_nextMonsterRank] += count;
        ariseCount[_nextMonsterRank] += count;

        emit MonsterArose({
            hunter: hunter,
            nextMonsterRank: _nextMonsterRank,
            monsterId: _monsterId,
            requestAmount: _requestAmount,
            aroseCount: count,
            usedStone: usedStone,
            isSuccess: isSuccess,
            nextMonsterId: nextMonsterId,
            timestamp: block.timestamp
        });
    }

    function _getAroseMonster(
        address _hunter,
        RankType _nextMonsterRank,
        uint256 _monsterId,
        bytes[] calldata _monsterSignatures
    ) private returns (bool isSuccess, uint256 count, uint256 nextMonsterId) {
        uint256 requestAmount = _monsterSignatures.length;

        nextMonsterId = monsterFactoryContract.getAriseNextMonster(
            _nextMonsterRank,
            _monsterId
        );

        for (uint256 i = 0; i < requestAmount; i = i.increment()) {
            _verifyRandomSignature(_hunter, _monsterSignatures[i]);

            count = i + 1;

            uint256 numberForArise = (uint256(
                keccak256(_monsterSignatures[i])
            ) % DENOMINATOR) + 1;

            if (numberForArise <= percentageForArise[_nextMonsterRank]) {
                isSuccess = true;
                break;
            }
        }
    }

    /*
     *  Base
     */
    function setRequiredStoneForArise(
        uint256[3] calldata _requiredStones // B - S
    ) external onlyOperator {
        uint256 startRankType = uint256(RankType.B);

        for (uint256 i = 0; i < _requiredStones.length; i = i.increment()) {
            requiredStoneForArise[
                RankType(startRankType + i)
            ] = _requiredStones[i];
        }
    }

    function setPercentageForArise(
        uint256[3] calldata _percentages
    ) external onlyOperator {
        uint256 startRankType = uint256(RankType.B);

        for (uint256 i = 0; i < _percentages.length; i = i.increment()) {
            uint256 percentage = _percentages[i];

            if (percentage > DENOMINATOR) revert InvalidPercentage();

            percentageForArise[RankType(startRankType + i)] = percentage;
        }
    }

    /*
     *  View
     */
    function getRequiredStoneForArise()
        external
        view
        returns (uint256[3] memory)
    {
        uint256[3] memory requiredStones;

        uint256 startRankType = uint256(RankType.B);

        for (uint256 i = 0; i < 3; i = i.increment()) {
            requiredStones[i] = requiredStoneForArise[
                RankType(startRankType + i)
            ];
        }

        return requiredStones;
    }

    function getPercentageForArise() external view returns (uint256[3] memory) {
        uint256[3] memory percentages;

        uint256 startRankType = uint256(RankType.B);

        for (uint256 i = 0; i < 3; i = i.increment()) {
            percentages[i] = percentageForArise[RankType(startRankType + i)];
        }

        return percentages;
    }

    function getHunterAriseCount(
        address _hunter,
        RankType _monsterRank
    ) external view returns (uint256) {
        if (_monsterRank < RankType.B) revert InvalidRankType();

        return hunterAriseCount[_hunter][_monsterRank];
    }
}
