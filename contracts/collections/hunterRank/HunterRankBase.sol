// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import {SLBase} from "../../core/SLBase.sol";
import {MintController} from "../core/MintController.sol";
import {HunterRankError} from "../../errors/HunterRankError.sol";

/// @notice Core storage and event for hunter rank ERC1155 SBT contract
abstract contract HunterRankBase is SLBase, MintController, HunterRankError {
    string public constant name = "HunterRank";
    string public constant symbol = "HunterRank";

    bool internal mintEnabled;

    mapping(uint256 => uint256) internal mintedSupplyOfToken;

    event SetBaseTokenURI(string baseTokenURI, uint256 timestamp);
}
