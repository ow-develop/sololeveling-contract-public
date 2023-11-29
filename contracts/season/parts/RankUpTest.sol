// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import {Unsafe} from "../../utils/Unsafe.sol";
import {CountersUpgradeable} from "../../utils/CountersUpgradeable.sol";
import {EnumerableSetUpgradeable} from "../../utils/EnumerableSetUpgradeable.sol";

import {SeasonTest} from "./SeasonTest.sol";
import {ISLMT} from "../../collections/ISLMT.sol";

abstract contract RankUpTest is SeasonTest {
    using Unsafe for uint256;
    using CountersUpgradeable for CountersUpgradeable.Counter;
    using EnumerableSetUpgradeable for EnumerableSetUpgradeable.UintSet;

    /*
     *  RankUp
     */
    function rankUp(
        uint256 _seasonId,
        RankType _hunterRank,
        uint256[] calldata _monsterIds,
        uint256[] calldata _monsterAmounts,
        bool _isShadow
    ) external {
        if (!isCurrentSeasonById(_seasonId)) revert InvalidSeasonId();

        if (_hunterRank == RankType.S) revert InvalidRankType();

        if (_monsterIds.length != _monsterAmounts.length)
            revert InvalidMonster();

        address hunter = _msgSender();

        ISLMT hunterRankToken = ISLMT(
            projectContract.getTokenContractByCollectionId(
                seasons[_seasonId].hunterRankCollectionId
            )
        );

        RankType nextHunterRank = RankType(uint256(_hunterRank) + 1);

        if (hunterRankToken.balanceOf(hunter, uint256(nextHunterRank)) > 0) {
            revert InvalidRankType();
        }

        if (_hunterRank != RankType.E) {
            if (hunterRankToken.balanceOf(hunter, uint256(_hunterRank)) < 1) {
                revert InvalidRankType();
            }
        }

        if (_hunterRank < RankType.B && _isShadow) revert InvalidRankType();

        uint256 totalAmount;
        for (uint256 i = 0; i < _monsterIds.length; i = i.increment()) {
            totalAmount += _monsterAmounts[i];
        }
        uint256 requiredAmount = _isShadow
            ? requiredShadowMonsterForRankUp[_hunterRank]
            : requiredNormalMonsterForRankUp[_hunterRank];

        if (totalAmount != requiredAmount) revert InvalidMonster();

        ISLMT monsterContract = _isShadow
            ? ISLMT(
                projectContract.getTokenContractByCollectionId(
                    shadowMonsterCollectionId
                )
            )
            : ISLMT(
                projectContract.getTokenContractByCollectionId(
                    normalMonsterCollectionId
                )
            );

        if (
            !monsterFactoryContract.isValidMonsterBatch(
                _hunterRank,
                _isShadow,
                _monsterIds
            )
        ) {
            revert InvalidMonster();
        }

        monsterContract.burnBatch(hunter, _monsterIds, _monsterAmounts);
        hunterRankToken.mint(hunter, uint256(nextHunterRank), 1);

        emit HunterRankUp(_seasonId, hunter, nextHunterRank, block.timestamp);
    }

    function setRequiredMonsterForRankUp(
        uint256[5] calldata _requiredNormalMonsters,
        uint256[2] calldata _requiredShadowMonsters
    ) external onlyOperator {
        for (
            uint256 i = 0;
            i < _requiredNormalMonsters.length;
            i = i.increment()
        ) {
            requiredNormalMonsterForRankUp[
                RankType(i)
            ] = _requiredNormalMonsters[i];
        }

        uint256 startRankType = uint256(RankType.B);

        for (
            uint256 i = 0;
            i < _requiredShadowMonsters.length;
            i = i.increment()
        ) {
            requiredShadowMonsterForRankUp[
                RankType(startRankType + i)
            ] = _requiredShadowMonsters[i];
        }
    }

    function getRequiredMonsterForRankUp()
        external
        view
        returns (
            uint256[5] memory requiredNormalMonsters,
            uint256[2] memory requiredShadowMonsters
        )
    {
        for (uint256 i = 0; i < 5; i = i.increment()) {
            requiredNormalMonsters[i] = requiredNormalMonsterForRankUp[
                RankType(i)
            ];
        }

        uint256 startRankType = uint256(RankType.B);

        for (uint256 i = 0; i < 2; i = i.increment()) {
            requiredShadowMonsters[i] = requiredShadowMonsterForRankUp[
                RankType(startRankType + i)
            ];
        }
    }

    function getHunterRankTokenBalance(
        uint256 _seasonId,
        address _hunter
    ) public view returns (uint256[] memory) {
        if (!isExistSeasonById(_seasonId)) {
            revert InvalidSeasonId();
        }

        ISLMT hunterRank = ISLMT(
            projectContract.getTokenContractByCollectionId(
                seasons[_seasonId].hunterRankCollectionId
            )
        );

        uint256 tokenLength = uint256(RankType.S); // 5
        uint256[] memory tokenIds = new uint256[](tokenLength);

        for (uint256 i = 0; i < tokenLength; i = i.increment()) {
            tokenIds[i] = i + 1;
        }

        return
            hunterRank.balanceOfBatch(
                _asAddressArray(_hunter, tokenLength),
                tokenIds
            );
    }

    function getHunterRank(
        uint256 _seasonId,
        address _hunter
    ) external view returns (RankType) {
        if (!isExistSeasonById(_seasonId)) {
            revert InvalidSeasonId();
        }

        uint256[] memory tokenBalances = getHunterRankTokenBalance(
            _seasonId,
            _hunter
        );

        for (uint256 i = tokenBalances.length - 1; i >= 0; i--) {
            if (tokenBalances[i] > 0) return RankType(i + 1);
            if (i == 0) break;
        }

        return RankType.E;
    }


    function _asAddressArray(
        address _element,
        uint256 _length
    ) private pure returns (address[] memory) {
        address[] memory array = new address[](_length);

        for (uint256 i = 0; i < _length; i = i.increment()) {
            array[i] = _element;
        }

        return array;
    }
}
