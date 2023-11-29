// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import {CountersUpgradeable} from "../utils/CountersUpgradeable.sol";

import {SLBaseUpgradeable} from "../core/SLBaseUpgradeable.sol";
import {SLControllerUpgradeable} from "../core/SLControllerUpgradeable.sol";
import {RandomError} from "../errors/RandomError.sol";

/// @notice Core storage and event for random contract
abstract contract RandomBase is
    SLBaseUpgradeable,
    SLControllerUpgradeable,
    RandomError
{
    address internal signer;

    /*
     *  Mapping
     */
    /// @notice hunter to random signature nonce
    mapping(address => CountersUpgradeable.Counter) internal nonces;
}
