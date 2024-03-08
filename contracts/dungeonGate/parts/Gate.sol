// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import {Unsafe} from "../../utils/Unsafe.sol";
import {CountersUpgradeable} from "../../utils/CountersUpgradeable.sol";
import {EnumerableSetUpgradeable} from "../../utils/EnumerableSetUpgradeable.sol";
import {SafeCastUpgradeable} from "../../utils/SafeCastUpgradeable.sol";

import {Slot} from "./Slot.sol";
import {ISLMT} from "../../collections/ISLMT.sol";
import {ISLSeasonPack} from "../../collections/seasonPack/ISLSeasonPack.sol";
import {ShopBase} from "../../shop/ShopBase.sol";
import {SeasonBase} from "../../season/SeasonBase.sol";
import {IERC20} from "../../standard/ERC/ERC20/IERC20.sol";

abstract contract Gate is Slot {
    using Unsafe for uint256;
    using CountersUpgradeable for CountersUpgradeable.Counter;
    using EnumerableSetUpgradeable for EnumerableSetUpgradeable.UintSet;
    using SafeCastUpgradeable for uint256;

    /*
     *  Gate
     */
    function enterToGate(
        uint256 _seasonId,
        RankType _gateRank
    ) external payable {
        if (!seasonContract.isCurrentSeasonById(_seasonId)) {
            revert InvalidSeasonId();
        }

        address hunter = _msgSender();

        RankType hunterRank = seasonContract.getHunterRank(_seasonId, hunter);
        if (hunterRank < _gateRank) revert InvalidRankType();

        uint256 value = msg.value;
        uint256 keyTokenId = uint256(_gateRank);

        ISLMT key = ISLMT(
            projectContract.getTokenContractByCollectionId(gateKeyCollectionId)
        );

        // 던전 진입시, 기존 key를 사용하는 경우.
        if (key.balanceOf(hunter, keyTokenId) > 0) {
            if (value != 0) revert InvalidPrice();
        } else {
            // 던전 진입시, key 를 구매하여 진행하는 경우.
            (ShopBase.PriceMode priceMode, uint256 price) = shopContract
                .getLatestKeyPrice(_gateRank);

            if (priceMode == ShopBase.PriceMode.MATIC) {
                if (value != price) revert InvalidPrice();

                shopContract.buyKey{value: price}(hunter, _gateRank, 1);
            } else {
                if (value != 0) revert InvalidPrice();

                address usdTokenContract = shopContract.getUSDTokenContract();

                IERC20(usdTokenContract).transferFrom(
                    hunter,
                    address(this),
                    price
                );

                shopContract.buyKey(hunter, _gateRank, 1);
            }
        }

        key.burn(hunter, keyTokenId, 1);

        (uint256 totalSlot, uint256 usingSlot) = getHunterSlot(
            _seasonId,
            hunter
        );
        if (usingSlot >= totalSlot) revert ExceedGateSlot();

        gateIds.increment();
        uint256 gateId = gateIds.current();

        gateOfHunterSlot[hunter].add(gateId);

        uint32 startBlock = block.number.toUint32();
        uint32 endBlock = (block.number + gateBlockPerRank[_gateRank])
            .toUint32();
        gates[gateId] = Gate({
            id: gateId.toUint64(),
            seasonId: _seasonId.toUint64(),
            startBlock: startBlock,
            endBlock: endBlock,
            usedStone: 0,
            cleared: false,
            gateRank: _gateRank,
            hunter: hunter
        });

        // 현재 시즌의 헌터의 누적 gate count(:level-score) 증가.
        // Before : gateCountOfSeason[_seasonId][hunter].increment();
        // TO DO: 진입한 gate rank 에 따라 gate count(:level-score) 증가 수치 다르게 처리.
        if (_gateRank == RankType.E) {
            gateCountOfSeason[_seasonId][hunter]++;
        } else if (_gateRank == RankType.D) {
            gateCountOfSeason[_seasonId][hunter] += 3;
        } else if (_gateRank == RankType.C) {
            gateCountOfSeason[_seasonId][hunter] += 5;
        } else if (_gateRank == RankType.B) {
            gateCountOfSeason[_seasonId][hunter] += 8;
        } else if (_gateRank == RankType.A) {
            gateCountOfSeason[_seasonId][hunter] += 10;
        } else if (_gateRank == RankType.S) {
            gateCountOfSeason[_seasonId][hunter] += 15;
        }

        // 랭크업 조건 체크 로직.
        bool isRankUp;
        RankType nextHunterRank;

        {
            uint256 seasonId = _seasonId;
            address rankUpHunter = hunter;

            if (
                hunterRank != RankType.S &&
                requiredGateCountForRankUp[hunterRank] <=
                gateCountOfSeason[seasonId][rankUpHunter]
            ) {
                SeasonBase.Season memory season = seasonContract.getSeasonById(
                    seasonId
                );

                ISLMT hunterRankToken = ISLMT(
                    projectContract.getTokenContractByCollectionId(
                        season.hunterRankCollectionId
                    )
                );

                isRankUp = true;
                nextHunterRank = RankType(uint256(hunterRank) + 1);
                hunterRankToken.mint(rankUpHunter, uint256(nextHunterRank), 1);
            }
        }

        emit GateCreated(
            _seasonId,
            _gateRank,
            hunter,
            gateId,
            startBlock,
            endBlock,
            isRankUp,
            nextHunterRank
        );
    }

    function clearGate(
        uint256 _gateId,
        bytes[] calldata _gateSignatures
    ) external {
        if (isClearGate(_gateId)) revert AlreadyClearGate();

        address hunter = _msgSender();
        if (getGateHunter(_gateId) != hunter) revert InvalidGateId();

        Gate storage gate = gates[_gateId];

        RandomCount memory randomCount = getRequiredRandomSignature(
            gate.gateRank
        );

        if (_gateSignatures.length != randomCount.totalCount) {
            revert InvalidGateSignature();
        }

        gate.cleared = true;
        gateOfHunterSlot[hunter].remove(_gateId);

        ISLMT essenceStoneContract = ISLMT(
            projectContract.getTokenContractByCollectionId(
                essenceStoneCollectionId
            )
        );

        uint256 requiredStone = getRequiredStoneForClear(_gateId);

        if (requiredStone > 0) {
            essenceStoneContract.burn(
                hunter,
                ESSENCE_STONE_TOKEN_ID,
                requiredStone
            );

            gate.usedStone += requiredStone.toUint32();
        }

        (
            MonsterReward memory monsterReward,
            SeasonPackReward memory seasonPackReward,
            uint256 essenceStoneReward
        ) = _mintGateRewardToken(
                hunter,
                gate.gateRank,
                randomCount,
                gate.seasonId,
                _gateSignatures,
                essenceStoneContract
            );

        emit GateCleared(
            gate.gateRank,
            hunter,
            _gateId,
            gate.seasonId,
            requiredStone,
            _gateSignatures,
            monsterReward,
            seasonPackReward,
            essenceStoneReward,
            block.timestamp
        );
    }

    function _mintGateRewardToken(
        address _hunter,
        RankType _gateRank,
        RandomCount memory _randomCount,
        uint256 _seasonId,
        bytes[] calldata _gateSignatures,
        ISLMT _essenceStoneContract
    )
        private
        returns (
            MonsterReward memory monsterReward,
            SeasonPackReward memory seasonPackReward,
            uint256 essenceStoneReward
        )
    {
        uint256[8] memory rewardTokens = rewardTokensPerRank[_gateRank];
        uint256 signatureIndex;

        ISLMT monsterContract = ISLMT(
            projectContract.getTokenContractByCollectionId(
                normalMonsterCollectionId
            )
        );

        if (_randomCount.monsterCount > 0) {
            (signatureIndex, monsterReward) = _mintMonster(
                RewardMintInfo(
                    _hunter,
                    signatureIndex,
                    rewardTokens,
                    _randomCount.monsterCount
                ),
                _gateSignatures,
                monsterContract
            );
        }

        if (_randomCount.seasonPackCount > 0) {
            uint256 seasonId = _seasonId;
            address hunter = _hunter;

            (seasonPackReward) = _mintSeasonPack(
                RewardMintInfo(
                    hunter,
                    signatureIndex,
                    rewardTokens,
                    _randomCount.seasonPackCount
                ),
                _gateSignatures,
                seasonId
            );
        }

        essenceStoneReward = rewardTokens[7];
        if (essenceStoneReward > 0) {
            _essenceStoneContract.mint(
                _hunter,
                ESSENCE_STONE_TOKEN_ID,
                essenceStoneReward
            );
        }
    }

    function _mintMonster(
        RewardMintInfo memory _rewardMintInfo,
        bytes[] calldata _gateSignatures,
        ISLMT _monsterContract
    ) private returns (uint256, MonsterReward memory) {
        MonsterReward memory monsterReward;

        uint256[] memory mintedMonsterIds = new uint256[](
            _rewardMintInfo.rewardCount
        );
        uint256 mintedMonsterIndex;

        // E, D, C, B, A, S monster index 0, 1, 2, 3, 4, 5
        for (uint256 i = 0; i < 6; i = i.increment()) {
            if (_rewardMintInfo.rewardTokens[i] > 0) {
                uint256[] memory monsters = monsterFactoryContract
                    .getMonsterIdOfRankType(RankType(i), false);

                for (
                    uint256 j = 0;
                    j < _rewardMintInfo.rewardTokens[i];
                    j = j.increment()
                ) {
                    bytes calldata gateSignature = _gateSignatures[
                        _rewardMintInfo.signatureIndex
                    ];

                    _verifyRandomSignature(
                        _rewardMintInfo.hunter,
                        gateSignature
                    );

                    uint256 numberForMonster = uint256(
                        keccak256(gateSignature)
                    ) % monsters.length;

                    mintedMonsterIds[mintedMonsterIndex] = monsters[
                        numberForMonster
                    ];
                    mintedMonsterIndex = mintedMonsterIndex.increment();
                    _rewardMintInfo.signatureIndex = _rewardMintInfo
                        .signatureIndex
                        .increment();
                }
            }
        }

        (
            monsterReward.monsterIds,
            monsterReward.monsterAmounts
        ) = _getUniqueElementsWithCounts(mintedMonsterIds);

        _monsterContract.mintBatch(
            _rewardMintInfo.hunter,
            monsterReward.monsterIds,
            monsterReward.monsterAmounts
        );

        return (_rewardMintInfo.signatureIndex, monsterReward);
    }

    function _mintSeasonPack(
        RewardMintInfo memory _rewardMintInfo,
        bytes[] calldata _gateSignatures,
        uint256 _seasonId
    ) private returns (SeasonPackReward memory) {
        SeasonPackReward memory seasonPackReward;

        uint256 seasonPackCollectionId = seasonContract
            .getSeasonPackCollectionId(_seasonId);

        ISLSeasonPack seasonPackContract = ISLSeasonPack(
            projectContract.getTokenContractByCollectionId(
                seasonPackCollectionId
            )
        );
        uint256[] memory packTokens = seasonPackContract.getOpenTokens();

        if (packTokens.length == 0) {
            return SeasonPackReward(new uint256[](0), new uint256[](0));
        }

        uint256[] memory mintedSeasonPackIds = new uint256[](
            _rewardMintInfo.rewardCount
        );
        for (
            uint256 i = 0;
            i < _rewardMintInfo.rewardCount;
            i = i.increment()
        ) {
            bytes calldata gateSignature = _gateSignatures[
                _rewardMintInfo.signatureIndex
            ];
            _verifyRandomSignature(_rewardMintInfo.hunter, gateSignature);
            uint256 numberForSeasonPack = uint256(keccak256(gateSignature)) %
                packTokens.length;

            mintedSeasonPackIds[i] = packTokens[numberForSeasonPack];
            _rewardMintInfo.signatureIndex = _rewardMintInfo
                .signatureIndex
                .increment();
        }

        (
            seasonPackReward.seasonPackIds,
            seasonPackReward.seasonPackAmounts
        ) = _getUniqueElementsWithCounts(mintedSeasonPackIds);

        seasonPackContract.mintBatch(
            _rewardMintInfo.hunter,
            seasonPackReward.seasonPackIds,
            seasonPackReward.seasonPackAmounts
        );

        return seasonPackReward;
    }

    function _verifyRandomSignature(
        address _hunter,
        bytes calldata _signature
    ) private {
        randomContract.verifyRandomSignature(_hunter, _signature);
    }

    function _getUniqueElementsWithCounts(
        uint256[] memory _array
    ) private pure returns (uint256[] memory, uint256[] memory) {
        uint arrayLength = _array.length;

        uint256[] memory uniqueElements = new uint256[](arrayLength);
        uint256[] memory elementCounts = new uint256[](arrayLength);
        uint uniqueCount = 0;

        for (uint i = 0; i < arrayLength; i++) {
            uint currentElement = _array[i];
            bool isUnique = true;
            for (uint j = 0; j < uniqueCount; j++) {
                if (uniqueElements[j] == currentElement) {
                    isUnique = false;
                    elementCounts[j]++;
                    break;
                }
            }

            if (isUnique) {
                uniqueElements[uniqueCount] = currentElement;
                elementCounts[uniqueCount] = 1;
                uniqueCount++;
            }
        }

        // Resize the uniqueElements and elementCounts arrays to the actual unique count
        assembly {
            mstore(uniqueElements, uniqueCount)
            mstore(elementCounts, uniqueCount)
        }

        return (uniqueElements, elementCounts);
    }

    /*
     *  View
     */
    function isExistGateById(uint256 _gateId) public view returns (bool) {
        return _gateId != 0 && _gateId <= gateIds.current();
    }

    function getGateHunter(uint256 _gateId) public view returns (address) {
        return gates[_gateId].hunter;
    }

    function getGateRemainingBlock(
        uint256 _gateId
    ) public view returns (uint256) {
        if (!isExistGateById(_gateId)) revert InvalidGateId();

        Gate memory gate = gates[_gateId];

        if (gate.endBlock < block.number) return 0;

        return gate.endBlock - block.number;
    }

    function getRequiredRandomSignature(
        RankType _gateRank
    ) public view returns (RandomCount memory) {
        RandomCount memory randomCount;
        uint256[8] memory rewardTokens = rewardTokensPerRank[_gateRank];

        for (uint i = 0; i < 6; i = i.increment()) {
            randomCount.monsterCount += rewardTokens[i];
        }

        randomCount.seasonPackCount = rewardTokens[6];

        randomCount.totalCount =
            randomCount.monsterCount +
            randomCount.seasonPackCount;

        return randomCount;
    }

    function getRequiredStoneForClear(
        uint256 _gateId
    ) public view returns (uint256) {
        uint256 remainingBlock = getGateRemainingBlock(_gateId);

        if (remainingBlock == 0) return 0;

        if (remainingBlock % boostBlockCount == 0) {
            return remainingBlock / boostBlockCount;
        } else {
            return (remainingBlock / boostBlockCount) + 1;
        }
    }

    function getGateIdOfHunterSlot(
        address _hunter
    ) public view returns (uint256[] memory) {
        return gateOfHunterSlot[_hunter].values();
    }

    function getGateOfHunterSlot(
        address _hunter
    )
        external
        view
        returns (
            Gate[] memory gateOfHunterSlot,
            uint256[] memory requiredStones
        )
    {
        uint256[] memory gateIdOfHunterSlot = getGateIdOfHunterSlot(_hunter);

        gateOfHunterSlot = new Gate[](gateIdOfHunterSlot.length);
        requiredStones = new uint256[](gateIdOfHunterSlot.length);

        for (uint256 i = 0; i < gateIdOfHunterSlot.length; i = i.increment()) {
            uint256 gateId = gateIdOfHunterSlot[i];
            gateOfHunterSlot[i] = gates[gateId];
            requiredStones[i] = getRequiredStoneForClear(gateId);
        }
    }

    function isClearGate(uint256 _gateId) public view returns (bool) {
        return gates[_gateId].cleared;
    }

    function getGateById(uint256 _gateId) external view returns (Gate memory) {
        if (!isExistGateById(_gateId)) revert InvalidGateId();

        return gates[_gateId];
    }

    function getGateCountOfSeason(
        uint256 _seasonId,
        address _hunter
    ) external view returns (uint256) {
        if (!seasonContract.isExistSeasonById(_seasonId)) {
            revert InvalidSeasonId();
        }

        return _getGateCountOfSeason(_seasonId, _hunter);
    }

    function getGateCountOfSeasonBatch(
        uint256 _seasonId,
        address[] calldata _hunters
    ) external view returns (uint256[] memory) {
        uint256 hunterCount = _hunters.length;

        uint256[] memory counts = new uint256[](hunterCount);

        for (uint256 i = 0; i < hunterCount; i = i.increment()) {
            counts[i] = _getGateCountOfSeason(_seasonId, _hunters[i]);
        }

        return counts;
    }

    function _getGateCountOfSeason(
        uint256 _seasonId,
        address _hunter
    ) private view returns (uint256) {
        return gateCountOfSeason[_seasonId][_hunter];
    }

    /*
     *  Base
     */
    // E - S
    function setGateBlockPerRank(
        uint256[6] calldata _gateBlocks
    ) external onlyOperator {
        for (uint256 i = 0; i < _gateBlocks.length; i = i.increment()) {
            gateBlockPerRank[RankType(i)] = _gateBlocks[i];
        }
    }

    // E - S
    function setGateRewardPerRank(
        GateReward[6] calldata _rewards
    ) external onlyOperator {
        for (uint256 i = 0; i < _rewards.length; i = i.increment()) {
            rewardTokensPerRank[RankType(i)] = _rewards[i].rewardTokens;
        }
    }

    function setBoostBlockCount(
        uint256 _boostBlockCount
    ) external onlyOperator {
        if (_boostBlockCount < 1) revert InvalidArgument();

        boostBlockCount = _boostBlockCount;
    }

    // E - A
    function setRequiredGateCountForRankUp(
        uint256[5] calldata _requiredGateCounts
    ) external onlyOperator {
        for (uint256 i = 0; i < _requiredGateCounts.length; i = i.increment()) {
            requiredGateCountForRankUp[RankType(i)] = _requiredGateCounts[i];
        }
    }

    function getGateBlockPerRank() external view returns (uint256[6] memory) {
        uint256[6] memory gateBlocks;

        for (uint256 i = 0; i < 6; i = i.increment()) {
            gateBlocks[i] = gateBlockPerRank[RankType(i)];
        }

        return gateBlocks;
    }

    function getGateRewardPerRank()
        external
        view
        returns (GateReward[6] memory)
    {
        GateReward[6] memory rewards;

        for (uint256 i = 0; i < 6; i = i.increment()) {
            rewards[i].rewardTokens = rewardTokensPerRank[RankType(i)];
        }

        return rewards;
    }

    function getBoostBlockCount() external view returns (uint256) {
        return boostBlockCount;
    }

    function getRequiredGateCountForRankUp()
        external
        view
        returns (uint256[5] memory)
    {
        uint256[5] memory requiredGateCounts;

        for (uint256 i = 0; i < 5; i = i.increment()) {
            requiredGateCounts[i] = requiredGateCountForRankUp[RankType(i)];
        }

        return requiredGateCounts;
    }
}
