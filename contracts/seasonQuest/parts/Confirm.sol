// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import {Unsafe} from "../../utils/Unsafe.sol";
import {CountersUpgradeable} from "../../utils/CountersUpgradeable.sol";
import {ECDSAUpgradeable} from "../../utils/ECDSAUpgradeable.sol";

import {Quest} from "./Quest.sol";
import {SeasonBase} from "../../season/SeasonBase.sol";
import {ISLMT} from "../../collections/ISLMT.sol";

abstract contract Confirm is Quest {
    using Unsafe for uint256;
    using CountersUpgradeable for CountersUpgradeable.Counter;
    using ECDSAUpgradeable for bytes32;

    /*
     *  Confirm
     */
    function confirmGeneralQuest(
        uint256 _questId,
        bytes calldata _questSignature
    ) external {
        address hunter = _msgSender();

        Quest memory quest = quests[_questId];

        _checkQuest(hunter, quest, QuestType.General);

        if (!_verifyQuestSignature(_questSignature, _questId, hunter))
            revert GeneralQuestVerifyFailed();

        _completeQuest(hunter, quest);
    }

    function confirmMonsterSetQuest(uint256 _questId) external {
        address hunter = _msgSender();

        Quest memory quest = quests[_questId];

        _checkQuest(hunter, quest, QuestType.MonsterSet);

        MonsterSet memory monsterSet = monsterSets[_questId];

        if (monsterSet.normalMonsterIds.length > 0) {
            _burnMonster(
                hunter,
                false,
                monsterSet.normalMonsterIds,
                monsterSet.normalMonsterAmounts
            );
        }

        if (monsterSet.shadowMonsterIds.length > 0) {
            _burnMonster(
                hunter,
                true,
                monsterSet.shadowMonsterIds,
                monsterSet.shadowMonsterAmounts
            );
        }

        _completeQuest(hunter, quest);
    }

    function confirmMonsterTraitQuest(
        uint256 _questId,
        MonsterSet calldata _traitMonsterSet
    ) external {
        address hunter = _msgSender();

        Quest memory quest = quests[_questId];

        _checkQuest(hunter, quest, QuestType.MonsterTrait);
        _checkTraitMonsterSet(_questId, _traitMonsterSet);

        if (_traitMonsterSet.normalMonsterIds.length > 0) {
            _burnMonster(
                hunter,
                false,
                _traitMonsterSet.normalMonsterIds,
                _traitMonsterSet.normalMonsterAmounts
            );
        }

        if (_traitMonsterSet.shadowMonsterIds.length > 0) {
            _burnMonster(
                hunter,
                true,
                _traitMonsterSet.shadowMonsterIds,
                _traitMonsterSet.shadowMonsterAmounts
            );
        }

        _completeQuest(hunter, quest);
    }

    function _checkQuest(
        address _hunter,
        Quest memory _quest,
        QuestType _requestQuestType
    ) private view {
        if (!isActiveQuest(_quest.id)) revert UnActiveQuest();

        if (!seasonContract.isCurrentSeasonById(_quest.seasonId))
            revert InvalidSeasonId();

        if (_requestQuestType != _quest.questType) revert InvalidQuestType();

        // check completable count
        if (_quest.completableCount != 0) {
            if (
                getQuestCompletedCount(_quest.id, _hunter) >=
                _quest.completableCount
            ) revert ExceedCompletableCount();
        }

        // check required quest
        if (_quest.requiredQuestId != 0) {
            if (getQuestCompletedCount(_quest.requiredQuestId, _hunter) < 1)
                revert NotCompleteRequiredQuest();
        }

        // check hunter rank
        RankType hunterRank = seasonContract.getHunterRank(
            _quest.seasonId,
            _hunter
        );
        if (hunterRank < _quest.rankType) revert InvalidHunterRank();
    }

    function _completeQuest(address _hunter, Quest memory _quest) private {
        // counting quest completed
        questCompleted[_quest.id][_hunter].increment();

        uint256 seasonId = _quest.seasonId;

        // mint hunter item
        if (_quest.hunterItemIds.length > 0) {
            address hunterItem = projectContract.getTokenContractByCollectionId(
                hunterItemCollectionId
            );
            ISLMT(hunterItem).mintBatch(
                _hunter,
                _quest.hunterItemIds,
                _asUintArray(1, _quest.hunterItemIds.length)
            );
        }

        questScores[seasonId][_hunter] += _quest.rewardScore;
        uint256 currentScore = questScores[seasonId][_hunter];

        emit QuestCompleted(_hunter, _quest.id, currentScore, block.timestamp);
    }

    function _verifyQuestSignature(
        bytes calldata _signature,
        uint256 _questId,
        address _hunter
    ) internal view returns (bool) {
        bytes32 data = keccak256(
            abi.encodePacked(
                _questId,
                _hunter,
                getQuestCompletedCount(_questId, _hunter)
            )
        );

        bytes32 signedHash = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", data)
        );
        address signer = signedHash.recover(_signature);

        return projectContract.isOperator(signer);
    }

    function _burnMonster(
        address _hunter,
        bool _isShadow,
        uint256[] memory _monsterIds,
        uint256[] memory _monsterAmounts
    ) private {
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

        monsterContract.burnBatch(_hunter, _monsterIds, _monsterAmounts);
    }

    function _checkTraitMonsterSet(
        uint256 _questId,
        MonsterSet calldata _traitMonsterSet
    ) private view {
        MonsterTrait memory monsterTrait = monsterTraits[_questId];

        uint256 normalMonsterAmount;
        for (
            uint256 i = 0;
            i < _traitMonsterSet.normalMonsterAmounts.length;
            i = i.increment()
        ) {
            normalMonsterAmount += _traitMonsterSet.normalMonsterAmounts[i];
        }

        if (normalMonsterAmount != monsterTrait.requiredNormalMonster)
            revert InvalidMonster();

        uint256 shadowMonsterAmount;
        for (
            uint256 i = 0;
            i < _traitMonsterSet.shadowMonsterAmounts.length;
            i = i.increment()
        ) {
            shadowMonsterAmount += _traitMonsterSet.shadowMonsterAmounts[i];
        }
        if (shadowMonsterAmount != monsterTrait.requiredShadowMonster)
            revert InvalidMonster();

        Trait[] memory traits = monsterTrait.traits;

        if (normalMonsterAmount > 0) {
            for (uint256 i = 0; i < traits.length; i = i.increment()) {
                if (
                    !collectionTraitContract.isContainTokenOfTraitValueBatch(
                        traits[i].traitValueId,
                        normalMonsterCollectionId,
                        _traitMonsterSet.normalMonsterIds
                    )
                ) {
                    revert InvalidMonster();
                }
            }
        }

        if (shadowMonsterAmount > 0) {
            for (uint256 i = 0; i < traits.length; i = i.increment()) {
                if (
                    !collectionTraitContract.isContainTokenOfTraitValueBatch(
                        traits[i].traitValueId,
                        shadowMonsterCollectionId,
                        _traitMonsterSet.shadowMonsterIds
                    )
                ) {
                    revert InvalidMonster();
                }
            }
        }
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
}
