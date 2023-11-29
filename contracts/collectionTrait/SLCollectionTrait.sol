// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import {UUPSUpgradeable} from "../utils/UUPSUpgradeable.sol";

import {TraitToken} from "./parts/TraitToken.sol";
import {ISLProject} from "../project/ISLProject.sol";

contract SLCollectionTrait is TraitToken, UUPSUpgradeable {
    function initialize(ISLProject _projectContract) public initializer {
        __SLCotroller_init(_projectContract);
    }

    function _authorizeUpgrade(address) internal override onlyOperatorMaster {}
}
