// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import {UUPSUpgradeable} from "../utils/UUPSUpgradeable.sol";

import {Gate} from "./parts/Gate.sol";
import {ISLProject} from "../project/ISLProject.sol";
import {ISLSeason} from "../season/ISLSeason.sol";
import {ISLRandom} from "../random/ISLRandom.sol";
import {ISLShop} from "../shop/ISLShop.sol";
import {ISLMonsterFactory} from "../monsterFactory/ISLMonsterFactory.sol";
import {IERC20} from "../standard/ERC/ERC20/IERC20.sol";

contract SLDungeonGate is Gate, UUPSUpgradeable {
    function initialize(
        ISLProject _projectContract,
        ISLSeason _seasonContract,
        ISLRandom _randomContract,
        ISLShop _shopContract,
        ISLMonsterFactory _monsterFactoryContract,
        uint256 _essenceStoneCollectionId,
        uint256 _gateKeyCollectionId,
        uint256 _normalMonsterCollectionId
    ) public initializer {
        __SLCotroller_init(_projectContract);
        __gateBlockPerRank_init();
        __slotPerHunterRank_init();
        __rewardTokensPerRank_init();

        seasonContract = _seasonContract;
        randomContract = _randomContract;
        shopContract = _shopContract;
        monsterFactoryContract = _monsterFactoryContract;

        essenceStoneCollectionId = _essenceStoneCollectionId;
        gateKeyCollectionId = _gateKeyCollectionId;
        normalMonsterCollectionId = _normalMonsterCollectionId;

        boostBlockCount = 72;

        setApproveUSDTokenContract();
    }

    function _authorizeUpgrade(address) internal override onlyOperatorMaster {}

    function __gateBlockPerRank_init() private {
        gateBlockPerRank[RankType.E] = 24;
        gateBlockPerRank[RankType.D] = 720;
        gateBlockPerRank[RankType.C] = 1440;
        gateBlockPerRank[RankType.B] = 2880;
        gateBlockPerRank[RankType.A] = 5760;
        gateBlockPerRank[RankType.S] = 11520;
    }

    function __slotPerHunterRank_init() private {
        slotPerHunterRank[RankType.E] = 1;
        slotPerHunterRank[RankType.D] = 1;
        slotPerHunterRank[RankType.C] = 2;
        slotPerHunterRank[RankType.B] = 2;
        slotPerHunterRank[RankType.A] = 3;
        slotPerHunterRank[RankType.S] = 4;
    }

    function __rewardTokensPerRank_init() private {
        rewardTokensPerRank[RankType.E] = [3, 0, 0, 0, 0, 0, 1]; // 4
        rewardTokensPerRank[RankType.D] = [4, 2, 0, 0, 0, 0, 2]; // 8
        rewardTokensPerRank[RankType.C] = [5, 3, 2, 0, 0, 0, 3]; // 13
        rewardTokensPerRank[RankType.B] = [6, 4, 3, 2, 0, 0, 4]; // 19
        rewardTokensPerRank[RankType.A] = [7, 5, 4, 3, 2, 0, 5]; // 26
        rewardTokensPerRank[RankType.S] = [8, 6, 5, 4, 3, 2, 6]; // 34
    }

    /*
     *  Collection
     */
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

    function setNormalMonsterCollectionId(
        uint256 _monsterCollectionId
    ) external onlyOperator {
        if (!projectContract.isActiveCollection(_monsterCollectionId))
            revert InvalidCollectionId();

        TokenType tokenType = projectContract.getCollectionTypeByCollectionId(
            _monsterCollectionId
        );

        if (tokenType != TokenType.ERC1155) revert InvalidCollectionId();

        normalMonsterCollectionId = _monsterCollectionId;
    }

    function getEssenceStoneCollectionId() external view returns (uint256) {
        return essenceStoneCollectionId;
    }

    function getGateKeyCollectionId() external view returns (uint256) {
        return gateKeyCollectionId;
    }

    function getNormalMonsterCollectionId() external view returns (uint256) {
        return normalMonsterCollectionId;
    }

    /*
     *  Base
     */
    function setSeasonContract(
        ISLSeason _seasonContract
    ) external onlyOperator {
        seasonContract = _seasonContract;
    }

    function setRandomContract(
        ISLRandom _randomContract
    ) external onlyOperator {
        randomContract = _randomContract;
    }

    function setShopContract(ISLShop _shopContract) external onlyOperator {
        shopContract = _shopContract;
    }

    function setMonsterFactoryContract(
        ISLMonsterFactory _monsterFactoryContract
    ) external onlyOperator {
        monsterFactoryContract = _monsterFactoryContract;
    }

    function setApproveUSDTokenContract() public onlyOperator {
        address usdTokenContract = shopContract.getUSDTokenContract();

        IERC20(usdTokenContract).approve(
            address(shopContract),
            type(uint256).max
        );
    }

    function getSeasonContract() external view returns (address) {
        return address(seasonContract);
    }

    function getRandomContract() external view returns (address) {
        return address(randomContract);
    }

    function getShopContract() external view returns (address) {
        return address(shopContract);
    }

    function getMonsterFactoryContract() external view returns (address) {
        return address(monsterFactoryContract);
    }
}
