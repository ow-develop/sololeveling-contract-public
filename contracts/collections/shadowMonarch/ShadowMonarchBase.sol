// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import {CountersUpgradeable} from "../../utils/CountersUpgradeable.sol";
import {EnumerableSetUpgradeable} from "../../utils/EnumerableSetUpgradeable.sol";
import {CheckpointsUpgradeable} from "../../utils/CheckpointsUpgradeable.sol";

import {SLBaseUpgradeable} from "../../core/SLBaseUpgradeable.sol";
import {MintControllerUpgradeable} from "../core/MintControllerUpgradeable.sol";
import {ShadowMonarchError} from "../../errors/ShadowMonarchError.sol";
import {ISLApprovalController} from "../approvalController/ISLApprovalController.sol";

/// @notice Core storage and event for shadowMonarch ERC721A contract
abstract contract ShadowMonarchBase is
    SLBaseUpgradeable,
    MintControllerUpgradeable,
    ShadowMonarchError
{
    CountersUpgradeable.Counter internal tokenIds;

    // approvalController contract
    ISLApprovalController internal approvalControllerContract;

    bool internal projectApprovalMode;

    uint256 internal constant MAX_SUPPLY = 10000;
    string internal baseTokenURI;
    uint256 internal defaultCollectingScore;

    /*
     *  Mapping
     */
    /// @notice hunter to tokenIds
    mapping(address => EnumerableSetUpgradeable.UintSet) internal tokenOfOwner;

    /// @notice hunter to collecting score checkpoint
    mapping(address => CheckpointsUpgradeable.History)
        internal collectingScores;

    /// @notice tokenId to collecting score
    mapping(uint256 => uint256) internal tokenScores;

    /*
     *  Event
     */
    event CollectingScoreChanged(
        address indexed hunter,
        uint256 oldScore,
        uint256 newScore
    );

    event SetBaseTokenURI(string baseTokenURI, uint256 timestamp);
}
