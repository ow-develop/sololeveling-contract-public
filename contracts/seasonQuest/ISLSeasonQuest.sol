// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import {BaseStorage} from "../core/BaseStorage.sol";
import {SeasonQuestBase} from "./SeasonQuestBase.sol";
import {ISLMonsterFactory} from "../monsterFactory/ISLMonsterFactory.sol";
import {ISLCollectionTrait} from "../collectionTrait/ISLCollectionTrait.sol";
import {ISLSeason} from "../season/ISLSeason.sol";

interface ISLSeasonQuest {
    /*
     *  Quest
     */
    function addGeneralQuest(
        SeasonQuestBase.QuestInput calldata _quest
    ) external;

    function addMonsterSetQuest(
        SeasonQuestBase.QuestInput calldata _quest,
        SeasonQuestBase.MonsterSet calldata _monsterSet
    ) external;

    function addMonsterTraitQuest(
        SeasonQuestBase.QuestInput calldata _quest,
        SeasonQuestBase.MonsterTrait calldata _monsterTrait
    ) external;

    function setQuestActive(uint256 _questId, bool _isActive) external;

    function isExistQuestById(uint256 _questId) external view returns (bool);

    function isActiveQuest(uint256 _questId) external view returns (bool);

    function getQuestCompletedCount(
        uint256 _questId,
        address _hunter
    ) external view returns (uint256);

    function getQuestById(
        uint256 _questId
    ) external view returns (SeasonQuestBase.Quest memory);

    function getMonsterSetQuestById(
        uint256 _questId
    )
        external
        view
        returns (
            SeasonQuestBase.Quest memory quest,
            SeasonQuestBase.MonsterSet memory monsterSet
        );

    function getMonsterTraitQuestById(
        uint256 _questId
    )
        external
        view
        returns (
            SeasonQuestBase.Quest memory quest,
            SeasonQuestBase.MonsterTrait memory monsterTrait
        );

    function getQuestTypeById(
        uint256 _questId
    ) external view returns (SeasonQuestBase.QuestType);

    function getQuestLength() external view returns (uint256);

    function getQuestIdOfSeason(
        uint256 _seasonId,
        bool _activeFilter
    ) external view returns (uint256[] memory);

    function getQuestIdOfQuestType(
        uint256 _seasonId,
        SeasonQuestBase.QuestType _questType
    ) external view returns (uint256[] memory);

    function getHunterQuestScore(
        uint256 _seasonId,
        address _hunter
    ) external view returns (uint256);

    function getHunterQuestScoreBatch(
        uint256 _seasonId,
        address[] calldata _hunters
    ) external view returns (uint256[] memory);

    /*
     *  Comfirm
     */
    function confirmGeneralQuest(
        uint256 _questId,
        bytes calldata _questSignature
    ) external;

    function confirmMonsterSetQuest(uint256 _questId) external;

    function confirmMonsterTraitQuest(
        uint256 _questId,
        SeasonQuestBase.MonsterSet calldata _traitMonsterSet
    ) external;

    /*
     *  Collection
     */
    function setHunterItemCollectionId(
        uint256 _hunterItemCollectionId
    ) external;

    function setMonsterCollectionId(
        uint256 _monsterCollectionId,
        bool _isShadow
    ) external;

    function getHunterItemCollectionId() external view returns (uint256);

    function getMonsterCollectionId(
        bool _isShadow
    ) external view returns (uint256);

    /*
     *  Base
     */
    function setMonsterFactoryContract(
        ISLMonsterFactory _monsterFactoryContract
    ) external;

    function setCollectionTraitContract(
        ISLCollectionTrait _collectionTraitContract
    ) external;

    function setSeasonContract(ISLSeason _seasonContract) external;

    function getMonsterFactoryContract() external view returns (address);

    function getCollectionTraitContract() external view returns (address);

    function getSeasonContract() external view returns (address);
}
