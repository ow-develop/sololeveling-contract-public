// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import {Unsafe} from "../../utils/Unsafe.sol";

import {ISLSystem} from "../ISLSystem.sol";
import {SystemBase} from "../SystemBase.sol";
import {ISLMT} from "../../collections/ISLMT.sol";

abstract contract Upgrade is ISLSystem, SystemBase {
    using Unsafe for uint256;

    /*
     *  Upgrade
     */
    function upgradeMonster(
        RankType _monsterRank,
        uint256 _requestAmount,
        UseMonster calldata _useMonster,
        bytes[] calldata _monsterSignatures
    ) external {
        if (_requestAmount == 0) revert InvalidArgument();

        if (_useMonster.monsterIds.length != _useMonster.monsterAmounts.length)
            revert InvalidArgument();

        if (_monsterSignatures.length != _requestAmount)
            revert InvalidMonsterSignature();

        if (_monsterRank == RankType.S) revert InvalidRankType();

        address hunter = _msgSender();

        uint256 requiredMonsterAmount = requiredMonsterForUpgrade[
            _monsterRank
        ] * _requestAmount;

        uint256 requiredStoneAmount = requiredStoneForUpgrade[_monsterRank] *
            _requestAmount;

        if (!_checkMonster(_monsterRank, _useMonster, requiredMonsterAmount))
            revert InvalidMonster();

        RankType nextMonsterRank = RankType(uint256(_monsterRank) + 1);

        ISLMT monster = ISLMT(
            projectContract.getTokenContractByCollectionId(
                normalMonsterCollectionId
            )
        );

        ISLMT essenceStone = ISLMT(
            projectContract.getTokenContractByCollectionId(
                essenceStoneCollectionId
            )
        );

        monster.burnBatch(
            hunter,
            _useMonster.monsterIds,
            _useMonster.monsterAmounts
        );

        if (requiredStoneAmount > 0) {
            essenceStone.burn(
                hunter,
                ESSENCE_STONE_TOKEN_ID,
                requiredStoneAmount
            );
        }

        uint256[] memory resultMonsterIds = _getUpgradedMonster(
            hunter,
            nextMonsterRank,
            _monsterSignatures
        );

        monster.mintBatch(
            hunter,
            resultMonsterIds,
            _asUintArray(1, resultMonsterIds.length)
        );

        hunterUpgradeCount[hunter][_monsterRank] += _requestAmount;
        upgradeCount[_monsterRank] += _requestAmount;

        emit MonsterUpgraded({
            hunter: hunter,
            upgradedRank: nextMonsterRank,
            upgradedAmount: _requestAmount,
            usedMonster: _useMonster,
            usedStone: requiredStoneAmount,
            resultMonsterIds: resultMonsterIds,
            timestamp: block.timestamp
        });
    }

    function _checkMonster(
        RankType _monsterRank,
        UseMonster calldata _useMonster,
        uint256 _requiredAmount
    ) private view returns (bool) {
        uint256 totalAmount;

        for (
            uint256 i = 0;
            i < _useMonster.monsterIds.length;
            i = i.increment()
        ) {
            totalAmount += _useMonster.monsterAmounts[i];
        }

        if (totalAmount != _requiredAmount) return false;

        return
            monsterFactoryContract.isValidMonsterBatch(
                _monsterRank,
                false,
                _useMonster.monsterIds
            );
    }

    function _getUpgradedMonster(
        address _hunter,
        RankType _upgradeRank,
        bytes[] calldata _monsterSignatures
    ) private returns (uint256[] memory) {
        uint256 count = _monsterSignatures.length;

        uint256[] memory resultMonsterIds = new uint256[](count);

        uint256[] memory monsters = monsterFactoryContract
            .getMonsterIdOfRankType(_upgradeRank, false);
        uint256 max = monsters.length;

        for (uint256 i = 0; i < count; i = i.increment()) {
            _verifyRandomSignature(_hunter, _monsterSignatures[i]);

            uint256 numberForMonster = uint256(
                keccak256(_monsterSignatures[i])
            ) % max;

            resultMonsterIds[i] = monsters[numberForMonster];
        }

        return resultMonsterIds;
    }

    function _verifyRandomSignature(
        address _hunter,
        bytes calldata _signature
    ) internal {
        randomContract.verifyRandomSignature(_hunter, _signature);
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
    function setRequiredMonsterForUpgrade(
        uint256[5] calldata _requiredMonsters // E - A
    ) external onlyOperator {
        for (uint256 i = 0; i < _requiredMonsters.length; i = i.increment()) {
            if (_requiredMonsters[i] < 1) revert InvalidArgument();

            requiredMonsterForUpgrade[RankType(i)] = _requiredMonsters[i];
        }
    }

    function setRequiredStoneForUpgrade(
        uint256[5] calldata _requiredStones // E - A
    ) external onlyOperator {
        for (uint256 i = 0; i < _requiredStones.length; i = i.increment()) {
            requiredStoneForUpgrade[RankType(i)] = _requiredStones[i];
        }
    }

    /*
     *  View
     */
    function getRequiredMonsterForUpgrade()
        external
        view
        returns (uint256[5] memory)
    {
        uint256[5] memory requiredMonsters;

        for (uint256 i = 0; i < 5; i = i.increment()) {
            requiredMonsters[i] = requiredMonsterForUpgrade[RankType(i)];
        }

        return requiredMonsters;
    }

    function getRequiredStoneForUpgrade()
        external
        view
        returns (uint256[5] memory)
    {
        uint256[5] memory requiredStones;

        for (uint256 i = 0; i < 5; i = i.increment()) {
            requiredStones[i] = requiredStoneForUpgrade[RankType(i)];
        }

        return requiredStones;
    }

    function getHunterUpgradeCount(
        address _hunter,
        RankType _monsterRank
    ) external view returns (uint256) {
        if (_monsterRank == RankType.S) revert InvalidRankType();

        return hunterUpgradeCount[_hunter][_monsterRank];
    }
}
