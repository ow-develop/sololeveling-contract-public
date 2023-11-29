// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import {EnumerableSet} from "../../utils/EnumerableSet.sol";

import {SLBase} from "../../core/SLBase.sol";
import {MintController} from "../core/MintController.sol";
import {SeasonPackError} from "../../errors/SeasonPackError.sol";
import {ISLApprovalController} from "../approvalController/ISLApprovalController.sol";

/// @notice Core storage and event for season pack ERC1155 contract
abstract contract SeasonPackBase is SLBase, MintController, SeasonPackError {
    string public constant name = "SeasonPack";
    string public constant symbol = "SeasonPack";

    // approvalController contract
    ISLApprovalController internal approvalControllerContract;

    bool internal projectApprovalMode;

    EnumerableSet.UintSet internal openTokens;

    mapping(uint256 => bool) internal tokenOpened;
    mapping(uint256 => uint256) internal mintedSupplyOfToken;

    event TokenOpened(uint256 tokenId, uint256 timestamp);
    event TokenClosed(uint256 tokenId, uint256 timestamp);
    event SetBaseTokenURI(string baseTokenURI, uint256 timestamp);
}
