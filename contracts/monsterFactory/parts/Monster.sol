// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import {Unsafe} from "../../utils/Unsafe.sol";
import {CountersUpgradeable} from "../../utils/CountersUpgradeable.sol";
import {EnumerableSetUpgradeable} from "../../utils/EnumerableSetUpgradeable.sol";

import {ISLMonsterFactory} from "../ISLMonsterFactory.sol";
import {MonsterFactoryBase} from "../MonsterFactoryBase.sol";

abstract contract Monster is ISLMonsterFactory, MonsterFactoryBase {
    using Unsafe for uint256;
    using CountersUpgradeable for CountersUpgradeable.Counter;
    using EnumerableSetUpgradeable for EnumerableSetUpgradeable.UintSet;

    /*
     *  Monster
     */
    function addMonster(
        RankType _monsterRank,
        bool _isShadow
    ) external onlyOperator {
        if (_monsterRank < RankType.B && _isShadow) revert InvalidRankType();

        monsterIds[_isShadow].increment();
        uint256 monsterId = monsterIds[_isShadow].current();

        monsterOfRankType[_monsterRank][_isShadow].add(monsterId);
        monsterRankTypes[_isShadow][monsterId] = _monsterRank;

        emit AddMonster(_monsterRank, _isShadow, monsterId, block.timestamp);
    }

    function setMonsterRankType(
        bool _isShadow,
        uint256 _monsterId,
        RankType _monsterRank
    ) external onlyOperator {
        if (_monsterRank < RankType.B && _isShadow) revert InvalidRankType();

        if (!isExistMonsterById(_isShadow, _monsterId))
            revert InvalidMonsterId();

        RankType beforeRankType = monsterRankTypes[_isShadow][_monsterId];
        monsterOfRankType[beforeRankType][_isShadow].remove(_monsterId);

        monsterOfRankType[_monsterRank][_isShadow].add(_monsterId);
        monsterRankTypes[_isShadow][_monsterId] = _monsterRank;

        emit SetMonsterRankType(
            _isShadow,
            _monsterId,
            _monsterRank,
            block.timestamp
        );
    }

    function setAriseMonster(
        RankType _nextMonsterRank,
        uint256 _beforeMonsterId,
        uint256 _nextMonsterId
    ) external onlyOperator {
        if (_nextMonsterRank < RankType.B) revert InvalidRankType();

        if (_nextMonsterRank == RankType.B) {
            if (
                !isValidMonster(RankType.S, false, _beforeMonsterId) ||
                !isValidMonster(RankType.B, true, _nextMonsterId)
            ) revert InvalidMonsterId();
        } else {
            if (
                !isValidMonster(
                    RankType(uint256(_nextMonsterRank) - 1),
                    true,
                    _beforeMonsterId
                ) || !isValidMonster(_nextMonsterRank, true, _nextMonsterId)
            ) revert InvalidMonsterId();
        }

        uint256 existingNextMonsterId = ariseNextMonsterIds[_nextMonsterRank][
            _beforeMonsterId
        ];
        uint256 existingBeforeMonsterId = ariseBeforeMonsterIds[
            _nextMonsterRank
        ][_nextMonsterId];

        if (existingNextMonsterId != 0) {
            ariseBeforeMonsterIds[_nextMonsterRank][existingNextMonsterId] = 0;
        }

        if (existingBeforeMonsterId != 0) {
            ariseNextMonsterIds[_nextMonsterRank][existingBeforeMonsterId] = 0;
        }

        ariseNextMonsterIds[_nextMonsterRank][
            _beforeMonsterId
        ] = _nextMonsterId;
        ariseBeforeMonsterIds[_nextMonsterRank][
            _nextMonsterId
        ] = _beforeMonsterId;

        emit SetAriseMonster(
            _nextMonsterRank,
            _beforeMonsterId,
            _nextMonsterId,
            block.timestamp
        );
    }

    function setAriseMonsterBatch(
        RankType _nextMonsterRank,
        uint256[] calldata _beforeMonsterIds,
        uint256[] calldata _nextMonsterIds
    ) external onlyOperator {
        if (_nextMonsterRank < RankType.B) revert InvalidRankType();

        if (_beforeMonsterIds.length != _nextMonsterIds.length)
            revert InvalidMonsterId();

        if (_nextMonsterRank == RankType.B) {
            if (
                !isValidMonsterBatch(RankType.S, false, _beforeMonsterIds) ||
                !isValidMonsterBatch(RankType.B, true, _nextMonsterIds)
            ) revert InvalidMonsterId();
        } else {
            if (
                !isValidMonsterBatch(
                    RankType(uint256(_nextMonsterRank) - 1),
                    true,
                    _beforeMonsterIds
                ) ||
                !isValidMonsterBatch(_nextMonsterRank, true, _nextMonsterIds)
            ) revert InvalidMonsterId();
        }

        for (uint256 i = 0; i < _beforeMonsterIds.length; i = i.increment()) {
            uint256 beforeMonsterId = _beforeMonsterIds[i];
            uint256 nextMonsterId = _nextMonsterIds[i];
            uint256 existingNextMonsterId = ariseNextMonsterIds[
                _nextMonsterRank
            ][beforeMonsterId];
            uint256 existingBeforeMonsterId = ariseBeforeMonsterIds[
                _nextMonsterRank
            ][nextMonsterId];

            if (existingNextMonsterId != 0) {
                ariseBeforeMonsterIds[_nextMonsterRank][
                    existingNextMonsterId
                ] = 0;
            }

            if (existingBeforeMonsterId != 0) {
                ariseNextMonsterIds[_nextMonsterRank][
                    existingBeforeMonsterId
                ] = 0;
            }

            ariseNextMonsterIds[_nextMonsterRank][
                beforeMonsterId
            ] = nextMonsterId;
            ariseBeforeMonsterIds[_nextMonsterRank][
                nextMonsterId
            ] = beforeMonsterId;
        }

        emit SetAriseMonsterBatch(
            _nextMonsterRank,
            _beforeMonsterIds,
            _nextMonsterIds,
            block.timestamp
        );
    }

    function setMonsterScore(
        bool _isShadow,
        uint256[] calldata _scores
    ) external onlyOperator {
        if (_isShadow) {
            if (_scores.length != 3) revert InvalidArgument();
        } else {
            if (_scores.length != 6) revert InvalidArgument();
        }

        uint256 startRank = _isShadow
            ? uint256(RankType.B)
            : uint256(RankType.E);

        for (uint256 i = 0; i < _scores.length; i = i.increment()) {
            monsterScores[RankType(startRank + i)][_isShadow] = _scores[i];
        }
    }

    /*
     *  View
     */
    function isExistMonsterById(
        bool _isShadow,
        uint256 _monsterId
    ) public view returns (bool) {
        return _monsterId != 0 && _monsterId <= monsterIds[_isShadow].current();
    }

    function isExistMonsterBatch(
        bool _isShadow,
        uint256[] calldata _monsterIds
    ) public view returns (bool) {
        for (uint256 i = 0; i < _monsterIds.length; i = i.increment()) {
            if (!isExistMonsterById(_isShadow, _monsterIds[i])) return false;
        }

        return true;
    }

    function getMonsterLength(bool _isShadow) external view returns (uint256) {
        return monsterIds[_isShadow].current();
    }

    function getMonsterRankType(
        bool _isShadow,
        uint256 _monsterId
    ) public view returns (RankType) {
        if (!isExistMonsterById(_isShadow, _monsterId))
            revert InvalidMonsterId();

        return monsterRankTypes[_isShadow][_monsterId];
    }

    function getMonsterRankTypeBatch(
        bool _isShadow,
        uint256[] calldata _monsterIds
    ) external view returns (RankType[] memory) {
        RankType[] memory rankTypes = new RankType[](_monsterIds.length);

        for (uint256 i = 0; i < _monsterIds.length; i++) {
            rankTypes[i] = getMonsterRankType(_isShadow, _monsterIds[i]);
        }

        return rankTypes;
    }

    function getMonsterIdOfRankType(
        RankType _rankType,
        bool _isShadow
    ) public view returns (uint256[] memory) {
        return monsterOfRankType[_rankType][_isShadow].values();
    }

    function isValidMonster(
        RankType _rankType,
        bool _isShadow,
        uint256 _monsterId
    ) public view returns (bool) {
        return monsterOfRankType[_rankType][_isShadow].contains(_monsterId);
    }

    function isValidMonsterBatch(
        RankType _rankType,
        bool _isShadow,
        uint256[] calldata _monsterIds
    ) public view returns (bool) {
        for (uint256 i = 0; i < _monsterIds.length; i = i.increment()) {
            if (!isValidMonster(_rankType, _isShadow, _monsterIds[i]))
                return false;
        }

        return true;
    }

    function getAriseNextMonster(
        RankType _nextMonsterRank,
        uint256 _beforeMonsterId
    ) public view returns (uint256) {
        if (_nextMonsterRank < RankType.B) revert InvalidRankType();

        uint256 nextMonsterId = ariseNextMonsterIds[_nextMonsterRank][
            _beforeMonsterId
        ];

        if (nextMonsterId == 0) revert DoesNotExistAriseMonster();

        return nextMonsterId;
    }

    function getAriseBeforeMonster(
        RankType _nextMonsterRank,
        uint256 _nextMonsterId
    ) public view returns (uint256) {
        if (_nextMonsterRank < RankType.B) revert InvalidRankType();

        uint256 beforeMonsterId = ariseBeforeMonsterIds[_nextMonsterRank][
            _nextMonsterId
        ];

        if (beforeMonsterId == 0) revert DoesNotExistAriseMonster();

        return beforeMonsterId;
    }

    function getAriseNextMonsterBatch(
        RankType _nextMonsterRank,
        uint256[] calldata _beforeMonsterIds
    ) external view returns (uint256[] memory) {
        if (_nextMonsterRank < RankType.B) revert InvalidRankType();

        uint256 monsterCount = _beforeMonsterIds.length;

        uint256[] memory nextMonsterIds = new uint256[](monsterCount);

        for (uint256 i = 0; i < monsterCount; i = i.increment()) {
            nextMonsterIds[i] = getAriseNextMonster(
                _nextMonsterRank,
                _beforeMonsterIds[i]
            );
        }

        return nextMonsterIds;
    }

    function getAriseBeforeMonsterBatch(
        RankType _nextMonsterRank,
        uint256[] calldata _nextMonsterIds
    ) external view returns (uint256[] memory) {
        if (_nextMonsterRank < RankType.B) revert InvalidRankType();

        uint256 monsterCount = _nextMonsterIds.length;

        uint256[] memory beforeMonsterIds = new uint256[](monsterCount);

        for (uint256 i = 0; i < monsterCount; i = i.increment()) {
            beforeMonsterIds[i] = getAriseBeforeMonster(
                _nextMonsterRank,
                _nextMonsterIds[i]
            );
        }

        return beforeMonsterIds;
    }

    function getAriseMonster(
        RankType _nextMonsterRank
    )
        external
        view
        returns (
            uint256[] memory beforeMonsterIds,
            uint256[] memory nextMonsterIds
        )
    {
        if (_nextMonsterRank < RankType.B) revert InvalidRankType();

        beforeMonsterIds = _nextMonsterRank == RankType.B
            ? getMonsterIdOfRankType(RankType.S, false)
            : getMonsterIdOfRankType(
                RankType(uint256(_nextMonsterRank) - 1),
                true
            );

        uint256 monsterCount = beforeMonsterIds.length;

        nextMonsterIds = new uint256[](monsterCount);

        for (uint256 i = 0; i < monsterCount; i = i.increment()) {
            nextMonsterIds[i] = getAriseNextMonster(
                _nextMonsterRank,
                beforeMonsterIds[i]
            );
        }
    }

    function getMonsterScore(
        RankType _rankType,
        bool _isShadow
    ) external view returns (uint256) {
        return monsterScores[_rankType][_isShadow];
    }

    function getMonsterScores(
        bool _isShadow
    ) external view returns (uint256[] memory) {
        uint256 scoreLength = _isShadow ? 3 : 6;
        uint256[] memory scroes = new uint256[](scoreLength);

        uint256 startRank = _isShadow
            ? uint256(RankType.B)
            : uint256(RankType.E);

        for (uint256 i = 0; i < scroes.length; i = i.increment()) {
            scroes[i] = monsterScores[RankType(startRank + i)][_isShadow];
        }

        return scroes;
    }
}
