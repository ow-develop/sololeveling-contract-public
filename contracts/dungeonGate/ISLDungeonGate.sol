// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import {BaseStorage} from "../core/BaseStorage.sol";
import {DungeonGateBase} from "./DungeonGateBase.sol";
import {ISLSeason} from "../season/ISLSeason.sol";
import {ISLRandom} from "../random/ISLRandom.sol";
import {ISLShop} from "../shop/ISLShop.sol";
import {ISLMonsterFactory} from "../monsterFactory/ISLMonsterFactory.sol";

interface ISLDungeonGate {
    /*
     *  Slot
     */
    // E - S
    function setSlotPerHunterRank(uint256[6] calldata _slots) external;

    function getHunterUsingSlot(
        address _hunter
    ) external view returns (uint256);

    function getHunterSlot(
        uint256 _seasonId,
        address _hunter
    ) external view returns (uint256 availableSlot, uint256 usingSlot);

    function getSlotPerHunterRank() external view returns (uint256[6] memory);

    /*
     *  Gate
     */
    function enterToGate(
        uint256 _seasonId,
        BaseStorage.RankType _gateRank
    ) external payable;

    function clearGate(
        uint256 _gateId,
        bytes[] calldata _gateSignatures
    ) external;

    function isExistGateById(uint256 _gateId) external view returns (bool);

    function getGateHunter(uint256 _gateId) external view returns (address);

    function getGateRemainingBlock(
        uint256 _gateId
    ) external view returns (uint256);

    function getRequiredRandomSignature(
        DungeonGateBase.RankType _gateRank
    ) external view returns (DungeonGateBase.RandomCount memory);

    function getRequiredStoneForClear(
        uint256 _gateId
    ) external view returns (uint256);

    function getGateIdOfHunterSlot(
        address _hunter
    ) external view returns (uint256[] memory);

    function getGateOfHunterSlot(
        address _hunter
    )
        external
        view
        returns (
            DungeonGateBase.Gate[] memory gateOfHunterSlot,
            uint256[] memory requiredBrokenStones
        );

    function isClearGate(uint256 _gateId) external view returns (bool);

    function getGateById(
        uint256 _gateId
    ) external view returns (DungeonGateBase.Gate memory);

    function getGateCountOfSeason(
        uint256 _seasonId,
        address _hunter
    ) external view returns (uint256);

    function getGateCountOfSeasonBatch(
        uint256 _seasonId,
        address[] calldata _hunters
    ) external view returns (uint256[] memory);

    /*
     *  Gate Base
     */
    // E - S
    function setGateBlockPerRank(uint256[6] calldata _gateBlocks) external;

    // E - S
    function setGateRewardPerRank(
        DungeonGateBase.GateReward[6] calldata _rewards
    ) external;

    function setBoostBlockCount(uint256 _boostBlockCount) external;

    function getGateBlockPerRank() external view returns (uint256[6] memory);

    function getGateRewardPerRank()
        external
        view
        returns (DungeonGateBase.GateReward[6] memory);

    function getBoostBlockCount() external view returns (uint256);

    /*
     *  Collection
     */
    function setEssenceStoneCollectionId(
        uint256 _essenceStoneCollectionId
    ) external;

    function setGateKeyCollectionId(uint256 _gateKeyCollectionId) external;

    function setNormalMonsterCollectionId(
        uint256 _monsterCollectionId
    ) external;

    function getEssenceStoneCollectionId() external view returns (uint256);

    function getGateKeyCollectionId() external view returns (uint256);

    function getNormalMonsterCollectionId() external view returns (uint256);

    /*
     *  Base
     */
    function setSeasonContract(ISLSeason _seasonContract) external;

    function setRandomContract(ISLRandom _randomContract) external;

    function setShopContract(ISLShop _shopContract) external;

    function setMonsterFactoryContract(
        ISLMonsterFactory _monsterFactoryContract
    ) external;

    function setApproveUSDTokenContract() external;

    function getSeasonContract() external view returns (address);

    function getRandomContract() external view returns (address);

    function getShopContract() external view returns (address);

    function getMonsterFactoryContract() external view returns (address);
}
