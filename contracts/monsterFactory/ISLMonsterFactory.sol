// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import {BaseStorage} from "../core/BaseStorage.sol";
import {MonsterFactoryBase} from "./MonsterFactoryBase.sol";

interface ISLMonsterFactory {
    /*
     *  Monster
     */
    function addMonster(
        BaseStorage.RankType _monsterRank,
        bool _isShadow
    ) external;

    function setMonsterRankType(
        bool _isShadow,
        uint256 _monsterId,
        BaseStorage.RankType _monsterRank
    ) external;

    function setAriseMonster(
        BaseStorage.RankType _nextMonsterRank,
        uint256 _beforeMonsterId,
        uint256 _nextMonsterId
    ) external;

    function setAriseMonsterBatch(
        BaseStorage.RankType _nextMonsterRank,
        uint256[] calldata _beforeMonsterIds,
        uint256[] calldata _nextMonsterIds
    ) external;

    function setMonsterScore(
        bool _isShadow,
        uint256[] calldata _scores
    ) external;

    /*
     *  Monster View
     */
    function isExistMonsterById(
        bool _isShadow,
        uint256 _monsterId
    ) external view returns (bool);

    function isExistMonsterBatch(
        bool _isShadow,
        uint256[] calldata _monsterIds
    ) external view returns (bool);

    function getMonsterLength(bool _isShadow) external view returns (uint256);

    function getMonsterRankType(
        bool _isShadow,
        uint256 _monsterId
    ) external view returns (BaseStorage.RankType);

    function getMonsterRankTypeBatch(
        bool _isShadow,
        uint256[] calldata _monsterIds
    ) external view returns (BaseStorage.RankType[] memory);

    function getMonsterIdOfRankType(
        BaseStorage.RankType _rankType,
        bool _isShadow
    ) external view returns (uint256[] memory);

    function isValidMonster(
        BaseStorage.RankType _rankType,
        bool _isShadow,
        uint256 _monsterId
    ) external view returns (bool);

    function isValidMonsterBatch(
        BaseStorage.RankType _rankType,
        bool _isShadow,
        uint256[] calldata _monsterIds
    ) external view returns (bool);

    function getAriseNextMonster(
        BaseStorage.RankType _nextMonsterRank,
        uint256 _beforeMonsterId
    ) external view returns (uint256);

    function getAriseBeforeMonster(
        BaseStorage.RankType _nextMonsterRank,
        uint256 _nextMonsterId
    ) external view returns (uint256);

    function getAriseNextMonsterBatch(
        BaseStorage.RankType _nextMonsterRank,
        uint256[] calldata _beforeMonsterIds
    ) external view returns (uint256[] memory);

    function getAriseBeforeMonsterBatch(
        BaseStorage.RankType _nextMonsterRank,
        uint256[] calldata _nextMonsterIds
    ) external view returns (uint256[] memory);

    function getAriseMonster(
        BaseStorage.RankType _nextMonsterRank
    )
        external
        view
        returns (
            uint256[] memory beforeMonsterIds,
            uint256[] memory nextMonsterIds
        );

    function getMonsterScore(
        BaseStorage.RankType _rankType,
        bool _isShadow
    ) external view returns (uint256);

    function getMonsterScores(
        bool _isShadow
    ) external view returns (uint256[] memory);
}
