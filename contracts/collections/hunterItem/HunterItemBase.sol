// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import {SLBaseUpgradeable} from "../../core/SLBaseUpgradeable.sol";
import {MintControllerUpgradeable} from "../core/MintControllerUpgradeable.sol";
import {HunterItemError} from "../../errors/HunterItemError.sol";

/// @notice Core storage and event for hunter item ERC1155 contract
abstract contract HunterItemBase is
    SLBaseUpgradeable,
    MintControllerUpgradeable,
    HunterItemError
{
    string public constant name = "HunterItem";
    string public constant symbol = "HunterItem";

    bool internal mintEnabled;

    mapping(uint256 => bool) internal tokenOpened;
    mapping(uint256 => uint256) internal mintedSupplyOfToken;

    event TokenOpened(uint256 tokenId, uint256 timestamp);
    event TokenClosed(uint256 tokenId, uint256 timestamp);
    event SetBaseTokenURI(string baseTokenURI, uint256 timestamp);
}
