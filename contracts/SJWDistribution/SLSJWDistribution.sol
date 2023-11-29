// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import {UUPSUpgradeable} from "../utils/UUPSUpgradeable.sol";

import {Distribution} from "./parts/Distribution.sol";
import {ISLProject} from "../project/ISLProject.sol";
import {ISLSJWOffering} from "../SJWOffering/ISLSJWOffering.sol";

contract SLSJWDistribution is Distribution, UUPSUpgradeable {
    function initialize(
        ISLProject _projectContract,
        ISLSJWOffering _offeringContract,
        address[] calldata _distributedAccounts,
        uint256[] calldata _distributedRates
    ) public initializer {
        __SLCotroller_init(_projectContract);
        __distributedAccount_init(_distributedAccounts, _distributedRates);

        offeringContract = _offeringContract;
    }

    function _authorizeUpgrade(address) internal override onlyOperatorMaster {}

    function __distributedAccount_init(
        address[] calldata _distributedAccounts,
        uint256[] calldata _distributedRates
    ) private {
        if (_distributedAccounts.length != _distributedRates.length)
            revert InvalidArgument();

        if (!_isValidDistributedAccounts(_distributedAccounts))
            revert InvalidAccount();

        if (!_isValidDistributedRates(_distributedRates)) revert InvalidRate();

        distributedAccounts = _distributedAccounts;
        distributedRates = _distributedRates;
    }

    /*
     *  Base
     */
    function setOfferingContract(
        ISLSJWOffering _offeringContract
    ) external onlyOperator {
        offeringContract = _offeringContract;
    }

    function getOfferingContract() external view returns (address) {
        return address(offeringContract);
    }

    function getDenominator() external pure returns (uint256) {
        return DENOMINATOR;
    }
}
