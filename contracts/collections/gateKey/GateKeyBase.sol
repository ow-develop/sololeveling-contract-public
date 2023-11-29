// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import {CountersUpgradeable} from "../../utils/CountersUpgradeable.sol";

import {SLBaseUpgradeable} from "../../core/SLBaseUpgradeable.sol";
import {MintControllerUpgradeable} from "../core/MintControllerUpgradeable.sol";
import {GateKeyError} from "../../errors/GateKeyError.sol";
import {ISLApprovalController} from "../approvalController/ISLApprovalController.sol";

/// @notice Core storage and event for gate key ERC1155 contract
abstract contract GateKeyBase is
    SLBaseUpgradeable,
    MintControllerUpgradeable,
    GateKeyError
{
    string public constant name = "GateKey";
    string public constant symbol = "GateKey";

    // approvalController contract
    ISLApprovalController internal approvalControllerContract;

    bool internal projectApprovalMode;

    /*
     *  Mapping
     */
    /// @notice tokenId to minted supply
    mapping(uint256 => uint256) internal mintedSupplyOfToken;

    /// @notice whitelist to verify signature nonce
    mapping(address => CountersUpgradeable.Counter) internal whitelistNonces;

    /*
     *  Event
     */
    event KeyMinted(
        address indexed to,
        RankType indexed keyRank,
        uint256 amount,
        uint256 timestamp
    );

    event KeyMintedBatch(
        address indexed to,
        RankType[] keyRanks,
        uint256[] amounts,
        uint256 timestamp
    );

    event SetBaseTokenURI(string baseTokenURI, uint256 timestamp);
}
