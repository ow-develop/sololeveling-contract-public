// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import {ContextUpgradeable} from "../utils/ContextUpgradeable.sol";
import {Initializable} from "../utils/Initializable.sol";

import {BaseStorage} from "./BaseStorage.sol";
import {RoleAccessError} from "../errors/RoleAccessError.sol";
import {ISLProject} from "../project/ISLProject.sol";

abstract contract SLControllerUpgradeable is
    Initializable,
    ContextUpgradeable,
    RoleAccessError
{
    ISLProject internal projectContract;

    function __SLCotroller_init(
        ISLProject _projectContract
    ) internal onlyInitializing {
        projectContract = _projectContract;
    }

    modifier onlyOperatorMaster() {
        _onlyOperatorMaster(_msgSender());
        _;
    }

    modifier onlyOperator() {
        _onlyOperator(_msgSender());
        _;
    }

    function _onlyOperatorMaster(address _account) private view {
        if (!projectContract.isOperatorMaster(_account))
            revert OnlyOperatorMaster();
    }

    function _onlyOperator(address _account) private view {
        if (!projectContract.isOperator(_account)) revert OnlyOperator();
    }

    function setProjectContract(
        ISLProject _projectContract
    ) external onlyOperatorMaster {
        projectContract = _projectContract;
    }

    function getProjectContract() external view returns (address) {
        return address(projectContract);
    }
}
