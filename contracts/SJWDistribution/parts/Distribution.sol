// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import {Unsafe} from "../../utils/Unsafe.sol";

import {ISLSJWDistribution} from "../ISLSJWDistribution.sol";
import {SJWDistributionBase} from "../SJWDistributionBase.sol";
import {SJWOfferingBase} from "../../SJWOffering/SJWOfferingBase.sol";

abstract contract Distribution is ISLSJWDistribution, SJWDistributionBase {
    using Unsafe for uint256;

    /*
     *  Distribution
     */
    function setOfferingDistributedAccounts(
        address[] calldata _distributedAccounts,
        uint256[] calldata _distributedRates
    ) external onlyOperatorMaster {
        if (_distributedAccounts.length != _distributedRates.length)
            revert InvalidArgument();

        if (!_isValidDistributedAccounts(_distributedAccounts))
            revert InvalidAccount();

        if (!_isValidDistributedRates(_distributedRates)) revert InvalidRate();

        distributedAccounts = _distributedAccounts;
        distributedRates = _distributedRates;

        emit SetDistributedAccounts(
            _distributedAccounts,
            _distributedRates,
            block.timestamp
        );
    }

    function _isValidDistributedAccounts(
        address[] calldata _accounts
    ) internal pure returns (bool) {
        for (uint256 i = 0; i < _accounts.length; i = i.increment()) {
            if (_accounts[i] == address(0)) return false;
        }

        return true;
    }

    function _isValidDistributedRates(
        uint256[] calldata _rates
    ) internal pure returns (bool) {
        uint256 totalRate;

        for (uint256 i = 0; i < _rates.length; i = i.increment()) {
            totalRate += _rates[i];
        }

        return totalRate == DENOMINATOR;
    }

    /*
     *  Distribute
     */
    function distributeOffering(
        SJWOfferingBase.OfferingType _offeringType,
        uint256 _offeringId
    ) external payable {
        if (_msgSender() != address(offeringContract))
            revert OnlyOfferingContract();

        uint256 balance = msg.value;

        distributedAmounts[_offeringType][_offeringId] += balance;

        uint256[] memory amounts = _distribute(
            balance,
            distributedAccounts,
            distributedRates
        );

        emit OfferingDistributed(
            _offeringType,
            _offeringId,
            balance,
            distributedAccounts,
            amounts,
            block.timestamp
        );
    }

    function _distribute(
        uint256 _balance,
        address[] memory _accounts,
        uint256[] memory _rates
    ) private returns (uint256[] memory) {
        uint256[] memory amounts = _calculateAmount(_balance, _rates);

        _transfer(_accounts, amounts);

        return amounts;
    }

    function _calculateAmount(
        uint256 _balance,
        uint256[] memory _rates
    ) private pure returns (uint256[] memory) {
        uint256[] memory amounts = new uint256[](_rates.length);

        for (uint256 i = 0; i < _rates.length; i = i.increment()) {
            amounts[i] = (_balance * _rates[i]) / DENOMINATOR;
        }

        return amounts;
    }

    function _transfer(
        address[] memory _accounts,
        uint256[] memory _amounts
    ) private {
        for (uint256 i = 0; i < _accounts.length; i = i.increment()) {
            if (_accounts[i] == address(0)) {
                revert InvalidAddress();
            }

            if (_amounts[i] == 0) {
                continue;
            }

            (bool success, ) = _accounts[i].call{value: _amounts[i]}("");

            if (!success) {
                revert TransferFailed();
            }
        }
    }

    /*
     *  View
     */
    function getOfferingDistributedAccounts()
        external
        view
        returns (address[] memory accounts, uint256[] memory rates)
    {
        return (distributedAccounts, distributedRates);
    }

    function getOfferingDistributedAmount(
        SJWOfferingBase.OfferingType _offeringType,
        uint256 _offeringId
    ) external view returns (uint256) {
        if (!offeringContract.isExistOfferingById(_offeringType, _offeringId))
            revert InvalidOfferingId();

        return distributedAmounts[_offeringType][_offeringId];
    }
}
