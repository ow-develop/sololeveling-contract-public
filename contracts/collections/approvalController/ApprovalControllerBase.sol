// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import {EnumerableSet} from "../../utils/EnumerableSet.sol";

import {SLBase} from "../../core/SLBase.sol";
import {SLController} from "../../core/SLController.sol";
import {ApprovalControllerError} from "../../errors/ApprovalControllerError.sol";

/// @notice Core storage and event for approval controller contract
abstract contract ApprovalControllerBase is
    SLBase,
    SLController,
    ApprovalControllerError
{
    EnumerableSet.AddressSet internal approvedContracts;

    /*
     *  Mapping
     */
    /// @notice account to approval revoked
    mapping(address => bool) internal approvalRevoked;

    /*
     *  Event
     */
    event ContractAdded(address indexed contractAddress, uint256 timestamp);

    event ContractRemoved(address indexed contractAddress, uint256 timestamp);

    event Revoked(address indexed account, uint256 timestamp);

    event Approved(address indexed account, uint256 timestamp);
}
