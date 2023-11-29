// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import {UUPSUpgradeable} from "../utils/UUPSUpgradeable.sol";

import {Collection} from "./parts/Collection.sol";
import {ISLRoleWallet} from "../wallet/ISLRoleWallet.sol";

contract SLProject is Collection, UUPSUpgradeable {
    function initialize(ISLRoleWallet _operator) public initializer {
        operator = _operator;
    }

    function _authorizeUpgrade(address) internal override onlyOperatorMaster {}
}
