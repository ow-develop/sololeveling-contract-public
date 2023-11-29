// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import {CheckpointsUpgradeable} from "../../utils/CheckpointsUpgradeable.sol";

import {SLBaseUpgradeable} from "../../core/SLBaseUpgradeable.sol";
import {MintControllerUpgradeable} from "../core/MintControllerUpgradeable.sol";
import {MonsterError} from "../../errors/MonsterError.sol";
import {ISLMonsterFactory} from "../../monsterFactory/ISLMonsterFactory.sol";
import {ISLApprovalController} from "../approvalController/ISLApprovalController.sol";

/// @notice Core storage and event for monster ERC1155 contract
abstract contract MonsterBase is
    SLBaseUpgradeable,
    MintControllerUpgradeable,
    MonsterError
{
    string public name;
    string public symbol;

    // monsterFactory contract
    ISLMonsterFactory internal monsterFactoryContract;

    // approvalController contract
    ISLApprovalController internal approvalControllerContract;

    bool internal projectApprovalMode;

    /*
     *  Mapping
     */
    /// @notice monsterId to minted supply
    mapping(uint256 => uint256) internal mintedSupplies;

    /// @notice hunter to collecting score checkpoint
    mapping(address => CheckpointsUpgradeable.History)
        internal collectingScores;

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
