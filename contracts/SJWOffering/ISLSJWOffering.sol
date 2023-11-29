// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import {SJWOfferingBase} from "./SJWOfferingBase.sol";
import {ISLSJWDistribution} from "../SJWDistribution/ISLSJWDistribution.sol";

interface ISLSJWOffering {
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
    ) external;

    function setPublicOfferingSupply(
        uint256 _offeringId,
        uint256 _supplyToWhitelist,
        uint256 _supplyToPublic,
        uint256 _accountMaxSupply
    ) external;

    function setPublicOfferingTimestamp(
        uint256 _offeringId,
        uint256 _startTimestamp,
        uint256 _whitelistExpirationTimestamp,
        uint256 _endTimestamp
    ) external;

    /*
     *  Private Offering
     */
    function addPrivateOffering(
        uint256 _supply,
        uint256 _accountMaxSupply,
        uint256 _startTimestamp,
        uint256 _endTimestamp,
        uint256 _price
    ) external;

    function setPrivateOfferingSupply(
        uint256 _offeringId,
        uint256 _supply,
        uint256 _accountMaxSupply
    ) external;

    function setPrivateOfferingTimestamp(
        uint256 _offeringId,
        uint256 _startTimestamp,
        uint256 _endTimestamp
    ) external;

    /*
     *  Offering Common
     */
    function removeOffering(
        SJWOfferingBase.OfferingType _offeringType,
        uint256 _offeringId
    ) external;

    function setOfferingPrice(
        SJWOfferingBase.OfferingType _offeringType,
        uint256 _offeringId,
        uint256 _price
    ) external;

    /*
     *  Offering Distribute
     */
    function distributeOffering(
        SJWOfferingBase.OfferingType _offeringType,
        uint256 _offeringId
    ) external;

    function getOfferingDistributableBalance(
        SJWOfferingBase.OfferingType _offeringType,
        uint256 _offeringId
    ) external view returns (uint256);

    /*
     *  Offering View
     */
    function isExistOfferingById(
        SJWOfferingBase.OfferingType _offeringType,
        uint256 _offeringId
    ) external view returns (bool);

    function getPublicOfferingById(
        uint256 _offeringId
    ) external view returns (SJWOfferingBase.PublicOffering memory);

    function getPrivateOfferingById(
        uint256 _offeringId
    ) external view returns (SJWOfferingBase.PrivateOffering memory);

    function getPublicOfferingMinted(
        uint256 _offeringId
    ) external view returns (uint256 mintedByWhitelist, uint256 mintedByPublic);

    function getPrivateOfferingMinted(
        uint256 _offeringId
    ) external view returns (uint256);

    function getCurrentOfferingId(
        SJWOfferingBase.OfferingType _offeringType
    ) external view returns (uint256);

    function getOfferingReservedSupply() external view returns (uint256);

    /*
     *  Ownership
     */
    function claimOwnership() external;

    function distributeOwnership(uint256 _ownershipId) external;

    function setOwnershipAccount(
        uint256 _ownershipId,
        address _account
    ) external;

    function isOwnershipAccount(address _account) external view returns (bool);

    function getOwnershipIdByAccount(
        address _account
    ) external view returns (uint256);

    function getOwnershipByAccount(
        address _account
    ) external view returns (SJWOfferingBase.Ownership memory);

    function isExistOwnershipById(
        uint256 _ownershipId
    ) external view returns (bool);

    function getOwnershipById(
        uint256 _ownershipId
    ) external view returns (SJWOfferingBase.Ownership memory);

    function getOwnershipMintedByOwnershipId(
        uint256 _ownershipId
    ) external view returns (uint256);

    function getOwnershipMintedByAccount(
        address _account
    ) external view returns (uint256);

    function getMintableSupplyByAccount(
        address _account
    ) external view returns (uint256);

    function getMintableSupplyByOwnershipId(
        uint256 _ownershipId
    ) external view returns (uint256);

    function getOwnershipAccounts() external view returns (address[] memory);

    function getOwnershipAccountLength() external view returns (uint256);

    function getOwnerships()
        external
        view
        returns (SJWOfferingBase.Ownership[] memory);

    function getOwnershipStartTimestamp() external view returns (uint256);

    function getOwnershipMinted() external view returns (uint256);

    /*
     *  Minting
     */
    function mintOfAirdrop(address _to, uint256 _amount) external;

    function mintOfAirdropBatch(
        address[] calldata _accounts,
        uint256[] calldata _amounts
    ) external;

    function mintOfOffering(
        SJWOfferingBase.OfferingType _offeringType,
        uint256 _offeringId,
        bytes calldata _whitelistSignature
    ) external payable;

    /*
     *  Base
     */
    function setDistributionContract(
        ISLSJWDistribution _distributionContract
    ) external;

    function setShadowMonarchCollectionId(
        uint256 _ShadowMonarchCollectionId
    ) external;

    function setMaxAmountPerMint(uint256 _maxAmountPerMint) external;

    function getDistributionContract() external view returns (address);

    function getShadowMonarchCollectionId() external view returns (uint256);

    function getMaxAmountPerMint() external view returns (uint256);

    function getDenominator() external pure returns (uint256);
}
