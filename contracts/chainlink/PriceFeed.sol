// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import {AggregatorV3Interface} from "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import {IPriceFeed} from "./IPriceFeed.sol";

contract PriceFeed is IPriceFeed {
    AggregatorV3Interface internal priceFeed;

    /**
     * Network: Mumbai
     * Aggregator: MATIC/USD
     * Address: 0xd0D5e3DB44DE05E9F294BB0a3bEEaF030DE24Ada
     */
    constructor() {
        priceFeed = AggregatorV3Interface(
            0xd0D5e3DB44DE05E9F294BB0a3bEEaF030DE24Ada
        );
    }

    /**
     * Returns the latest price.
     */
    function getLatestPrice() public view returns (uint256) {
        // prettier-ignore
        (
            /* uint80 roundID */,
            int price,
            /*uint startedAt*/,
            /*uint timeStamp*/,
            /*uint80 answeredInRound*/
        ) = priceFeed.latestRoundData();

        uint usd = 1 * 1e8;
        uint rate = (usd * 1e4) / uint256(price);

        return rate * 1e14;
    }

    // function getUSD(uint256 _usd) public view returns (uint256) {
    //     uint256 oneUSD = getTestPrice();

    //     // return ((oneUSD * 1e2) * _usd) / 1e4;
    //     return (oneUSD * _usd) / 1e2;
    // }
}
