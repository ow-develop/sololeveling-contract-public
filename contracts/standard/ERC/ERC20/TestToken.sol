// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import {ERC20} from "./ERC20.sol";

contract ERC20Token is ERC20 {
    constructor(
        string memory _name,
        string memory _symbol,
        uint256 _initialSupply
    ) ERC20(_name, _symbol) {
        _mint(_msgSender(), _initialSupply);
    }
}
