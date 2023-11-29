// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import {BaseStorage} from "../core/BaseStorage.sol";
import {ShopBase} from "./ShopBase.sol";
import {IERC20} from "../standard/ERC/ERC20/IERC20.sol";

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

    function buyStone(address _to, uint256 _amount) external;

    /*
     *  Base
     */
    function setUSDTokenContract(IERC20 _usdTokenContract) external;

    function setGateKeyCollectionId(uint256 _gateKeyCollectionId) external;

    function setEssenceStoneCollectionId(
        uint256 _essenceStoneCollectionId
    ) external;

    function setPriceMode(ShopBase.PriceMode _priceMode) external;

    function setKeyPricePerRank(
        ShopBase.PriceMode _priceMode,
        uint256[6] calldata _prices
    ) external;

    function setStoneUsdPrice(uint256 _price) external;

    function setSellPaused(bool _paused) external;

    function withdraw(
        ShopBase.PriceMode _priceMode,
        address _to,
        uint256 _amount
    ) external;

    /*
     *  View
     */
    function getUSDTokenContract() external view returns (address);

    function getGateKeyCollectionId() external view returns (uint256);

    function getEssenceStoneCollectionId() external view returns (uint256);

    function getPriceMode() external view returns (ShopBase.PriceMode);

    function getLatestKeyPrice(
        BaseStorage.RankType _keyRank
    )
        external
        view
        returns (ShopBase.PriceMode currentPriceMode, uint256 price);

    function getKeyPricePerRank(
        ShopBase.PriceMode _priceMode
    ) external view returns (uint256[6] memory);

    function getStoneUsdPrice() external view returns (uint256);

    function getSellPaused() external view returns (bool);

    function getBalance(
        ShopBase.PriceMode _priceMode
    ) external view returns (uint256);
}
