// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import {Unsafe} from "../../utils/Unsafe.sol";
import {CountersUpgradeable} from "../../utils/CountersUpgradeable.sol";
import {EnumerableSetUpgradeable} from "../../utils/EnumerableSetUpgradeable.sol";
import {SafeCastUpgradeable} from "../../utils/SafeCastUpgradeable.sol";

import {Slot} from "./Slot.sol";
import {ISLMT} from "../../collections/ISLMT.sol";
import {ISLSeasonPack} from "../../collections/seasonPack/ISLSeasonPack.sol";

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

        if (key.balanceOf(hunter, keyTokenId) > 0) {
            if (value != 0) revert InvalidPrice();
        } else {
            uint256 keyPrice = shopContract.getLatestKeyPrice(_gateRank);

            if (value != keyPrice) revert InvalidPrice();

            shopContract.buyKey{value: keyPrice}(hunter, _gateRank, 1);
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

        gateCountOfSeason[_seasonId][hunter].increment();

        emit GateCreated(
            _seasonId,
            _gateRank,
            hunter,
            gateId,
            startBlock,
            endBlock
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

        if (
            _gateSignatures.length != getRequiredRandomSignature(gate.gateRank)
        ) {
            revert InvalidGateSignature();
        }

        gate.cleared = true;
        gateOfHunterSlot[hunter].remove(_gateId);

        ISLMT essenceStone = ISLMT(
            projectContract.getTokenContractByCollectionId(
                essenceStoneCollectionId
            )
        );

        uint256 requiredStone = getRequiredStoneForClear(_gateId);

        if (requiredStone > 0) {
            essenceStone.burn(hunter, ESSENCE_STONE_TOKEN_ID, requiredStone);

            gate.usedStone += requiredStone.toUint32();
        }

        (
            MonsterReward memory monsterReward,
            SeasonPackReward memory seasonPackReward
        ) = _mintGateRewardToken(
                hunter,
                gate.gateRank,
                gate.seasonId,
                _gateSignatures
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
            block.timestamp
        );
    }

    function _mintGateRewardToken(
        address _hunter,
        RankType _gateRank,
        uint256 _seasonId,
        bytes[] calldata _gateSignatures
    )
        private
        returns (
            MonsterReward memory monsterReward,
            SeasonPackReward memory seasonPackReward
        )
    {
        uint256[7] memory rewardTokens = rewardTokensPerRank[_gateRank];
        uint256 signatureIndex;

        ISLMT monsterContract = ISLMT(
            projectContract.getTokenContractByCollectionId(
                normalMonsterCollectionId
            )
        );

        uint256 monsterRankCount;
        for (uint256 i = 0; i < 6; i = i.increment()) {
            if (rewardTokens[i] > 0) {
                monsterRankCount = monsterRankCount.increment();
            }
        }

        if (monsterRankCount > 0) {
            (signatureIndex, monsterReward) = _mintMonster(
                RewardMintInfo(
                    _hunter,
                    signatureIndex,
                    rewardTokens,
                    monsterRankCount
                ),
                _gateSignatures,
                monsterContract
            );
        }

        uint256 seasonPackCount = rewardTokens[6];

        if (seasonPackCount > 0) {
            uint256 seasonId = _seasonId;
            address hunter = _hunter;

            (seasonPackReward) = _mintSeasonPack(
                RewardMintInfo(
                    hunter,
                    signatureIndex,
                    rewardTokens,
                    rewardTokens[6]
                ),
                _gateSignatures,
                seasonId
            );
        }
    }

    function _mintMonster(
        RewardMintInfo memory _rewardMintInfo,
        bytes[] calldata _gateSignatures,
        ISLMT _monsterContract
    ) private returns (uint256, MonsterReward memory) {
        MonsterReward memory monsterReward;

        monsterReward.monsterIds = new uint256[](_rewardMintInfo.rewardCount);
        monsterReward.monsterAmounts = new uint256[](
            _rewardMintInfo.rewardCount
        );

        // E, D, C, B, A, S monster index 0, 1, 2, 3, 4, 5
        for (uint256 i = 0; i < 6; i = i.increment()) {
            uint256 rewardToken = _rewardMintInfo.rewardTokens[i];

            if (rewardToken > 0) {
                uint256[] memory monsters = monsterFactoryContract
                    .getMonsterIdOfRankType(RankType(i), false);
                bytes calldata gateSignature = _gateSignatures[
                    _rewardMintInfo.signatureIndex
                ];

                _verifyRandomSignature(_rewardMintInfo.hunter, gateSignature);

                uint256 numberForMonster = uint256(keccak256(gateSignature)) %
                    monsters.length;

                monsterReward.monsterIds[
                    _rewardMintInfo.signatureIndex
                ] = monsters[numberForMonster];
                monsterReward.monsterAmounts[
                    _rewardMintInfo.signatureIndex
                ] = rewardToken;

                _rewardMintInfo.signatureIndex = _rewardMintInfo
                    .signatureIndex
                    .increment();
            }
        }

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
        uint256 seasonPackCollectionId = seasonContract
            .getSeasonPackCollectionId(_seasonId);

        ISLSeasonPack seasonPackContract = ISLSeasonPack(
            projectContract.getTokenContractByCollectionId(
                seasonPackCollectionId
            )
        );
        uint256[] memory packTokens = seasonPackContract.getOpenTokens();

        if (packTokens.length == 0) {
            return SeasonPackReward(0, 0);
        }

        bytes calldata gateSignature = _gateSignatures[
            _rewardMintInfo.signatureIndex
        ];
        _verifyRandomSignature(_rewardMintInfo.hunter, gateSignature);

        uint256 numberForSeasonPack = uint256(keccak256(gateSignature)) %
            packTokens.length;

        uint256 seasonPackId = packTokens[numberForSeasonPack];

        seasonPackContract.mint(
            _rewardMintInfo.hunter,
            seasonPackId,
            _rewardMintInfo.rewardCount
        );

        return SeasonPackReward(seasonPackId, _rewardMintInfo.rewardCount);
    }

    function _verifyRandomSignature(
        address _hunter,
        bytes calldata _signature
    ) private {
        randomContract.verifyRandomSignature(_hunter, _signature);
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
    ) public view returns (uint256) {
        uint256[7] memory rewardTokens = rewardTokensPerRank[_gateRank];

        uint256 randomCount;

        for (uint i = 0; i < rewardTokens.length; i = i.increment()) {
            if (rewardTokens[i] > 0) {
                randomCount = randomCount.increment();
            }
        }

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
        return gateCountOfSeason[_seasonId][_hunter].current();
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
}
