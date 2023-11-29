// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import {SLBaseUpgradeable} from "../../core/SLBaseUpgradeable.sol";
import {MintControllerUpgradeable} from "../core/MintControllerUpgradeable.sol";
import {LegendarySceneError} from "../../errors/LegendarySceneError.sol";
import {ISLSeason} from "../../season/ISLSeason.sol";
import {ISLApprovalController} from "../approvalController/ISLApprovalController.sol";

/// @notice Core storage and event for legendary scene ERC1155 contract
abstract contract LegendarySceneBase is
    SLBaseUpgradeable,
    MintControllerUpgradeable,
    LegendarySceneError
{
    string public constant name = "LegendaryScene";
    string public constant symbol = "LegendaryScene";

    // season contract
    ISLSeason internal seasonContract;

    // approvalController contract
    ISLApprovalController internal approvalControllerContract;

    bool internal projectApprovalMode;

    mapping(uint256 => uint256) internal mintedSupplyOfToken;

    event SetBaseTokenURI(string baseTokenURI, uint256 timestamp);
}
