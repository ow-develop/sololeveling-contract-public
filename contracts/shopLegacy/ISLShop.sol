// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import {BaseStorage} from "../core/BaseStorage.sol";
import {ShopBase} from "./ShopBase.sol";
import {IPriceFeed} from "../chainlink/IPriceFeed.sol";

interface ISLShop {
    /*
     *  GateKey
     */
    function buyKey(
        address _to,
        BaseStorage.RankType _keyRank,
        uint256 _amount
    ) external payable;

    function buyKeyBatch(
        address _to,
        BaseStorage.RankType[] calldata _keyRanks,
        uint256[] calldata _amounts
    ) external payable;

    /*
     *  Base
     */
    function setPriceFeedContract(IPriceFeed _priceFeedContract) external;

    function setGateKeyCollectionId(uint256 _gateKeyCollectionId) external;

    function setPriceMode(ShopBase.PriceMode _priceMode) external;

    function setKeyPricePerRank(
        ShopBase.PriceMode _priceMode,
        uint256[6] calldata _prices
    ) external;

    function setSellPaused(bool _paused) external;

    function withdraw(address _to, uint256 _amount) external;

    /*
     *  View
     */
    function getPriceFeedContract() external view returns (address);

    function getGateKeyCollectionId() external view returns (uint256);

    function getLatestKeyPrice(
        BaseStorage.RankType _keyRank
    ) external view returns (uint256);

    function getPriceMode() external view returns (ShopBase.PriceMode);

    function getKeyPricePerRank(
        ShopBase.PriceMode _priceMode
    ) external view returns (uint256[6] memory);

    function getSellPaused() external view returns (bool);

    function getBalance() external view returns (uint256);
}
