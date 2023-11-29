// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import {Unsafe} from "../../utils/Unsafe.sol";
import {CountersUpgradeable} from "../../utils/CountersUpgradeable.sol";
import {SafeCastUpgradeable} from "../../utils/SafeCastUpgradeable.sol";
import {ERC165CheckerUpgradeable} from "../../utils/ERC165CheckerUpgradeable.sol";

import {ISLSeason} from "../ISLSeason.sol";
import {SeasonBase} from "../SeasonBase.sol";
import {ISLMT} from "../../collections/ISLMT.sol";
import {ISLCollectable} from "../../collections/ISLCollectable.sol";

abstract contract Season is ISLSeason, SeasonBase {
    using Unsafe for uint256;
    using CountersUpgradeable for CountersUpgradeable.Counter;
    using SafeCastUpgradeable for uint256;
    using ERC165CheckerUpgradeable for address;

    /*
     *  Season
     */
    function addSeason(
        uint256 _hunterRankCollectionId,
        uint256 _seasonPackCollectionId,
        uint256 _startBlock,
        uint256 _endBlock,
        uint256[] calldata _seasonCollectionIds
    ) external onlyOperator {
        uint64 seasonId = seasonIds.current().toUint64();
        seasonIds.increment();

        uint256 beforeEndBlock;
        if (seasonId > 0) {
            beforeEndBlock = seasons[seasonId - 1].endBlock;
        }

        if (!_checkBlock(beforeEndBlock, 0, _startBlock, _endBlock))
            revert InvalidBlockNumber();

        if (
            !_checkSeasonCollection(
                _hunterRankCollectionId,
                _seasonPackCollectionId,
                _seasonCollectionIds
            )
        ) revert InvalidCollectionId();

        seasons[seasonId] = Season({
            id: seasonId,
            hunterRankCollectionId: _hunterRankCollectionId.toUint64(),
            seasonPackCollectionId: _seasonPackCollectionId.toUint64(),
            startBlock: _startBlock.toUint32(),
            endBlock: _endBlock.toUint32(),
            seasonCollectionIds: _seasonCollectionIds
        });

        emitCreate("Season", seasonId);
    }

    function setSeasonCollection(
        uint256 _seasonId,
        uint256 _hunterRankCollectionId,
        uint256 _seasonPackCollectionId,
        uint256[] calldata _seasonCollectionIds
    ) external onlyOperator {
        if (isStartSeasonById(_seasonId)) revert AlreadyStartSeason();

        if (
            !_checkSeasonCollection(
                _hunterRankCollectionId,
                _seasonPackCollectionId,
                _seasonCollectionIds
            )
        ) revert InvalidCollectionId();

        Season storage season = seasons[_seasonId];

        season.hunterRankCollectionId = _hunterRankCollectionId.toUint64();
        season.seasonPackCollectionId = _seasonPackCollectionId.toUint64();
        season.seasonCollectionIds = _seasonCollectionIds;
    }

    function setSeasonBlock(
        uint256 _seasonId,
        uint256 _startBlock,
        uint256 _endBlock
    ) external onlyOperator {
        if (isEndedSeasonById(_seasonId)) {
            revert EndedSeason();
        }

        uint256 beforeEndBlock;
        uint256 afterStartBlock;
        if (_seasonId > 0) {
            beforeEndBlock = seasons[_seasonId - 1].endBlock;
        }

        if (isExistSeasonById(_seasonId + 1)) {
            afterStartBlock = seasons[_seasonId + 1].startBlock;
        }

        if (
            !_checkBlock(
                beforeEndBlock,
                afterStartBlock,
                _startBlock,
                _endBlock
            )
        ) revert InvalidBlockNumber();

        Season storage season = seasons[_seasonId];

        season.startBlock = _startBlock.toUint32();
        season.endBlock = _endBlock.toUint32();
    }

    function _checkBlock(
        uint256 _beforeEndBlock,
        uint256 _afterStartBlock,
        uint256 _startBlock,
        uint256 _endBlock
    ) private view returns (bool) {
        if (_afterStartBlock != 0) {
            if (_afterStartBlock <= _endBlock) {
                return false;
            }
        }

        if (
            _startBlock <= _beforeEndBlock ||
            _endBlock <= _startBlock ||
            _startBlock <= block.number
        ) {
            return false;
        }

        return true;
    }

    function _checkSeasonCollection(
        uint256 _hunterRankCollectionId,
        uint256 _seasonPackCollectionId,
        uint256[] calldata _seasonCollectionIds
    ) private view returns (bool) {
        if (!projectContract.isActiveCollection(_hunterRankCollectionId))
            return false;

        if (!projectContract.isActiveCollection(_seasonPackCollectionId))
            return false;

        address hunterRankCollection = projectContract
            .getTokenContractByCollectionId(_hunterRankCollectionId);
        if (!hunterRankCollection.supportsInterface(type(ISLMT).interfaceId))
            return false;

        address seasonPackCollection = projectContract
            .getTokenContractByCollectionId(_seasonPackCollectionId);
        if (!seasonPackCollection.supportsInterface(type(ISLMT).interfaceId))
            return false;

        for (
            uint256 i = 0;
            i < _seasonCollectionIds.length;
            i = i.increment()
        ) {
            if (!projectContract.isActiveCollection(_seasonCollectionIds[i]))
                return false;

            address collection = projectContract.getTokenContractByCollectionId(
                _seasonCollectionIds[i]
            );

            if (!collection.supportsInterface(type(ISLCollectable).interfaceId))
                return false;
        }

        return true;
    }

    /*
     *  View
     */
    function isExistSeasonById(uint256 _seasonId) public view returns (bool) {
        return
            _seasonId <= seasonIds.current() &&
            seasons[_seasonId].endBlock != 0;
    }

    function isCurrentSeasonById(uint256 _seasonId) public view returns (bool) {
        if (!isExistSeasonById(_seasonId)) {
            revert InvalidSeasonId();
        }

        Season memory season = seasons[_seasonId];
        return
            season.startBlock <= block.number &&
            block.number <= season.endBlock;
    }

    function isEndedSeasonById(uint256 _seasonId) public view returns (bool) {
        if (!isExistSeasonById(_seasonId)) {
            revert InvalidSeasonId();
        }

        return seasons[_seasonId].endBlock < block.number;
    }

    function isStartSeasonById(uint256 _seasonId) public view returns (bool) {
        if (!isExistSeasonById(_seasonId)) {
            revert InvalidSeasonId();
        }

        return seasons[_seasonId].startBlock <= block.number;
    }

    function getSeasonById(
        uint256 _seasonId
    ) external view returns (Season memory) {
        if (!isExistSeasonById(_seasonId)) {
            revert InvalidSeasonId();
        }

        return seasons[_seasonId];
    }

    function getSeasonPackCollectionId(
        uint256 _seasonId
    ) external view returns (uint256) {
        if (!isExistSeasonById(_seasonId)) {
            revert InvalidSeasonId();
        }

        return seasons[_seasonId].seasonPackCollectionId;
    }

    function getSeasonCollection(
        uint256 _seasonId
    ) external view returns (uint256[] memory) {
        if (!isExistSeasonById(_seasonId)) {
            revert InvalidSeasonId();
        }

        return seasons[_seasonId].seasonCollectionIds;
    }

    function getSeasonLength() external view returns (uint256) {
        return seasonIds.current();
    }
}
