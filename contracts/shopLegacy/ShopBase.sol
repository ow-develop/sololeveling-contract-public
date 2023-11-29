// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import {CountersUpgradeable} from "../utils/CountersUpgradeable.sol";

import {SLBaseUpgradeable} from "../core/SLBaseUpgradeable.sol";
import {SLControllerUpgradeable} from "../core/SLControllerUpgradeable.sol";
import {ShopError} from "../errors/ShopError.sol";
import {IPriceFeed} from "../chainlink/IPriceFeed.sol";
import {IERC20} from "../standard/ERC/ERC20/IERC20.sol";

/// @notice Core storage and event for shop contract
abstract contract ShopBase is
    SLBaseUpgradeable,
    SLControllerUpgradeable,
    ShopError
{
    // chainlink matic/usd price feed contract
    IPriceFeed internal priceFeedContract;

    // collectionId
    uint256 internal gateKeyCollectionId;

    PriceMode internal priceMode;
    bool internal sellPaused;

    /*
     *  Mapping
     */
    /// @notice RankType to key token matic price
    mapping(RankType => uint256) internal maticPricePerRank; // E-S

    /// @notice RankType to key token usd price
    mapping(RankType => uint256) internal usdPricePerRank; // E-S

    /*
     *  Enum
     */
    enum PriceMode {
        USD,
        MATIC
    }

    /*
     *  Event
     */
    event KeySold(
        address indexed buyer,
        address indexed to,
        RankType indexed keyRank,
        uint256 amount,
        uint256 price,
        uint256 timestamp
    );

    event KeySoldBatch(
        address indexed buyer,
        address indexed to,
        RankType[] keyRanks,
        uint256[] amounts,
        uint256 price,
        uint256 timestamp
    );

    event SetPriceMode(PriceMode priceMode, uint256 timestamp);

    event SetKeyPrice(
        PriceMode indexed priceMode,
        uint256[6] prices,
        uint256 timestamp
    );

    event SetSellPaused(bool paused, uint256 timestamp);

    event Withdrawal(address indexed to, uint256 amount, uint256 timestamp);
}
