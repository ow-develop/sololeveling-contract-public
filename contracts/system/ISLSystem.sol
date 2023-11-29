// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import {BaseStorage} from "../core/BaseStorage.sol";
import {SystemBase} from "./SystemBase.sol";
import {ISLMonsterFactory} from "../monsterFactory/ISLMonsterFactory.sol";
import {ISLRandom} from "../random/ISLRandom.sol";

interface ISLSystem {
    /*
     *  Upgrade
     */
    function upgradeMonster(
        SystemBase.RankType _monsterRank,
        uint256 _requestAmount,
        SystemBase.UseMonster calldata _useMonster,
        bytes[] calldata _monsterSignatures
    ) external;

    /*
     *  Upgrade Base
     */
    function setRequiredMonsterForUpgrade(
        uint256[5] calldata _requiredMonsters // E - A
    ) external;

    function setRequiredStoneForUpgrade(
        uint256[5] calldata _requiredStones // E - A
    ) external;

    function getRequiredMonsterForUpgrade()
        external
        view
        returns (uint256[5] memory);

    function getRequiredStoneForUpgrade()
        external
        view
        returns (uint256[5] memory);

    function getHunterUpgradeCount(
        address _hunter,
        SystemBase.RankType _monsterRank
    ) external view returns (uint256);

    /*
     *  Arise
     */
    function ariseMonster(
        BaseStorage.RankType _nextMonsterRank, // B, A, S
        uint256 _monsterId,
        uint256 _requestAmount,
        bytes[] calldata _monsterSignatures
    ) external;

    /*
     *  Arise Base
     */
    function setRequiredStoneForArise(
        uint256[3] calldata _requiredStones // B - S
    ) external;

    function setPercentageForArise(uint256[3] calldata _percentages) external;

    function getRequiredStoneForArise()
        external
        view
        returns (uint256[3] memory);

    function getPercentageForArise() external view returns (uint256[3] memory);

    function getHunterAriseCount(
        address _hunter,
        BaseStorage.RankType _monsterRank
    ) external view returns (uint256);

    /*
     *  Return
     */
    function returnMonster(
        BaseStorage.RankType _monsterRank,
        uint256[] calldata _monsterIds,
        uint256[] calldata _monsterAmounts,
        bool _isShadow
    ) external;

    function returnMonsterBatch(
        SystemBase.MonsterSet calldata _monsterSet
    ) external;

    /*
     *  Return Base
     */
    function setEssenceStoneWhenReturned(
        uint256[6] calldata _normalEssenceStones,
        uint256[3] calldata _shadowEssenceStones
    ) external;

    function getEssenceStoneWhenReturned()
        external
        view
        returns (
            uint256[6] memory normalEssenceStones,
            uint256[3] memory shadowEssenceStones
        );

    function getHunterReturnCount(
        address _hunter,
        bool _isShadow,
        SystemBase.RankType _monsterRank
    ) external view returns (uint256);

    /*
     *  Collection
     */
    function setMonsterCollectionId(
        uint256 _monsterCollectionId,
        bool _isShadow
    ) external;

    function setEssenceStoneCollectionId(
        uint256 _essenceStoneCollectionId
    ) external;

    function getMonsterCollectionId(
        bool _isShadow
    ) external view returns (uint256);

    function getEssenceStoneCollectionId() external view returns (uint256);

    /*
     *  Base
     */
    function setMonsterFactoryContract(
        ISLMonsterFactory _monsterFactoryContract
    ) external;

    function setRandomContract(ISLRandom _randomContract) external;

    function getMonsterFactoryContract() external view returns (address);

    function getRandomContract() external view returns (address);

    function getDenominator() external pure returns (uint256);

    function getSystemCount()
        external
        view
        returns (SystemBase.SystemCount memory);
}
