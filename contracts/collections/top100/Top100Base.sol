// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import {CountersUpgradeable} from "../../utils/CountersUpgradeable.sol";

import {SLBaseUpgradeable} from "../../core/SLBaseUpgradeable.sol";
import {SLControllerUpgradeable} from "../../core/SLControllerUpgradeable.sol";
import {Top100Error} from "../../errors/Top100Error.sol";

/// @notice Core storage and event for top100 ERC721 SBT contract
abstract contract Top100Base is
    SLBaseUpgradeable,
    SLControllerUpgradeable,
    Top100Error
{
    CountersUpgradeable.Counter internal tokenIds;

    string internal baseTokenURI;
    bool internal minted;

    /*
     *  Event
     */
    event SetBaseTokenURI(string baseTokenURI, uint256 timestamp);

    event Top100Minted(address[] accounts, uint256 timestamp);
}
