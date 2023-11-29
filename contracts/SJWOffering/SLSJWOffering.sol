// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import {UUPSUpgradeable} from "../utils/UUPSUpgradeable.sol";
import {Unsafe} from "../utils/Unsafe.sol";
import {CountersUpgradeable} from "../utils/CountersUpgradeable.sol";
import {EnumerableSetUpgradeable} from "../utils/EnumerableSetUpgradeable.sol";

import {Minting} from "./parts/Minting.sol";
import {ISLProject} from "../project/ISLProject.sol";
import {ISLSJWDistribution} from "../SJWDistribution/ISLSJWDistribution.sol";

// 오너쉽 로직 제거 -> 2000개 물량 maxAmountPerMint씩 오퍼레이터 마스터가 원하는 어카운트로 받아갈 수 있게
// 오퍼링 수익 분배 로직 제거 -> 수익금 오퍼레이터 마스터가 원하는 어카운트로 받아갈 수 있게

contract SLSJWOffering is Minting, UUPSUpgradeable {
    using Unsafe for uint256;
    using CountersUpgradeable for CountersUpgradeable.Counter;
    using EnumerableSetUpgradeable for EnumerableSetUpgradeable.AddressSet;

    function initialize(
        ISLProject _projectContract,
        ISLSJWDistribution _distributionContract,
        uint256 _shadowMonarchCollectionId,
        address[] calldata _ownershipAccounts,
        uint16[] calldata _ownershipSupplies
    ) public initializer {
        __SLCotroller_init(_projectContract);
        __ownershipAccount_init(_ownershipAccounts, _ownershipSupplies);

        distributionContract = _distributionContract;

        shadowMonarchCollectionId = _shadowMonarchCollectionId;

        ownershipStartTimestamp = block.timestamp + 365 days;
        maxAmountPerMint = 150;
    }

    function _authorizeUpgrade(address) internal override onlyOperatorMaster {}

    function __ownershipAccount_init(
        address[] calldata _ownershipAccounts,
        uint16[] calldata _ownershipSupplies
    ) private {
        if (_ownershipAccounts.length != _ownershipSupplies.length)
            revert InvalidArgument();

        uint256 totalSupply;

        for (uint256 i = 0; i < _ownershipAccounts.length; i = i.increment()) {
            ownershipIds.increment();
            uint256 ownershipId = ownershipIds.current();

            address account = _ownershipAccounts[i];
            uint16 supply = _ownershipSupplies[i];

            ownerships[ownershipId] = Ownership({
                id: ownershipId,
                account: account,
                supply: supply,
                minted: 0
            });
            ownershipIdByAccount[account] = ownershipId;
            ownershipAccounts.add(account);

            totalSupply += supply;
        }

        if (totalSupply != MAX_SUPPLY - PUBLIC_SUPPLY) revert InvalidSupply();
    }

    /*
     *  Base
     */
    function setDistributionContract(
        ISLSJWDistribution _distributionContract
    ) external onlyOperator {
        distributionContract = _distributionContract;
    }

    function setShadowMonarchCollectionId(
        uint256 _shadowMonarchCollectionId
    ) external onlyOperator {
        if (!projectContract.isActiveCollection(_shadowMonarchCollectionId))
            revert InvalidCollectionId();

        TokenType tokenType = projectContract.getCollectionTypeByCollectionId(
            _shadowMonarchCollectionId
        );

        if (tokenType != TokenType.ERC721) revert InvalidCollectionId();

        shadowMonarchCollectionId = _shadowMonarchCollectionId;
    }

    function setMaxAmountPerMint(
        uint256 _maxAmountPerMint
    ) external onlyOperator {
        if (_maxAmountPerMint == 0) revert InvalidArgument();

        maxAmountPerMint = _maxAmountPerMint;
    }

    function getDistributionContract() external view returns (address) {
        return address(distributionContract);
    }

    function getShadowMonarchCollectionId() external view returns (uint256) {
        return shadowMonarchCollectionId;
    }

    function getMaxAmountPerMint() external view returns (uint256) {
        return maxAmountPerMint;
    }

    function getDenominator() external pure returns (uint256) {
        return DENOMINATOR;
    }
}
