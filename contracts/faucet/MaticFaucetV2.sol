// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

contract MaticFaucetV2 {
    address public owner;
    uint256 public mintAmount = 3 ether;

    constructor() {
        owner = msg.sender;
    }

    function getBalance() public view returns (uint256) {
        return address(this).balance;
    }

    function mint(address _account) external {
        require(mintAmount < getBalance(), "exceed balance");

        (bool success, ) = _account.call{value: mintAmount}("");

        require(success, "transfer failed");
    }

    function setMintAmount(uint256 _amount) external {
        require(msg.sender == owner, "only owner");

        mintAmount = _amount;
    }

    function deposit() external payable {}

    function withdraw() external {
        require(msg.sender == owner, "only owner");

        (bool success, ) = msg.sender.call{value: getBalance()}("");

        require(success, "transfer failed");
    }
}
