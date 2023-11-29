// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import {UUPSUpgradeable} from "../utils/UUPSUpgradeable.sol";
import {Unsafe} from "../utils/Unsafe.sol";
import {CountersUpgradeable} from "../utils/CountersUpgradeable.sol";

import {ISLShop} from "./ISLShop.sol";
import {ShopBase} from "./ShopBase.sol";
import {ISLProject} from "../project/ISLProject.sol";
import {IPriceFeed} from "../chainlink/IPriceFeed.sol";
import {ISLMT} from "../collections/ISLMT.sol";

contract SLShopLegacy is ISLShop, ShopBase, UUPSUpgradeable {
    using Unsafe for uint256;
    using CountersUpgradeable for CountersUpgradeable.Counter;

    function initialize(
        ISLProject _projectContract,
        IPriceFeed _priceFeedContract,
        uint256 _gateKeyCollectionId
    ) public initializer {
        __SLCotroller_init(_projectContract);
        __pricePerRank_init();

        priceFeedContract = _priceFeedContract;

        gateKeyCollectionId = _gateKeyCollectionId;

        priceMode = PriceMode.USD;
        sellPaused = false;
    }

    function _authorizeUpgrade(address) internal override onlyOperatorMaster {}

    function __pricePerRank_init() private {
        maticPricePerRank[RankType.E] = 1000000000000000000;
        maticPricePerRank[RankType.D] = 1000000000000000000;
        maticPricePerRank[RankType.C] = 1000000000000000000;
        maticPricePerRank[RankType.B] = 2000000000000000000;
        maticPricePerRank[RankType.A] = 2000000000000000000;
        maticPricePerRank[RankType.S] = 2000000000000000000;

        usdPricePerRank[RankType.E] = 10;
        usdPricePerRank[RankType.D] = 10;
        usdPricePerRank[RankType.C] = 10;
        usdPricePerRank[RankType.B] = 20;
        usdPricePerRank[RankType.A] = 20;
        usdPricePerRank[RankType.S] = 20;
    }

    /*
     *  GateKey
     */
    modifier NotSellPaused() {
        _checkSellPaused();
        _;
    }

    function buyKey(
        address _to,
        RankType _keyRank,
        uint256 _amount
    ) external payable NotSellPaused {
        uint256 value = msg.value;
        uint256 price;

        if (priceMode == PriceMode.MATIC) {
            price = maticPricePerRank[_keyRank] * _amount;
        } else {
            price = _getUSDPrice(_keyRank) * _amount;
        }

        if (price != value) revert InvalidPrice();

        ISLMT gateKey = ISLMT(
            projectContract.getTokenContractByCollectionId(gateKeyCollectionId)
        );

        gateKey.mint(_to, uint256(_keyRank), _amount);

        emit KeySold(
            _msgSender(),
            _to,
            _keyRank,
            _amount,
            value,
            block.timestamp
        );
    }

    function buyKeyBatch(
        address _to,
        RankType[] calldata _keyRanks,
        uint256[] calldata _amounts
    ) external payable NotSellPaused {
        uint256 value = msg.value;
        uint256 price;
        uint256[] memory tokenIds = new uint256[](_keyRanks.length);

        if (priceMode == PriceMode.MATIC) {
            for (uint256 i = 0; i < _keyRanks.length; i = i.increment()) {
                RankType keyRank = _keyRanks[i];
                uint256 amount = _amounts[i];

                price += maticPricePerRank[keyRank] * amount;
                tokenIds[i] = uint256(keyRank);
            }
        } else {
            for (uint256 i = 0; i < _keyRanks.length; i = i.increment()) {
                RankType keyRank = _keyRanks[i];
                uint256 amount = _amounts[i];

                price += _getUSDPrice(keyRank) * amount;
                tokenIds[i] = uint256(keyRank);
            }
        }

        if (price != value) revert InvalidPrice();

        ISLMT gateKey = ISLMT(
            projectContract.getTokenContractByCollectionId(gateKeyCollectionId)
        );

        gateKey.mintBatch(_to, tokenIds, _amounts);

        emit KeySoldBatch(
            _msgSender(),
            _to,
            _keyRanks,
            _amounts,
            value,
            block.timestamp
        );
    }

    function _getUSDPrice(RankType _keyRank) private view returns (uint256) {
        uint256 usdToMatic = uint256(priceFeedContract.getLatestPrice());

        return (usdPricePerRank[_keyRank] * usdToMatic) / 10;
    }

    function _checkSellPaused() private view {
        if (sellPaused) {
            revert SellPaused();
        }
    }

    /*
     *  Base
     */
    function setPriceFeedContract(
        IPriceFeed _priceFeedContract
    ) external onlyOperator {
        priceFeedContract = _priceFeedContract;
    }

    function setGateKeyCollectionId(
        uint256 _gateKeyCollectionId
    ) external onlyOperator {
        if (!projectContract.isActiveCollection(_gateKeyCollectionId))
            revert InvalidCollectionId();

        TokenType tokenType = projectContract.getCollectionTypeByCollectionId(
            _gateKeyCollectionId
        );
        if (tokenType != TokenType.ERC1155) revert InvalidCollectionId();

        gateKeyCollectionId = _gateKeyCollectionId;
    }

    function setPriceMode(PriceMode _priceMode) external onlyOperator {
        priceMode = _priceMode;

        emit SetPriceMode(_priceMode, block.timestamp);
    }

    function setKeyPricePerRank(
        PriceMode _priceMode,
        uint256[6] calldata _prices
    ) external onlyOperator {
        if (_priceMode == PriceMode.MATIC) {
            for (uint256 i = 0; i < _prices.length; i = i.increment()) {
                uint256 price = _prices[i];

                maticPricePerRank[RankType(i)] = price;
            }
        } else {
            for (uint256 i = 0; i < _prices.length; i = i.increment()) {
                uint256 price = _prices[i];

                usdPricePerRank[RankType(i)] = price;
            }
        }

        emit SetKeyPrice(_priceMode, _prices, block.timestamp);
    }

    function setSellPaused(bool _paused) external onlyOperator {
        sellPaused = _paused;

        emit SetSellPaused(_paused, block.timestamp);
    }

    function withdraw(
        address _to,
        uint256 _amount
    ) external onlyOperatorMaster {
        if (getBalance() < _amount) revert ExceedBalance();

        (bool success, ) = _to.call{value: _amount}("");

        if (!success) revert TransferFailed();

        emit Withdrawal(_to, _amount, block.timestamp);
    }

    /*
     *  View
     */
    function getPriceFeedContract() external view returns (address) {
        return address(priceFeedContract);
    }

    function getGateKeyCollectionId() external view returns (uint256) {
        return gateKeyCollectionId;
    }

    function getLatestKeyPrice(
        RankType _keyRank
    ) external view returns (uint256) {
        if (priceMode == PriceMode.MATIC) {
            return maticPricePerRank[_keyRank];
        } else {
            uint256 usdToMatic = uint256(priceFeedContract.getLatestPrice());

            return (usdPricePerRank[_keyRank] * usdToMatic) / 10;
        }
    }

    function getPriceMode() external view returns (PriceMode) {
        return priceMode;
    }

    function getKeyPricePerRank(
        PriceMode _priceMode
    ) external view returns (uint256[6] memory) {
        uint256[6] memory prices;

        if (_priceMode == PriceMode.MATIC) {
            for (uint256 i = 0; i < 6; i = i.increment()) {
                prices[i] = maticPricePerRank[RankType(i)];
            }
        } else {
            for (uint256 i = 0; i < 6; i = i.increment()) {
                prices[i] = usdPricePerRank[RankType(i)];
            }
        }

        return prices;
    }

    function getSellPaused() external view returns (bool) {
        return sellPaused;
    }

    function getBalance() public view returns (uint256) {
        return address(this).balance;
    }
}
