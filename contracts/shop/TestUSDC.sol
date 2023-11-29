// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import {ERC20} from "../standard/ERC/ERC20/ERC20.sol";

contract TestUSDC is ERC20 {
    constructor(uint256 _initialSupply) ERC20("USDC", "USDC") {
        _mint(_msgSender(), _initialSupply);
    }

    function mint(address _account, uint256 _amount) external {
        _mint(_account, _amount);
    }

    function decimals() public pure override returns (uint8) {
        return 6;
    }
}
