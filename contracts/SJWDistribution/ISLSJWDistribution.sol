// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import {SJWDistributionBase} from "./SJWDistributionBase.sol";
import {SJWOfferingBase} from "../SJWOffering/SJWOfferingBase.sol";
import {ISLSJWOffering} from "../SJWOffering/ISLSJWOffering.sol";

interface ISLSJWDistribution {
    /*
     *  Distribution
     */
    function setOfferingDistributedAccounts(
        address[] calldata _distributedAccounts,
        uint256[] calldata _distributedRates
    ) external;

    function distributeOffering(
        SJWOfferingBase.OfferingType _offeringType,
        uint256 _offeringId
    ) external payable;

    function getOfferingDistributedAccounts()
        external
        view
        returns (address[] memory accounts, uint256[] memory rates);

    function getOfferingDistributedAmount(
        SJWOfferingBase.OfferingType _offeringType,
        uint256 _offeringId
    ) external view returns (uint256);

    /*
     *  Base
     */
    function setOfferingContract(ISLSJWOffering _offeringContract) external;

    function getOfferingContract() external view returns (address);

    function getDenominator() external pure returns (uint256);
}
