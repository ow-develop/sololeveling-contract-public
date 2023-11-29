// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

contract MaticFaucet {
    address public owner;
    uint256 constant INTERVAL_TIME = 86400;

    mapping(address => uint256) public latestTimestamps;

    constructor() {
        owner = msg.sender;
    }

    function getBalance() public view returns (uint256) {
        return address(this).balance;
    }

    function getRemainingTime(address _account) public view returns (uint256) {
        uint256 nextTime = latestTimestamps[_account] + INTERVAL_TIME;

        if (block.timestamp < nextTime) {
            return nextTime - block.timestamp;
        } else {
            return 0;
        }
    }

    function requestMatic(address _account) external {
        require(getRemainingTime(_account) == 0, "not yet available");

        latestTimestamps[_account] = block.timestamp;

        (bool success, ) = _account.call{value: 1 ether}("");

        require(success, "transfer failed");
    }

    function deposit() external payable {}

    function withdraw() external {
        require(msg.sender == owner, "only owner");

        (bool success, ) = msg.sender.call{value: getBalance()}("");

        require(success, "transfer failed");
    }
}
