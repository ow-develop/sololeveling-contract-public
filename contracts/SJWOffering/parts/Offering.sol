// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import {CountersUpgradeable} from "../../utils/CountersUpgradeable.sol";
import {SafeCastUpgradeable} from "../../utils/SafeCastUpgradeable.sol";

import {ISLSJWOffering} from "../ISLSJWOffering.sol";
import {SJWOfferingBase} from "../SJWOfferingBase.sol";
import {ISLShadowMonarch} from "../../collections/shadowMonarch/ISLShadowMonarch.sol";

abstract contract Offering is ISLSJWOffering, SJWOfferingBase {
    using CountersUpgradeable for CountersUpgradeable.Counter;
    using SafeCastUpgradeable for uint256;

    /*
     *  Public Offering
     */
    function addPublicOffering(
        uint256 _supplyToWhitelist,
        uint256 _supplyToPublic,
        uint256 _accountMaxSupply,
        uint256 _startTimestamp,
        uint256 _whitelistExpirationTimestamp,
        uint256 _endTimestamp,
        uint256 _price
    ) external onlyOperator {
        uint256 totalSupply = _supplyToWhitelist + _supplyToPublic;

        ISLShadowMonarch shadowMonarchContract = ISLShadowMonarch(
            projectContract.getTokenContractByCollectionId(
                shadowMonarchCollectionId
            )
        );

        uint256 publicMintedSupply = shadowMonarchContract.getMintedSupply() -
            ownershipMinted;

        if (publicMintedSupply + totalSupply > PUBLIC_SUPPLY)
            revert ExceedSupply();

        reservedSupply += totalSupply;

        if (
            !_isValidPublicOfferingTimestamp(
                0,
                _startTimestamp,
                _whitelistExpirationTimestamp,
                _endTimestamp
            )
        ) revert InvalidTimestamp();

        publicOfferingIds.increment();
        uint64 offeringId = publicOfferingIds.current().toUint64();

        publicOfferings[offeringId] = PublicOffering({
            id: offeringId,
            supplyToWhitelist: _supplyToWhitelist.toUint16(),
            supplyToPublic: _supplyToPublic.toUint16(),
            accountMaxSupply: _accountMaxSupply.toUint16(),
            startTimestamp: _startTimestamp.toUint64(),
            whitelistExpirationTimestamp: _whitelistExpirationTimestamp
                .toUint64(),
            endTimestamp: _endTimestamp.toUint64(),
            mintedByWhitelist: 0,
            mintedByPublic: 0,
            price: _price
        });

        emitCreate("PublicOffering", offeringId);
    }

    function setPublicOfferingSupply(
        uint256 _offeringId,
        uint256 _supplyToWhitelist,
        uint256 _supplyToPublic,
        uint256 _accountMaxSupply
    ) external onlyOperator {
        if (!isExistOfferingById(OfferingType.Public, _offeringId))
            revert InvalidOfferingId();

        PublicOffering storage offering = publicOfferings[_offeringId];

        if (
            _supplyToWhitelist < offering.mintedByWhitelist ||
            _supplyToPublic < offering.mintedByPublic
        ) {
            revert InvalidSupply();
        }

        uint256 beforeTotalSupply = offering.supplyToWhitelist +
            offering.supplyToPublic;
        uint256 totalSupply = _supplyToWhitelist + _supplyToPublic;

        ISLShadowMonarch shadowMonarchContract = ISLShadowMonarch(
            projectContract.getTokenContractByCollectionId(
                shadowMonarchCollectionId
            )
        );

        uint256 publicMintedSupply = shadowMonarchContract.getMintedSupply() -
            ownershipMinted;

        if (publicMintedSupply + totalSupply > PUBLIC_SUPPLY)
            revert ExceedSupply();

        reservedSupply -= beforeTotalSupply;
        reservedSupply += totalSupply;

        offering.supplyToWhitelist = _supplyToWhitelist.toUint16();
        offering.supplyToPublic = _supplyToPublic.toUint16();
        offering.accountMaxSupply = _accountMaxSupply.toUint16();
    }

    function setPublicOfferingTimestamp(
        uint256 _offeringId,
        uint256 _startTimestamp,
        uint256 _whitelistExpirationTimestamp,
        uint256 _endTimestamp
    ) external onlyOperator {
        if (!isExistOfferingById(OfferingType.Public, _offeringId))
            revert InvalidOfferingId();

        if (
            !_isValidPublicOfferingTimestamp(
                _offeringId,
                _startTimestamp,
                _whitelistExpirationTimestamp,
                _endTimestamp
            )
        ) revert InvalidTimestamp();

        PublicOffering storage offering = publicOfferings[_offeringId];

        offering.startTimestamp = _startTimestamp.toUint64();
        offering.whitelistExpirationTimestamp = _whitelistExpirationTimestamp
            .toUint64();
        offering.endTimestamp = _endTimestamp.toUint64();
    }

    function _isValidPublicOfferingTimestamp(
        uint256 _offeringId,
        uint256 _startTimestamp,
        uint256 _whitelistExpirationTimestamp,
        uint256 _endTimestamp
    ) private view returns (bool) {
        if (
            _endTimestamp <= _startTimestamp ||
            _endTimestamp < _whitelistExpirationTimestamp ||
            _startTimestamp <= block.timestamp
        ) {
            return false;
        }

        uint256 beforeOfferingId;
        uint256 afterOfferingId;

        if (_offeringId == 0) {
            beforeOfferingId = publicOfferingIds.current();
        } else {
            beforeOfferingId = _offeringId - 1;
            afterOfferingId = _offeringId + 1;
        }

        if (isExistOfferingById(OfferingType.Public, beforeOfferingId)) {
            if (
                publicOfferings[beforeOfferingId].endTimestamp >=
                _startTimestamp
            ) return false;
        }

        if (isExistOfferingById(OfferingType.Public, afterOfferingId)) {
            if (
                publicOfferings[afterOfferingId].startTimestamp <= _endTimestamp
            ) return false;
        }

        return true;
    }

    /*
     *  Private Offering
     */
    function addPrivateOffering(
        uint256 _supply,
        uint256 _accountMaxSupply,
        uint256 _startTimestamp,
        uint256 _endTimestamp,
        uint256 _price
    ) external onlyOperator {
        ISLShadowMonarch shadowMonarchContract = ISLShadowMonarch(
            projectContract.getTokenContractByCollectionId(
                shadowMonarchCollectionId
            )
        );

        uint256 publicMintedSupply = shadowMonarchContract.getMintedSupply() -
            ownershipMinted;

        if (publicMintedSupply + _supply > PUBLIC_SUPPLY) revert ExceedSupply();

        reservedSupply += _supply;

        if (_supply % _accountMaxSupply != 0) revert InvalidSupply();

        uint256 whitelistAmount = _supply / _accountMaxSupply;

        if (whitelistAmount == 0) revert InvalidSupply();

        if (
            _endTimestamp <= _startTimestamp ||
            _startTimestamp <= block.timestamp
        ) revert InvalidTimestamp();

        privateOfferingIds.increment();
        uint64 offeringId = privateOfferingIds.current().toUint64();

        privateOfferings[offeringId] = PrivateOffering({
            id: offeringId,
            supply: _supply.toUint16(),
            accountMaxSupply: _accountMaxSupply.toUint16(),
            startTimestamp: _startTimestamp.toUint64(),
            endTimestamp: _endTimestamp.toUint64(),
            minted: 0,
            price: _price
        });

        emitCreate("PrivateOffering", offeringId);
    }

    function setPrivateOfferingSupply(
        uint256 _offeringId,
        uint256 _supply,
        uint256 _accountMaxSupply
    ) external onlyOperator {
        if (!isExistOfferingById(OfferingType.Private, _offeringId))
            revert InvalidOfferingId();

        PrivateOffering storage offering = privateOfferings[_offeringId];

        if (_supply < offering.minted) revert InvalidSupply();

        ISLShadowMonarch shadowMonarchContract = ISLShadowMonarch(
            projectContract.getTokenContractByCollectionId(
                shadowMonarchCollectionId
            )
        );

        uint256 publicMintedSupply = shadowMonarchContract.getMintedSupply() -
            ownershipMinted;

        if (publicMintedSupply + _supply > PUBLIC_SUPPLY) revert ExceedSupply();

        uint256 beforeSupply = offering.supply;

        reservedSupply -= beforeSupply;
        reservedSupply += _supply;

        if (_supply % _accountMaxSupply != 0) revert InvalidSupply();

        uint256 whitelistAmount = _supply / _accountMaxSupply;

        if (whitelistAmount == 0) revert InvalidSupply();

        offering.supply = _supply.toUint16();
        offering.accountMaxSupply = _accountMaxSupply.toUint16();
    }

    function setPrivateOfferingTimestamp(
        uint256 _offeringId,
        uint256 _startTimestamp,
        uint256 _endTimestamp
    ) external onlyOperator {
        if (!isExistOfferingById(OfferingType.Private, _offeringId))
            revert InvalidOfferingId();

        if (
            _endTimestamp <= _startTimestamp ||
            _startTimestamp <= block.timestamp
        ) revert InvalidTimestamp();

        PrivateOffering storage offering = privateOfferings[_offeringId];

        offering.startTimestamp = _startTimestamp.toUint64();
        offering.endTimestamp = _endTimestamp.toUint64();
    }

    /*
     *  Offering Common
     */
    function removeOffering(
        OfferingType _offeringType,
        uint256 _offeringId
    ) external onlyOperator {
        if (!isExistOfferingById(_offeringType, _offeringId))
            revert InvalidOfferingId();

        if (!_isNotStartedOffering(_offeringType, _offeringId))
            revert AlreadyStartOffering();

        uint256 supply;

        if (_offeringType == OfferingType.Public) {
            PublicOffering storage offering = publicOfferings[_offeringId];

            supply = offering.supplyToWhitelist + offering.supplyToPublic;

            offering.id = 0;
        } else {
            PrivateOffering storage offering = privateOfferings[_offeringId];

            supply = offering.supply;

            offering.id = 0;
        }

        reservedSupply -= supply;

        emit OfferingRemoved(_offeringType, _offeringId, block.timestamp);
    }

    function setOfferingPrice(
        OfferingType _offeringType,
        uint256 _offeringId,
        uint256 _price
    ) external onlyOperator {
        if (!isExistOfferingById(_offeringType, _offeringId))
            revert InvalidOfferingId();

        if (!_isNotStartedOffering(_offeringType, _offeringId))
            revert AlreadyStartOffering();

        if (_offeringType == OfferingType.Public) {
            publicOfferings[_offeringId].price = _price;
        } else {
            privateOfferings[_offeringId].price = _price;
        }
    }

    function _isNotStartedOffering(
        OfferingType _offeringType,
        uint256 _offeringId
    ) internal view returns (bool) {
        if (_offeringType == OfferingType.Public) {
            PublicOffering memory offering = publicOfferings[_offeringId];

            if (
                block.timestamp < offering.startTimestamp &&
                offering.mintedByWhitelist + offering.mintedByPublic == 0
            ) return true;
        } else {
            PrivateOffering memory offering = privateOfferings[_offeringId];

            if (
                block.timestamp < offering.startTimestamp &&
                offering.minted == 0
            ) return true;
        }

        return false;
    }

    /*
     *  Offering Distribute
     */
    function distributeOffering(
        OfferingType _offeringType,
        uint256 _offeringId
    ) external onlyOperator {
        uint256 distributableBalance = getOfferingDistributableBalance(
            _offeringType,
            _offeringId
        );

        if (distributableBalance == 0) revert NotExistDistributableBalance();

        distributionContract.distributeOffering{value: distributableBalance}(
            _offeringType,
            _offeringId
        );
    }

    function getOfferingDistributableBalance(
        OfferingType _offeringType,
        uint256 _offeringId
    ) public view returns (uint256) {
        if (!isExistOfferingById(_offeringType, _offeringId))
            revert InvalidOfferingId();

        uint256 balance;

        if (_offeringType == OfferingType.Public) {
            PublicOffering memory publicOffering = publicOfferings[_offeringId];

            if (publicOffering.price == 0) {
                balance = 0;
            } else {
                uint256 minted = publicOffering.mintedByPublic +
                    publicOffering.mintedByWhitelist;

                balance = publicOffering.price * minted;
            }
        }

        if (_offeringType == OfferingType.Private) {
            PrivateOffering memory privateOffering = privateOfferings[
                _offeringId
            ];

            if (privateOffering.price == 0) {
                balance = 0;
            } else {
                balance = privateOffering.price * privateOffering.minted;
            }
        }

        uint256 distributedAmount = distributionContract
            .getOfferingDistributedAmount(_offeringType, _offeringId);

        return balance - distributedAmount;
    }

    /*
     *  View
     */
    function isExistOfferingById(
        OfferingType _offeringType,
        uint256 _offeringId
    ) public view returns (bool) {
        if (_offeringType == OfferingType.Public) {
            return
                _offeringId != 0 &&
                _offeringId <= publicOfferingIds.current() &&
                publicOfferings[_offeringId].id != 0;
        } else {
            return
                _offeringId != 0 &&
                _offeringId <= privateOfferingIds.current() &&
                privateOfferings[_offeringId].id != 0;
        }
    }

    function getPublicOfferingById(
        uint256 _offeringId
    ) external view returns (PublicOffering memory) {
        if (!isExistOfferingById(OfferingType.Public, _offeringId))
            revert InvalidOfferingId();

        return publicOfferings[_offeringId];
    }

    function getPrivateOfferingById(
        uint256 _offeringId
    ) external view returns (PrivateOffering memory) {
        if (!isExistOfferingById(OfferingType.Private, _offeringId))
            revert InvalidOfferingId();

        return privateOfferings[_offeringId];
    }

    function getPublicOfferingMinted(
        uint256 _offeringId
    )
        external
        view
        returns (uint256 mintedByWhitelist, uint256 mintedByPublic)
    {
        if (!isExistOfferingById(OfferingType.Public, _offeringId))
            revert InvalidOfferingId();

        PublicOffering memory offering = publicOfferings[_offeringId];

        mintedByWhitelist = offering.mintedByWhitelist;
        mintedByPublic = offering.mintedByPublic;
    }

    function getPrivateOfferingMinted(
        uint256 _offeringId
    ) external view returns (uint256) {
        if (!isExistOfferingById(OfferingType.Private, _offeringId))
            revert InvalidOfferingId();

        return privateOfferings[_offeringId].minted;
    }

    function getCurrentOfferingId(
        OfferingType _offeringType
    ) external view returns (uint256) {
        return
            _offeringType == OfferingType.Public
                ? publicOfferingIds.current()
                : privateOfferingIds.current();
    }

    function getOfferingReservedSupply() external view returns (uint256) {
        return reservedSupply;
    }
}
