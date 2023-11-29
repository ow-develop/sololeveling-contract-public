// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import {CountersUpgradeable} from "../utils/CountersUpgradeable.sol";
import {EnumerableSetUpgradeable} from "../utils/EnumerableSetUpgradeable.sol";

import {SLBaseUpgradeable} from "../core/SLBaseUpgradeable.sol";
import {SLControllerUpgradeable} from "../core/SLControllerUpgradeable.sol";
import {SJWOfferingError} from "../errors/SJWOfferingError.sol";
import {ISLSJWDistribution} from "../SJWDistribution/ISLSJWDistribution.sol";

// Max Supply: 10000
// Distributed Supply: 2000개 (20%)
// provider: 1000 (10%), creator: 500 (5%), operator: 300 (3%), associator: 200 (2%)
// LockUpTime: 365days, 이후 180일마다 500개씩 4번 민팅
// provider: 250, creator: 125, operator: 75, associator: 50

/// @notice Core storage and event for shadowMonarch offering contract
abstract contract SJWOfferingBase is
    SLBaseUpgradeable,
    SLControllerUpgradeable,
    SJWOfferingError
{
    CountersUpgradeable.Counter internal publicOfferingIds;
    CountersUpgradeable.Counter internal privateOfferingIds;
    CountersUpgradeable.Counter internal ownershipIds;

    // contract
    ISLSJWDistribution internal distributionContract;

    // collectionId
    uint256 internal shadowMonarchCollectionId;

    /// @notice precision 100.00000%
    uint256 internal constant DENOMINATOR = 100_00000;
    uint256 internal constant MAX_SUPPLY = 10000;
    uint256 internal constant PUBLIC_SUPPLY = 8000;

    uint256 internal maxAmountPerMint;
    uint256 internal reservedSupply;
    uint256 internal ownershipMinted;
    uint256 internal ownershipStartTimestamp;

    EnumerableSetUpgradeable.AddressSet internal ownershipAccounts;

    /*
     *  Struct
     */
    struct PublicOffering {
        uint64 id;
        uint16 supplyToWhitelist;
        uint16 supplyToPublic;
        uint16 accountMaxSupply;
        uint64 startTimestamp;
        uint64 whitelistExpirationTimestamp;
        uint64 endTimestamp;
        uint16 mintedByWhitelist;
        uint16 mintedByPublic;
        uint256 price;
    }

    struct PrivateOffering {
        uint64 id;
        uint16 supply;
        uint16 accountMaxSupply;
        uint64 startTimestamp;
        uint64 endTimestamp;
        uint16 minted;
        uint256 price;
    }

    struct Ownership {
        uint256 id;
        address account;
        uint16 supply;
        uint16 minted;
    }

    /*
     *  Mapping
     */
    /// @notice ownershipId to Ownership
    mapping(uint256 => Ownership) internal ownerships;

    /// @notice ownershipAccount to ownershipId
    mapping(address => uint256) internal ownershipIdByAccount;

    /// @notice publicOfferingId to PublicOffering
    mapping(uint256 => PublicOffering) internal publicOfferings;

    /// @notice privateOfferingId to PrviateOffering
    mapping(uint256 => PrivateOffering) internal privateOfferings;

    /// @notice publicOfferingId to account to minted count
    mapping(uint256 => mapping(address => uint256))
        internal accountMintedOfPublicOffering;

    /// @notice privateOfferingId to account to minted count
    mapping(uint256 => mapping(address => uint256))
        internal accountMintedOfPrivateOffering;

    /*
     *  Enum
     */
    enum OfferingType {
        Public,
        Private
    }

    /*
     *  Event
     */
    event OfferingRemoved(
        OfferingType indexed offeringType,
        uint256 indexed offeringId,
        uint256 timestamp
    );

    event Minted(
        address indexed to,
        uint256 startTokenId,
        uint256 amount,
        uint256 timestamp
    );

    event MintedBatch(
        address[] accounts,
        uint256 startTokenId,
        uint256[] amounts,
        uint256 timestamp
    );

    event OwnershipClaimed(
        uint256 ownershipId,
        address account,
        uint256 amount,
        uint256 timestamp
    );

    event OwnershipDistributed(
        uint256 ownershipId,
        address account,
        uint256 amount,
        uint256 timestamp
    );

    event SetOwnershipAccount(
        uint256 indexed ownershipId,
        address beforeAccount,
        address newAccount,
        uint256 timestamp
    );
}
