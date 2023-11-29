// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import {Unsafe} from "../../utils/Unsafe.sol";
import {SafeCastUpgradeable} from "../../utils/SafeCastUpgradeable.sol";
import {ECDSAUpgradeable} from "../../utils/ECDSAUpgradeable.sol";

import {Ownership} from "./Ownership.sol";
import {ISLShadowMonarch} from "../../collections/shadowMonarch/ISLShadowMonarch.sol";

abstract contract Minting is Ownership {
    using Unsafe for uint256;
    using SafeCastUpgradeable for uint256;
    using ECDSAUpgradeable for bytes32;

    /*
     *  Airdrop Minting
     */
    function mintOfAirdrop(address _to, uint256 _amount) public onlyOperator {
        ISLShadowMonarch shadowMonarchContract = ISLShadowMonarch(
            projectContract.getTokenContractByCollectionId(
                shadowMonarchCollectionId
            )
        );

        if (_amount == 0) revert InvalidArgument();

        uint256 publicMintedSupply = shadowMonarchContract.getMintedSupply() -
            ownershipMinted;

        if (publicMintedSupply + _amount > PUBLIC_SUPPLY) revert ExceedSupply();

        if (_amount > maxAmountPerMint) revert ExceedMaxAmountPerMint();

        uint256 startTokenId = shadowMonarchContract.getMintedSupply() + 1;
        shadowMonarchContract.mint(_to, _amount);
        emit Minted({
            to: _to,
            startTokenId: startTokenId,
            amount: _amount,
            timestamp: block.timestamp
        });
    }

    function mintOfAirdropBatch(
        address[] calldata _accounts,
        uint256[] calldata _amounts
    ) external onlyOperator {
        if (_accounts.length != _amounts.length) revert InvalidArgument();

        ISLShadowMonarch shadowMonarchContract = ISLShadowMonarch(
            projectContract.getTokenContractByCollectionId(
                shadowMonarchCollectionId
            )
        );

        uint256 totalAmount;

        for (uint256 i = 0; i < _amounts.length; i = i.increment()) {
            uint256 amount = _amounts[i];

            if (amount == 0) revert InvalidArgument();

            totalAmount += amount;
        }

        uint256 publicMintedSupply = shadowMonarchContract.getMintedSupply() -
            ownershipMinted;

        if (publicMintedSupply + totalAmount > PUBLIC_SUPPLY)
            revert ExceedSupply();

        if (totalAmount > maxAmountPerMint) revert ExceedMaxAmountPerMint();

        uint256 startTokenId = shadowMonarchContract.getMintedSupply() + 1;

        emit MintedBatch(_accounts, startTokenId, _amounts, block.timestamp);
        shadowMonarchContract.mintBatch(_accounts, _amounts);
    }

    /*
     *  Offering Minting
     */
    function mintOfOffering(
        OfferingType _offeringType,
        uint256 _offeringId,
        bytes calldata _whitelistSignature
    ) external payable {
        address buyer = _msgSender();

        if (buyer == address(0) || buyer == address(this))
            revert InvalidAddress();

        if (!isExistOfferingById(_offeringType, _offeringId))
            revert InvalidOfferingId();

        ISLShadowMonarch shadowMonarchContract = ISLShadowMonarch(
            projectContract.getTokenContractByCollectionId(
                shadowMonarchCollectionId
            )
        );

        uint16 amount;
        uint256 startTokenId = shadowMonarchContract.getMintedSupply() + 1;
        uint256 price = uint256(msg.value);

        if (_offeringType == OfferingType.Public) {
            PublicOffering memory offering = publicOfferings[_offeringId];

            amount = _checkOfferingAndGetAmount(
                price,
                offering.price,
                offering.accountMaxSupply,
                accountMintedOfPublicOffering[_offeringId][buyer],
                offering.startTimestamp,
                offering.endTimestamp
            );

            accountMintedOfPublicOffering[_offeringId][buyer] += amount;

            _mintOfPublicOffering(
                shadowMonarchContract,
                _offeringId,
                buyer,
                amount,
                _whitelistSignature
            );
        } else {
            PrivateOffering memory offering = privateOfferings[_offeringId];

            amount = _checkOfferingAndGetAmount(
                price,
                offering.price,
                offering.accountMaxSupply,
                accountMintedOfPrivateOffering[_offeringId][buyer],
                offering.startTimestamp,
                offering.endTimestamp
            );

            accountMintedOfPrivateOffering[_offeringId][buyer] += amount;

            _mintOfPrivateOffering(
                shadowMonarchContract,
                _offeringId,
                buyer,
                amount,
                _whitelistSignature
            );
        }

        emit Minted({
            to: buyer,
            startTokenId: startTokenId,
            amount: amount,
            timestamp: block.timestamp
        });
    }

    function _checkOfferingAndGetAmount(
        uint256 _buyerPrice,
        uint256 _offeringPrice,
        uint16 _accountMaxSupply,
        uint256 _accountMinted,
        uint64 _startTimestamp,
        uint64 _endTimestamp
    ) private view returns (uint16) {
        // check timestamp
        if (
            block.timestamp < _startTimestamp || _endTimestamp < block.timestamp
        ) revert InvalidTimestamp();

        uint16 amount;

        // check pricec
        if (_offeringPrice == 0) {
            if (_buyerPrice != 0) revert InvalidPrice();

            amount = _accountMaxSupply;
        } else {
            if (_buyerPrice % _offeringPrice != 0) revert InvalidPrice();

            amount = (_buyerPrice / _offeringPrice).toUint16();

            if (amount == 0) revert InvalidPrice();
        }

        // check amount
        if (amount > maxAmountPerMint) revert ExceedMaxAmountPerMint();

        if (_accountMaxSupply < _accountMinted + amount)
            revert ExceedAccountMaxSupply();

        return amount;
    }

    function _mintOfPublicOffering(
        ISLShadowMonarch _shadowMonarchContract,
        uint256 _offeringId,
        address _buyer,
        uint16 _amount,
        bytes calldata _whitelistSignature
    ) private {
        PublicOffering storage offering = publicOfferings[_offeringId];

        uint256 publicMintedSupply = _shadowMonarchContract.getMintedSupply() -
            ownershipMinted;

        if (publicMintedSupply + _amount > PUBLIC_SUPPLY) revert ExceedSupply();

        bool isWhitelist;
        if (_whitelistSignature.length > 0) {
            if (
                !_verifyWhitelistSignature(
                    OfferingType.Public,
                    _offeringId,
                    _buyer,
                    _whitelistSignature
                )
            ) revert WhitelistSignatureVerifyFailed();

            isWhitelist = true;
        }

        // buyer is whitelist and not ended whitelist time
        if (
            isWhitelist &&
            block.timestamp <= offering.whitelistExpirationTimestamp
        ) {
            if (
                offering.supplyToWhitelist <
                offering.mintedByWhitelist + _amount
            ) revert ExceedSupply();

            offering.mintedByWhitelist += _amount;

            // buyer is public and not ended whitelist time
        } else if (block.timestamp <= offering.whitelistExpirationTimestamp) {
            if (offering.supplyToPublic < offering.mintedByPublic + _amount)
                revert ExceedSupply();

            offering.mintedByPublic += _amount;

            // ended whitelist time
        } else {
            uint256 supplyToPublic = offering.supplyToPublic +
                (offering.supplyToWhitelist - offering.mintedByWhitelist);

            if (supplyToPublic < offering.mintedByPublic + _amount)
                revert ExceedSupply();

            offering.mintedByPublic += _amount;
        }

        _shadowMonarchContract.mint(_buyer, _amount);
    }

    function _mintOfPrivateOffering(
        ISLShadowMonarch _shadowMonarchContract,
        uint256 _offeringId,
        address _buyer,
        uint16 _amount,
        bytes calldata _whitelistSignature
    ) private {
        PrivateOffering storage offering = privateOfferings[_offeringId];

        uint256 publicMintedSupply = _shadowMonarchContract.getMintedSupply() -
            ownershipMinted;

        if (publicMintedSupply + _amount > PUBLIC_SUPPLY) revert ExceedSupply();

        if (
            !_verifyWhitelistSignature(
                OfferingType.Private,
                _offeringId,
                _buyer,
                _whitelistSignature
            )
        ) revert WhitelistSignatureVerifyFailed();

        if (offering.supply < offering.minted + _amount) revert ExceedSupply();

        offering.minted += _amount;

        _shadowMonarchContract.mint(_buyer, _amount);
    }

    function _verifyWhitelistSignature(
        OfferingType _offeringType,
        uint256 _offeringId,
        address _buyer,
        bytes calldata _whitelistSignature
    ) private view returns (bool) {
        bytes32 data;

        if (_offeringType == OfferingType.Public) {
            data = keccak256(abi.encodePacked("Public", _offeringId, _buyer));
        }

        if (_offeringType == OfferingType.Private) {
            data = keccak256(abi.encodePacked("Private", _offeringId, _buyer));
        }

        bytes32 signedHash = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", data)
        );

        address signer = signedHash.recover(_whitelistSignature);

        return projectContract.isOperator(signer);
    }
}
