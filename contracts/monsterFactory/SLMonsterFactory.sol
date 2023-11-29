// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import {UUPSUpgradeable} from "../utils/UUPSUpgradeable.sol";

import {Monster} from "./parts/Monster.sol";
import {ISLProject} from "../project/ISLProject.sol";

contract SLMonsterFactory is Monster, UUPSUpgradeable {
    function initialize(ISLProject _projectContract) public initializer {
        __SLCotroller_init(_projectContract);
        __monsterScores_init();
    }

    function _authorizeUpgrade(address) internal override onlyOperatorMaster {}

    function __monsterScores_init() private {
        // normal monster
        monsterScores[RankType.E][false] = 1;
        monsterScores[RankType.D][false] = 2;
        monsterScores[RankType.C][false] = 4;
        monsterScores[RankType.B][false] = 16;
        monsterScores[RankType.A][false] = 32;
        monsterScores[RankType.S][false] = 64;

        // shadow monster
        monsterScores[RankType.B][true] = 160;
        monsterScores[RankType.A][true] = 320;
        monsterScores[RankType.S][true] = 640;
    }
}
