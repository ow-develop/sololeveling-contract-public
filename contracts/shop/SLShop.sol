// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import {UUPSUpgradeable} from "../utils/UUPSUpgradeable.sol";
import {Unsafe} from "../utils/Unsafe.sol";
import {CountersUpgradeable} from "../utils/CountersUpgradeable.sol";

import {ISLShop} from "./ISLShop.sol";
import {ShopBase} from "./ShopBase.sol";
import {ISLProject} from "../project/ISLProject.sol";
import {ISLMT} from "../collections/ISLMT.sol";
import {IERC20} from "../standard/ERC/ERC20/IERC20.sol";

contract SLShop is ISLShop, ShopBase, UUPSUpgradeable {
    using Unsafe for uint256;
    using CountersUpgradeable for CountersUpgradeable.Counter;

    function initialize(
        ISLProject _projectContract,
        IERC20 _usdTokenContract,
        uint256 _gateKeyCollectionId,
        uint256 _essenceStoneCollectionId
    ) public initializer {
        __SLCotroller_init(_projectContract);
        __pricePerRank_init();
        __stoneUsdPrice_init();

        usdTokenContract = _usdTokenContract;

        gateKeyCollectionId = _gateKeyCollectionId;
        essenceStoneCollectionId = _essenceStoneCollectionId;

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

        usdPricePerRank[RankType.E] = 1000000;
        usdPricePerRank[RankType.D] = 4000000;
        usdPricePerRank[RankType.C] = 12000000;
        usdPricePerRank[RankType.B] = 30000000;
        usdPricePerRank[RankType.A] = 66000000;
        usdPricePerRank[RankType.S] = 140000000;
    }

    function __stoneUsdPrice_init() private {
        stoneUsdPrice = 100000; // 0.1
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
        address buyer = _msgSender();

        if (priceMode == PriceMode.MATIC) {
            price = maticPricePerRank[_keyRank] * _amount;

            if (price != value) revert InvalidPrice();
        } else {
            if (value != 0) revert InvalidPrice();

            price = usdPricePerRank[_keyRank] * _amount;

            if (usdTokenContract.allowance(buyer, address(this)) < price)
                revert InsufficientAllowance();

            usdTokenContract.transferFrom(buyer, address(this), price);
        }

        ISLMT gateKey = ISLMT(
            projectContract.getTokenContractByCollectionId(gateKeyCollectionId)
        );

        gateKey.mint(_to, uint256(_keyRank), _amount);

        emit KeySold(buyer, _to, _keyRank, _amount, price, block.timestamp);
    }

    function buyKeyBatch(
        address _to,
        RankType[] calldata _keyRanks,
        uint256[] calldata _amounts
    ) external payable NotSellPaused {
        uint256 value = msg.value;
        uint256 price;
        address buyer = _msgSender();
        uint256[] memory tokenIds = new uint256[](_keyRanks.length);

        if (priceMode == PriceMode.MATIC) {
            for (uint256 i = 0; i < _keyRanks.length; i = i.increment()) {
                RankType keyRank = _keyRanks[i];
                uint256 amount = _amounts[i];

                price += maticPricePerRank[keyRank] * amount;
                tokenIds[i] = uint256(keyRank);
            }

            if (price != value) revert InvalidPrice();
        } else {
            if (value != 0) revert InvalidPrice();

            for (uint256 i = 0; i < _keyRanks.length; i = i.increment()) {
                RankType keyRank = _keyRanks[i];
                uint256 amount = _amounts[i];

                price += usdPricePerRank[keyRank] * amount;
                tokenIds[i] = uint256(keyRank);
            }

            if (usdTokenContract.allowance(buyer, address(this)) < price)
                revert InsufficientAllowance();

            usdTokenContract.transferFrom(buyer, address(this), price);
        }

        ISLMT gateKey = ISLMT(
            projectContract.getTokenContractByCollectionId(gateKeyCollectionId)
        );

        gateKey.mintBatch(_to, tokenIds, _amounts);

        emit KeySoldBatch(
            buyer,
            _to,
            _keyRanks,
            _amounts,
            price,
            block.timestamp
        );
    }

    function buyStone(address _to, uint256 _amount) external NotSellPaused {
        address buyer = _msgSender();
        uint256 price = stoneUsdPrice * _amount;

        if (usdTokenContract.allowance(buyer, address(this)) < price)
            revert InsufficientAllowance();

        usdTokenContract.transferFrom(buyer, address(this), price);

        ISLMT essenceStone = ISLMT(
            projectContract.getTokenContractByCollectionId(
                essenceStoneCollectionId
            )
        );

        essenceStone.mint(_to, ESSENCE_STONE_TOKEN_ID, _amount);

        emit StoneSold(buyer, _to, _amount, price, block.timestamp);
    }

    function _checkSellPaused() private view {
        if (sellPaused) {
            revert SellPaused();
        }
    }

    /*
     *  Base
     */
    function setUSDTokenContract(
        IERC20 _usdTokenContract
    ) external onlyOperator {
        usdTokenContract = _usdTokenContract;

        emit SetUSDTokenContract(address(_usdTokenContract), block.timestamp);
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

    function setEssenceStoneCollectionId(
        uint256 _essenceStoneCollectionId
    ) external onlyOperator {
        if (!projectContract.isActiveCollection(_essenceStoneCollectionId))
            revert InvalidCollectionId();

        TokenType tokenType = projectContract.getCollectionTypeByCollectionId(
            _essenceStoneCollectionId
        );
        if (tokenType != TokenType.ERC1155) revert InvalidCollectionId();

        essenceStoneCollectionId = _essenceStoneCollectionId;
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

    function setStoneUsdPrice(uint256 _price) external onlyOperator {
        stoneUsdPrice = _price;

        emit SetStonePrice(_price, block.timestamp);
    }

    function setSellPaused(bool _paused) external onlyOperator {
        sellPaused = _paused;

        emit SetSellPaused(_paused, block.timestamp);
    }

    function withdraw(
        PriceMode _priceMode,
        address _to,
        uint256 _amount
    ) external onlyOperatorMaster {
        if (getBalance(_priceMode) < _amount) revert ExceedBalance();

        if (_priceMode == PriceMode.MATIC) {
            (bool success, ) = _to.call{value: _amount}("");
            if (!success) revert TransferFailed();
        } else {
            bool success = usdTokenContract.transfer(_to, _amount);
            if (!success) revert TransferFailed();
        }

        emit Withdrawal(_priceMode, _to, _amount, block.timestamp);
    }

    /*
     *  View
     */
    function getUSDTokenContract() external view returns (address) {
        return address(usdTokenContract);
    }

    function getGateKeyCollectionId() external view returns (uint256) {
        return gateKeyCollectionId;
    }

    function getEssenceStoneCollectionId() external view returns (uint256) {
        return essenceStoneCollectionId;
    }

    function getPriceMode() external view returns (PriceMode) {
        return priceMode;
    }

    function getLatestKeyPrice(
        RankType _keyRank
    ) external view returns (PriceMode currentPriceMode, uint256 price) {
        return (
            priceMode,
            priceMode == PriceMode.MATIC
                ? maticPricePerRank[_keyRank]
                : usdPricePerRank[_keyRank]
        );
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

    function getStoneUsdPrice() external view returns (uint256) {
        return stoneUsdPrice;
    }

    function getSellPaused() external view returns (bool) {
        return sellPaused;
    }

    function getBalance(PriceMode _priceMode) public view returns (uint256) {
        if (_priceMode == PriceMode.MATIC) {
            return address(this).balance;
        } else {
            return usdTokenContract.balanceOf(address(this));
        }
    }
}
