// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import {UUPSUpgradeable} from "../utils/UUPSUpgradeable.sol";

import {HunterRank} from "./parts/HunterRank.sol";
import {ISLProject} from "../project/ISLProject.sol";
import {ISLMonsterFactory} from "../monsterFactory/ISLMonsterFactory.sol";

contract SLSeason is HunterRank, UUPSUpgradeable {
    function initialize(ISLProject _projectContract) public initializer {
        __SLCotroller_init(_projectContract);
    }

    function _authorizeUpgrade(address) internal override onlyOperatorMaster {}
}
