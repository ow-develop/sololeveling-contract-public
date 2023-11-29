// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import {Unsafe} from "../../utils/Unsafe.sol";
import {EnumerableSet} from "../../utils/EnumerableSet.sol";

import {SLController} from "../../core/SLController.sol";
import {MintControllerError} from "../../errors/MintControllerError.sol";

abstract contract MintController is SLController, MintControllerError {
    using Unsafe for uint256;
    using EnumerableSet for EnumerableSet.AddressSet;

    EnumerableSet.AddressSet internal controllers;

    event ControllerAdded(address indexed controller, uint256 timestamp);
    event ControllerRemoved(address indexed controller, uint256 timestamp);

    constructor(address[] memory _controllers) {
        for (uint256 i = 0; i < _controllers.length; i = i.increment()) {
            controllers.add(_controllers[i]);

            emit ControllerAdded(_controllers[i], block.timestamp);
        }
    }

    modifier onlyController() {
        _onlyController();
        _;
    }

    function _onlyController() private view {
        if (!controllers.contains(_msgSender())) {
            revert OnlyController();
        }
    }

    function addController(address _controller) external onlyOperator {
        controllers.add(_controller);

        emit ControllerAdded(_controller, block.timestamp);
    }

    function removeController(address _controller) external onlyOperator {
        controllers.remove(_controller);

        emit ControllerRemoved(_controller, block.timestamp);
    }

    function getControllers() external view returns (address[] memory) {
        return controllers.values();
    }
}
