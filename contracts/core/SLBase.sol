// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import {Context} from "../utils/Context.sol";

import {BaseStorage} from "./BaseStorage.sol";

abstract contract SLBase is Context, BaseStorage {
    function emitCreate(string memory _target, uint64 _targetId) internal {
        emit Create(_target, _targetId, block.timestamp);
    }
}
