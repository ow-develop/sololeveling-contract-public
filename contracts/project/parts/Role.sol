// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import {ERC165CheckerUpgradeable} from "../../utils/ERC165CheckerUpgradeable.sol";

import {ISLProject} from "../ISLProject.sol";
import {ProjectBase} from "../ProjectBase.sol";
import {ISLRoleWallet} from "../../wallet/ISLRoleWallet.sol";

abstract contract Role is ISLProject, ProjectBase {
    using ERC165CheckerUpgradeable for address;

    /*
     *  Authorization
     */
    modifier onlyOperatorMaster() {
        _onlyOperatorMaster(_msgSender());
        _;
    }

    modifier onlyOperator() {
        _onlyOperator(_msgSender());
        _;
    }

    function isOperatorMaster(address _account) public view returns (bool) {
        return operator.isMaster(_account);
    }

    function isOperator(address _account) public view returns (bool) {
        return operator.hasRole(_account);
    }

    function _onlyOperatorMaster(address _account) private view {
        if (!isOperatorMaster(_account)) revert OnlyOperatorMaster();
    }

    function _onlyOperator(address _account) private view {
        if (!isOperator(_account)) revert OnlyOperator();
    }

    /*
     *  Role
     */
    function setOperator(ISLRoleWallet _operator) external onlyOperatorMaster {
        if (
            !address(_operator).supportsInterface(
                type(ISLRoleWallet).interfaceId
            )
        ) {
            revert InvalidOperator();
        }

        operator = _operator;
        emit SetOperator(address(_operator), block.timestamp);
    }

    /*
     *  View
     */
    function getOperator() external view returns (address) {
        return address(operator);
    }
}
