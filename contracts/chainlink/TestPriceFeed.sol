// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import {IPriceFeed} from "./IPriceFeed.sol";

contract TestPriceFeed is IPriceFeed {
    /**
     * Returns the latest price.
     */
    function getLatestPrice() public pure returns (uint256) {
        uint256 price = 96590000;

        uint usd = 1 * 1e8;
        uint rate = (usd * 1e4) / uint256(price);

        return rate * 1e14;
    }
}
