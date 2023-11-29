// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import {Unsafe} from "../../utils/Unsafe.sol";
import {EnumerableSet} from "../../utils/EnumerableSet.sol";

import {ISLApprovalController} from "./ISLApprovalController.sol";
import {ApprovalControllerBase} from "./ApprovalControllerBase.sol";
import {SLController} from "../../core/SLController.sol";
import {ISLProject} from "../../project/ISLProject.sol";

contract SLApprovalController is ISLApprovalController, ApprovalControllerBase {
    using Unsafe for uint256;
    using EnumerableSet for EnumerableSet.AddressSet;

    constructor(
        ISLProject _projectContract,
        address[] memory _contracts // seasonContract, dungeonGateContract, systemContract
    ) SLController(_projectContract) {
        __approvedContracts_init(_contracts);
    }

    function __approvedContracts_init(address[] memory _contracts) private {
        for (uint256 i = 0; i < _contracts.length; i = i.increment()) {
            address contractAddress = _contracts[i];

            approvedContracts.add(contractAddress);

            emit ContractAdded(contractAddress, block.timestamp);
        }
    }

    function addApprovedContract(address _contract) external onlyOperator {
        if (isApprovedContract(_contract)) {
            revert AlreadyExistContract();
        }

        approvedContracts.add(_contract);

        emit ContractAdded(_contract, block.timestamp);
    }

    function removeApprovedContract(address _contract) external onlyOperator {
        if (!isApprovedContract(_contract)) {
            revert DoesNotExistContract();
        }

        approvedContracts.remove(_contract);

        emit ContractRemoved(_contract, block.timestamp);
    }

    function getApprovedContracts() external view returns (address[] memory) {
        return approvedContracts.values();
    }

    function getApprovedContractLength() external view returns (uint256) {
        return approvedContracts.length();
    }

    function getApprovedContractByIndex(
        uint256 _index
    ) external view returns (address) {
        if (approvedContracts.length() <= _index) {
            revert DoesNotExistContract();
        }

        return approvedContracts.at(_index);
    }

    function isApprovedContract(address _contract) public view returns (bool) {
        return approvedContracts.contains(_contract);
    }

    function revoke() external {
        address account = _msgSender();

        approvalRevoked[account] = true;

        emit Revoked(account, block.timestamp);
    }

    function approve() external {
        address account = _msgSender();

        approvalRevoked[account] = false;

        emit Approved(account, block.timestamp);
    }

    function isRevokedAccount(address _account) public view returns (bool) {
        return approvalRevoked[_account];
    }

    function isProjectApproved(
        address _account,
        address _operator
    ) external view returns (bool) {
        if (isRevokedAccount(_account)) return false;

        return isApprovedContract(_operator);
    }
}
