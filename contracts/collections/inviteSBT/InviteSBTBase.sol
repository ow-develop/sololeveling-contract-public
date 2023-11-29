// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import {EnumerableSetUpgradeable} from "../../utils/EnumerableSetUpgradeable.sol";

import {SLBaseUpgradeable} from "../../core/SLBaseUpgradeable.sol";
import {MintControllerUpgradeable} from "../core/MintControllerUpgradeable.sol";
import {InviteSBTError} from "../../errors/InviteSBTError.sol";

/// @notice Core storage and event for invite ERC1155 SBT contract
abstract contract InviteSBTBase is
    SLBaseUpgradeable,
    MintControllerUpgradeable,
    InviteSBTError
{
    string public constant name = "Invite";
    string public constant symbol = "Invite";

    bool internal mintEnabled;

    mapping(uint256 => uint256) internal mintedSupplyOfToken;

    /// @notice SBTId to invited accounts;
    mapping(uint256 => EnumerableSetUpgradeable.AddressSet)
        internal invitedAccounts;

    event SetBaseTokenURI(string baseTokenURI, uint256 timestamp);
}
