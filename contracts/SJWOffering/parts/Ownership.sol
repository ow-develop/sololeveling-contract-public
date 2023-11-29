// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import {Unsafe} from "../../utils/Unsafe.sol";
import {CountersUpgradeable} from "../../utils/CountersUpgradeable.sol";
import {EnumerableSetUpgradeable} from "../../utils/EnumerableSetUpgradeable.sol";
import {SafeCastUpgradeable} from "../../utils/SafeCastUpgradeable.sol";

import {Offering} from "./Offering.sol";
import {ISLShadowMonarch} from "../../collections/shadowMonarch/ISLShadowMonarch.sol";

abstract contract Ownership is Offering {
    using Unsafe for uint256;
    using CountersUpgradeable for CountersUpgradeable.Counter;
    using EnumerableSetUpgradeable for EnumerableSetUpgradeable.AddressSet;
    using SafeCastUpgradeable for uint256;

    /*
     *  Mint
     */
    function claimOwnership() external {
        address account = _msgSender();

        uint256 mintableSupply = getMintableSupplyByAccount(account);
        if (mintableSupply == 0) revert NotExistMintableSupply();

        uint256 ownershipId = getOwnershipIdByAccount(account);

        uint256 amount = mintableSupply -
            getOwnershipMintedByOwnershipId(ownershipId);

        if (amount == 0) revert AlreadyMinted();

        if (amount > maxAmountPerMint) {
            amount = maxAmountPerMint;
        }

        _ownershipMint(ownershipId, amount);

        emit OwnershipClaimed(ownershipId, account, amount, block.timestamp);
    }

    function distributeOwnership(uint256 _ownershipId) external onlyOperator {
        uint256 mintableSupply = getMintableSupplyByOwnershipId(_ownershipId);
        if (mintableSupply == 0) revert NotExistMintableSupply();

        Ownership memory ownership = ownerships[_ownershipId];

        uint256 amount = mintableSupply - ownership.minted;

        if (amount == 0) revert AlreadyMinted();

        if (amount > maxAmountPerMint) {
            amount = maxAmountPerMint;
        }

        _ownershipMint(_ownershipId, amount);

        emit OwnershipDistributed(
            _ownershipId,
            ownership.account,
            amount,
            block.timestamp
        );
    }

    function _ownershipMint(uint256 _ownershipId, uint256 _amount) private {
        Ownership storage ownership = ownerships[_ownershipId];

        ownership.minted += _amount.toUint16();
        ownershipMinted += _amount;

        ISLShadowMonarch shadowMonarchContract = ISLShadowMonarch(
            projectContract.getTokenContractByCollectionId(
                shadowMonarchCollectionId
            )
        );
        uint256 startTokenId = shadowMonarchContract.getMintedSupply() + 1;
        shadowMonarchContract.mint(ownership.account, _amount);
        emit Minted({
            to: ownership.account,
            startTokenId: startTokenId,
            amount: _amount,
            timestamp: block.timestamp
        });
    }

    /*
     *  Ownership
     */
    function setOwnershipAccount(
        uint256 _ownershipId,
        address _account
    ) external onlyOperatorMaster {
        if (!isExistOwnershipById(_ownershipId)) revert InvalidOwnershipId();

        if (isOwnershipAccount(_account)) revert AlreadyOwnershipAccount();

        Ownership storage ownership = ownerships[_ownershipId];

        address beforeAccount = ownership.account;

        ownerships[_ownershipId].account = _account;

        ownershipIdByAccount[beforeAccount] = 0;
        ownershipIdByAccount[_account] = ownership.id;

        ownershipAccounts.remove(beforeAccount);
        ownershipAccounts.add(_account);

        emit SetOwnershipAccount(
            _ownershipId,
            beforeAccount,
            _account,
            block.timestamp
        );
    }

    function isOwnershipAccount(address _account) public view returns (bool) {
        return ownershipIdByAccount[_account] != 0;
    }

    function getOwnershipIdByAccount(
        address _account
    ) public view returns (uint256) {
        if (!isOwnershipAccount(_account)) revert OnlyOwnershipAccount();

        return ownershipIdByAccount[_account];
    }

    function getOwnershipByAccount(
        address _account
    ) public view returns (Ownership memory) {
        if (!isOwnershipAccount(_account)) revert OnlyOwnershipAccount();

        return ownerships[getOwnershipIdByAccount(_account)];
    }

    function isExistOwnershipById(
        uint256 _ownershipId
    ) public view returns (bool) {
        return _ownershipId != 0 && _ownershipId <= ownershipIds.current();
    }

    function getOwnershipById(
        uint256 _ownershipId
    ) public view returns (Ownership memory) {
        if (!isExistOwnershipById(_ownershipId)) revert InvalidOwnershipId();

        return ownerships[_ownershipId];
    }

    function getOwnershipMintedByOwnershipId(
        uint256 _ownershipId
    ) public view returns (uint256) {
        if (!isExistOwnershipById(_ownershipId)) revert InvalidOwnershipId();

        return ownerships[_ownershipId].minted;
    }

    function getOwnershipMintedByAccount(
        address _account
    ) external view returns (uint256) {
        Ownership memory ownership = getOwnershipByAccount(_account);

        return ownership.minted;
    }

    function getMintableSupplyByAccount(
        address _account
    ) public view returns (uint256) {
        if (!isOwnershipAccount(_account)) revert OnlyOwnershipAccount();

        uint256 currentBlockTimestamp = block.timestamp;
        Ownership memory ownership = getOwnershipByAccount(_account);

        uint256 supplyPerLockUpTime = ownership.supply / 4;

        if (currentBlockTimestamp > ownershipStartTimestamp + (180 days * 4)) {
            return supplyPerLockUpTime * 4;
        }

        if (currentBlockTimestamp > ownershipStartTimestamp + (180 days * 3)) {
            return supplyPerLockUpTime * 3;
        }

        if (currentBlockTimestamp > ownershipStartTimestamp + (180 days * 2)) {
            return supplyPerLockUpTime * 2;
        }

        if (currentBlockTimestamp > ownershipStartTimestamp + (180 days * 1)) {
            return supplyPerLockUpTime * 1;
        }

        return 0;
    }

    function getMintableSupplyByOwnershipId(
        uint256 _ownershipId
    ) public view returns (uint256) {
        Ownership memory ownership = getOwnershipById(_ownershipId);

        uint256 currentBlockTimestamp = block.timestamp;

        uint256 supplyPerLockUpTime = ownership.supply / 4;

        if (currentBlockTimestamp > ownershipStartTimestamp + (180 days * 4)) {
            return supplyPerLockUpTime * 4;
        }

        if (currentBlockTimestamp > ownershipStartTimestamp + (180 days * 3)) {
            return supplyPerLockUpTime * 3;
        }

        if (currentBlockTimestamp > ownershipStartTimestamp + (180 days * 2)) {
            return supplyPerLockUpTime * 2;
        }

        if (currentBlockTimestamp > ownershipStartTimestamp + (180 days * 1)) {
            return supplyPerLockUpTime * 1;
        }

        return 0;
    }

    function getOwnershipAccounts() public view returns (address[] memory) {
        return ownershipAccounts.values();
    }

    function getOwnershipAccountLength() external view returns (uint256) {
        return ownershipAccounts.length();
    }

    function getOwnerships() external view returns (Ownership[] memory) {
        uint256 length = ownershipIds.current();
        Ownership[] memory allOwnerships = new Ownership[](length);

        for (uint256 i = 0; i < length; i = i.increment()) {
            allOwnerships[i] = ownerships[i + 1];
        }

        return allOwnerships;
    }

    function getOwnershipStartTimestamp() external view returns (uint256) {
        return ownershipStartTimestamp;
    }

    function getOwnershipMinted() external view returns (uint256) {
        return ownershipMinted;
    }
}
