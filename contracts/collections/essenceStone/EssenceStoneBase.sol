// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import {EnumerableSetUpgradeable} from "../../utils/EnumerableSetUpgradeable.sol";

import {SLBaseUpgradeable} from "../../core/SLBaseUpgradeable.sol";
import {MintControllerUpgradeable} from "../core/MintControllerUpgradeable.sol";
import {EssenceStoneError} from "../../errors/EssenceStoneError.sol";
import {ISLApprovalController} from "../approvalController/ISLApprovalController.sol";

/// @notice Core storage and event for essence stone ERC1155 contract
abstract contract EssenceStoneBase is
    SLBaseUpgradeable,
    MintControllerUpgradeable,
    EssenceStoneError
{
    string public constant name = "EssenceStone";
    string public constant symbol = "EssenceStone";

    // approvalController contract
    ISLApprovalController internal approvalControllerContract;

    bool internal projectApprovalMode;

    EnumerableSetUpgradeable.UintSet internal openTokens;

    mapping(uint256 => bool) internal tokenOpened;
    mapping(uint256 => uint256) internal mintedSupplyOfToken;

    event TokenOpened(uint256 tokenId, uint256 timestamp);
    event TokenClosed(uint256 tokenId, uint256 timestamp);
    event SetBaseTokenURI(string baseTokenURI, uint256 timestamp);
}
