// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import {SLBaseUpgradeable} from "../../core/SLBaseUpgradeable.sol";
import {MintControllerUpgradeable} from "../core/MintControllerUpgradeable.sol";
import {SeasonScoreError} from "../../errors/SeasonScoreError.sol";
import {ISLSeason} from "../../season/ISLSeason.sol";

/// @notice Core storage and event for season score ERC1155 contract
abstract contract SeasonScoreBase is
    SLBaseUpgradeable,
    MintControllerUpgradeable,
    SeasonScoreError
{
    string public constant name = "SeasonScore";
    string public constant symbol = "SeasonScore";

    ISLSeason internal seasonContract;

    mapping(uint256 => uint256) internal mintedSupplyOfToken;

    event SetBaseTokenURI(string baseTokenURI, uint256 timestamp);
}
