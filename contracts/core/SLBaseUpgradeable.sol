// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import {ContextUpgradeable} from "../utils/ContextUpgradeable.sol";

import {BaseStorage} from "./BaseStorage.sol";

abstract contract SLBaseUpgradeable is ContextUpgradeable, BaseStorage {
    function emitCreate(string memory _target, uint64 _targetId) internal {
        emit Create(_target, _targetId, block.timestamp);
    }
}
