// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import {CountersUpgradeable} from "../utils/CountersUpgradeable.sol";
import {EnumerableSetUpgradeable} from "../utils/EnumerableSetUpgradeable.sol";

import {SLBaseUpgradeable} from "../core/SLBaseUpgradeable.sol";
import {SLControllerUpgradeable} from "../core/SLControllerUpgradeable.sol";
import {SJWDistributionError} from "../errors/SJWDistributionError.sol";
import {ISLSJWOffering} from "../SJWOffering/ISLSJWOffering.sol";
import {SJWOfferingBase} from "../SJWOffering/SJWOfferingBase.sol";

/// @notice Core storage and event for shadowMonarch offering distribution contract
abstract contract SJWDistributionBase is
    SLBaseUpgradeable,
    SLControllerUpgradeable,
    SJWDistributionError
{
    /// @notice precision 100.00000%
    uint256 internal constant DENOMINATOR = 100_00000;

    // offering contract
    ISLSJWOffering internal offeringContract;

    // offerting distributions
    address[] internal distributedAccounts;
    uint256[] internal distributedRates;

    /*
     *  Mapping
     */
    /// @notice OfferingType to offeringId to distributed amount
    mapping(SJWOfferingBase.OfferingType => mapping(uint256 => uint256))
        internal distributedAmounts;

    /*
     *  Event
     */
    event SetDistributedAccounts(
        address[] distributedAccounts,
        uint256[] distributedRates,
        uint256 timestamp
    );

    event OfferingDistributed(
        SJWOfferingBase.OfferingType indexed offeringType,
        uint256 indexed offeringId,
        uint256 amount,
        address[] distributedAccounts,
        uint256[] distributedAmounts,
        uint256 timestamp
    );
}
