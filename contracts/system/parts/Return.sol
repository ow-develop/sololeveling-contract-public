// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import {Unsafe} from "../../utils/Unsafe.sol";

import {Arise} from "./Arise.sol";
import {ISLMT} from "../../collections/ISLMT.sol";

abstract contract Return is Arise {
    using Unsafe for uint256;

    /*
     *  Return
     */
    function returnMonster(
        RankType _monsterRank,
        uint256[] calldata _monsterIds,
        uint256[] calldata _monsterAmounts,
        bool _isShadow
    ) external {
        if (_monsterIds.length == 0) revert InvalidArgument();

        if (_monsterIds.length != _monsterAmounts.length)
            revert InvalidMonster();

        if (_monsterRank < RankType.B && _isShadow) revert InvalidRankType();

        ISLMT monster = _isShadow
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
                _monsterRank,
                _isShadow,
                _monsterIds
            )
        ) {
            revert InvalidMonster();
        }

        address hunter = _msgSender();

        monster.burnBatch(hunter, _monsterIds, _monsterAmounts);

        uint256 monsterAmount;
        for (uint256 i = 0; i < _monsterIds.length; i = i.increment()) {
            monsterAmount += _monsterAmounts[i];
        }

        uint256 amountPerReturned = _isShadow
            ? essenceStoneWhenShadowMonsterReturned[_monsterRank]
            : essenceStoneWhenNormalMonsterReturned[_monsterRank];

        uint256 essenceStoneAmount = monsterAmount * amountPerReturned;

        ISLMT essenceStone = ISLMT(
            projectContract.getTokenContractByCollectionId(
                essenceStoneCollectionId
            )
        );
        essenceStone.mint(hunter, ESSENCE_STONE_TOKEN_ID, essenceStoneAmount);

        hunterReturnCount[hunter][_isShadow][_monsterRank] += monsterAmount;
        returnCount[_isShadow][_monsterRank] += monsterAmount;

        emit MonsterReturned(
            hunter,
            _monsterRank,
            _isShadow,
            essenceStoneAmount,
            _monsterIds,
            _monsterAmounts,
            block.timestamp
        );
    }

    function returnMonsterBatch(MonsterSet calldata _monsterSet) external {
        if (!_checkMonsterSet(_monsterSet)) revert InvalidMonster();

        address hunter = _msgSender();

        uint256 essenceStoneAmount;

        if (_monsterSet.normalMonsterIds.length > 0) {
            essenceStoneAmount += _returnMonsterAndCalculateStone(
                hunter,
                _monsterSet.normalMonsterIds,
                _monsterSet.normalMonsterAmounts,
                false
            );
        }

        if (_monsterSet.shadowMonsterIds.length > 0) {
            essenceStoneAmount += _returnMonsterAndCalculateStone(
                hunter,
                _monsterSet.shadowMonsterIds,
                _monsterSet.shadowMonsterAmounts,
                true
            );
        }

        ISLMT essenceStone = ISLMT(
            projectContract.getTokenContractByCollectionId(
                essenceStoneCollectionId
            )
        );

        essenceStone.mint(hunter, ESSENCE_STONE_TOKEN_ID, essenceStoneAmount);

        emit MonsterReturnedBatch(
            hunter,
            essenceStoneAmount,
            _monsterSet,
            block.timestamp
        );
    }

    function _checkMonsterSet(
        MonsterSet calldata _monsterSet
    ) private pure returns (bool) {
        if (
            _monsterSet.normalMonsterIds.length < 1 &&
            _monsterSet.shadowMonsterIds.length < 1
        ) return false;

        if (
            _monsterSet.normalMonsterIds.length !=
            _monsterSet.normalMonsterAmounts.length ||
            _monsterSet.shadowMonsterIds.length !=
            _monsterSet.shadowMonsterAmounts.length
        ) return false;

        return true;
    }

    function _returnMonsterAndCalculateStone(
        address _hunter,
        uint256[] calldata _monsterIds,
        uint256[] calldata _monsterAmounts,
        bool _isShadow
    ) private returns (uint256) {
        address hunter = _hunter;
        bool isShadow = _isShadow;

        ISLMT monsterContract = isShadow
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

        monsterContract.burnBatch(hunter, _monsterIds, _monsterAmounts);

        RankType[] memory monsterRankTypes = monsterFactoryContract
            .getMonsterRankTypeBatch(isShadow, _monsterIds);

        uint256 essenceStoneAmount;

        for (uint256 i = 0; i < monsterRankTypes.length; i = i.increment()) {
            RankType monsterRank = monsterRankTypes[i];
            uint256 monsterAmount = _monsterAmounts[i];

            uint256 amountPerReturned = isShadow
                ? essenceStoneWhenShadowMonsterReturned[monsterRank]
                : essenceStoneWhenNormalMonsterReturned[monsterRank];

            essenceStoneAmount += (amountPerReturned * monsterAmount);

            hunterReturnCount[hunter][isShadow][monsterRank] += monsterAmount;
            returnCount[isShadow][monsterRank] += monsterAmount;
        }

        return essenceStoneAmount;
    }

    /*
     *  Base
     */
    function setEssenceStoneWhenReturned(
        uint256[6] calldata _normalEssenceStones,
        uint256[3] calldata _shadowEssenceStones
    ) external onlyOperator {
        for (
            uint256 i = 0;
            i < _normalEssenceStones.length;
            i = i.increment()
        ) {
            essenceStoneWhenNormalMonsterReturned[
                RankType(i)
            ] = _normalEssenceStones[i];
        }

        uint256 startRankType = uint256(RankType.B);

        for (
            uint256 i = 0;
            i < _shadowEssenceStones.length;
            i = i.increment()
        ) {
            essenceStoneWhenShadowMonsterReturned[
                RankType(startRankType + i)
            ] = _shadowEssenceStones[i];
        }
    }

    /*
     *  View
     */
    function getEssenceStoneWhenReturned()
        external
        view
        returns (
            uint256[6] memory normalEssenceStones,
            uint256[3] memory shadowEssenceStones
        )
    {
        for (uint256 i = 0; i < 6; i = i.increment()) {
            normalEssenceStones[i] = essenceStoneWhenNormalMonsterReturned[
                RankType(i)
            ];
        }

        uint256 startRankType = uint256(RankType.B);

        for (uint256 i = 0; i < 3; i = i.increment()) {
            shadowEssenceStones[i] = essenceStoneWhenShadowMonsterReturned[
                RankType(startRankType + i)
            ];
        }
    }

    function getHunterReturnCount(
        address _hunter,
        bool _isShadow,
        RankType _monsterRank
    ) external view returns (uint256) {
        if (_monsterRank < RankType.B && _isShadow) revert InvalidRankType();

        return hunterReturnCount[_hunter][_isShadow][_monsterRank];
    }
}
