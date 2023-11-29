// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

interface ISLApprovalController {
    function addApprovedContract(address _contract) external;

    function removeApprovedContract(address _contract) external;

    function getApprovedContracts() external view returns (address[] memory);

    function getApprovedContractLength() external view returns (uint256);

    function getApprovedContractByIndex(
        uint256 _index
    ) external view returns (address);

    function isApprovedContract(address _contract) external view returns (bool);

    function revoke() external;

    function approve() external;

    function isRevokedAccount(address _account) external view returns (bool);

    function isProjectApproved(
        address _account,
        address _operator
    ) external view returns (bool);
}
