// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

interface CollectionTraitError {
    error AlreadyExistTypeName();
    error AlreadyExistValueName();
    error InvalidTraitTypeId();
    error InvalidTraitValueId();
    error AlreadyExistToken();
    error InvalidCollectionId();
}
