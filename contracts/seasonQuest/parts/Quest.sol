// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import {Unsafe} from "../../utils/Unsafe.sol";
import {CountersUpgradeable} from "../../utils/CountersUpgradeable.sol";
import {EnumerableSetUpgradeable} from "../../utils/EnumerableSetUpgradeable.sol";
import {SafeCastUpgradeable} from "../../utils/SafeCastUpgradeable.sol";
import {ECDSAUpgradeable} from "../../utils/ECDSAUpgradeable.sol";

import {ISLSeasonQuest} from "../ISLSeasonQuest.sol";
import {SeasonQuestBase} from "../SeasonQuestBase.sol";
import {ISLMT} from "../../collections/ISLMT.sol";

abstract contract Quest is ISLSeasonQuest, SeasonQuestBase {
    using Unsafe for uint256;
    using CountersUpgradeable for CountersUpgradeable.Counter;
    using EnumerableSetUpgradeable for EnumerableSetUpgradeable.UintSet;
    using SafeCastUpgradeable for uint256;

    /*
     *  Quest
     */
    function addGeneralQuest(QuestInput calldata _quest) external onlyOperator {
        _addQuest(_quest, QuestType.General);
    }

    function addMonsterSetQuest(
        QuestInput calldata _quest,
        MonsterSet calldata _monsterSet
    ) external onlyOperator {
        if (!_checkMonsterSet(_monsterSet)) revert InvalidMonster();

        uint256 questId = _addQuest(_quest, QuestType.MonsterSet);

        monsterSets[questId] = _monsterSet;
    }

    function addMonsterTraitQuest(
        QuestInput calldata _quest,
        MonsterTrait calldata _monsterTrait
    ) external onlyOperator {
        if (!_checkMonsterTrait(_monsterTrait)) revert InvalidTrait();

        uint256 questId = _addQuest(_quest, QuestType.MonsterTrait);

        monsterTraits[questId] = _monsterTrait;
    }

    function setQuestActive(
        uint256 _questId,
        bool _isActive
    ) external onlyOperator {
        if (!isExistQuestById(_questId)) revert InvalidQuestId();

        quests[_questId].isActive = _isActive;
    }

    function _addQuest(
        QuestInput calldata _quest,
        QuestType _questType
    ) internal returns (uint256) {
        if (seasonContract.isEndedSeasonById(_quest.seasonId)) {
            revert EndedSeason();
        }

        if (_quest.requiredQuestId != 0) {
            if (!isActiveQuest(_quest.requiredQuestId)) revert UnActiveQuest();
        }

        questIds.increment();
        uint64 questId = questIds.current().toUint64();

        // check hunter item ids
        if (_quest.hunterItemIds.length > 0) {
            address hunterItem = projectContract.getTokenContractByCollectionId(
                hunterItemCollectionId
            );
            if (!ISLMT(hunterItem).existsBatch(_quest.hunterItemIds))
                revert InvalidHunterItemId();
        }

        quests[questId] = Quest({
            id: questId,
            seasonId: _quest.seasonId,
            rewardScore: _quest.rewardScore,
            completableCount: _quest.completableCount,
            requiredQuestId: _quest.requiredQuestId,
            isActive: true,
            questType: _questType,
            rankType: _quest.rankType,
            hunterItemIds: _quest.hunterItemIds
        });

        questOfSeason[_quest.seasonId].add(questId);
        questOfQuestType[_quest.seasonId][_questType].add(questId);

        emitCreate("Quest", questId);

        return questIds.current();
    }

    function _checkMonsterSet(
        MonsterSet calldata _monsterSet
    ) private view returns (bool) {
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

        if (_monsterSet.normalMonsterIds.length > 0) {
            if (
                !monsterFactoryContract.isExistMonsterBatch(
                    false,
                    _monsterSet.normalMonsterIds
                )
            ) {
                return false;
            }
        }

        if (_monsterSet.shadowMonsterIds.length > 0) {
            if (
                !monsterFactoryContract.isExistMonsterBatch(
                    true,
                    _monsterSet.shadowMonsterIds
                )
            ) {
                return false;
            }
        }

        return true;
    }

    function _checkMonsterTrait(
        MonsterTrait calldata _monsterTrait
    ) private view returns (bool) {
        if (
            _monsterTrait.requiredNormalMonster +
                _monsterTrait.requiredShadowMonster <
            1
        ) return false;

        Trait[] memory traits = _monsterTrait.traits;

        for (uint256 i = 0; i < traits.length; i = i.increment()) {
            uint256 currentTypeId = traits[i].traitTypeId;

            if (!collectionTraitContract.isActiveTraitType(currentTypeId))
                return false;

            if (
                !collectionTraitContract.isContainTraitValueOfType(
                    currentTypeId,
                    traits[i].traitValueId
                )
            ) return false;

            for (uint256 j = i + 1; j < traits.length; j = j.increment()) {
                if (currentTypeId == traits[j].traitTypeId) return false;
            }
        }

        return true;
    }

    /*
     *  View
     */
    function isExistQuestById(uint256 _questId) public view returns (bool) {
        return _questId != 0 && _questId <= questIds.current();
    }

    function isActiveQuest(uint256 _questId) public view returns (bool) {
        return quests[_questId].isActive;
    }

    function getQuestCompletedCount(
        uint256 _questId,
        address _hunter
    ) public view returns (uint256) {
        return questCompleted[_questId][_hunter].current();
    }

    function getQuestById(
        uint256 _questId
    ) external view returns (Quest memory) {
        if (!isExistQuestById(_questId)) revert InvalidQuestId();

        return quests[_questId];
    }

    function getMonsterSetQuestById(
        uint256 _questId
    ) external view returns (Quest memory quest, MonsterSet memory monsterSet) {
        if (!isExistQuestById(_questId)) revert InvalidQuestId();

        if (quests[_questId].questType != QuestType.MonsterSet)
            revert InvalidQuestId();

        quest = quests[_questId];
        monsterSet = monsterSets[_questId];
    }

    function getMonsterTraitQuestById(
        uint256 _questId
    )
        external
        view
        returns (Quest memory quest, MonsterTrait memory monsterTrait)
    {
        if (!isExistQuestById(_questId)) revert InvalidQuestId();

        if (quests[_questId].questType != QuestType.MonsterTrait)
            revert InvalidQuestId();

        quest = quests[_questId];
        monsterTrait = monsterTraits[_questId];
    }

    function getQuestTypeById(
        uint256 _questId
    ) external view returns (QuestType) {
        if (!isExistQuestById(_questId)) revert InvalidQuestId();

        return quests[_questId].questType;
    }

    function getQuestLength() external view returns (uint256) {
        return questIds.current();
    }

    function getQuestIdOfSeason(
        uint256 _seasonId,
        bool _activeFilter
    ) external view returns (uint256[] memory) {
        if (!seasonContract.isExistSeasonById(_seasonId)) {
            revert InvalidSeasonId();
        }

        uint256[] memory questOfSeason = questOfSeason[_seasonId].values();

        if (!_activeFilter) {
            return questOfSeason;
        }

        uint256 questCount;

        for (uint256 i = 0; i < questOfSeason.length; i = i.increment()) {
            if (quests[questOfSeason[i]].isActive) {
                questCount = questCount.increment();
            }
        }

        uint256[] memory activeQuestOfSeason = new uint256[](questCount);
        uint256 index;

        for (uint256 i = 0; i < questOfSeason.length; i = i.increment()) {
            if (quests[questOfSeason[i]].isActive) {
                activeQuestOfSeason[index] = questOfSeason[i];
                index = index.increment();
            }
        }

        return activeQuestOfSeason;
    }

    function getQuestIdOfQuestType(
        uint256 _seasonId,
        QuestType _questType
    ) external view returns (uint256[] memory) {
        if (!seasonContract.isExistSeasonById(_seasonId)) {
            revert InvalidSeasonId();
        }

        return questOfQuestType[_seasonId][_questType].values();
    }

    function getHunterQuestScore(
        uint256 _seasonId,
        address _hunter
    ) external view returns (uint256) {
        if (!seasonContract.isExistSeasonById(_seasonId)) {
            revert InvalidSeasonId();
        }

        return _getHunterQuestScore(_seasonId, _hunter);
    }

    function getHunterQuestScoreBatch(
        uint256 _seasonId,
        address[] calldata _hunters
    ) external view returns (uint256[] memory) {
        if (!seasonContract.isExistSeasonById(_seasonId)) {
            revert InvalidSeasonId();
        }

        uint256 hunterCount = _hunters.length;

        uint256[] memory scores = new uint256[](hunterCount);

        for (uint256 i = 0; i < hunterCount; i = i.increment()) {
            scores[i] = _getHunterQuestScore(_seasonId, _hunters[i]);
        }

        return scores;
    }

    function _getHunterQuestScore(
        uint256 _seasonId,
        address _hunter
    ) private view returns (uint256) {
        return questScores[_seasonId][_hunter];
    }
}
