// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

interface SJWDistributionError {
    //////////////////
    // Distribution //
    //////////////////

    error InvalidOfferingId();
    error OnlyOfferingContract();
    error TransferFailed();
    error InvalidAccount();
    error InvalidRate();
    error InvalidArgument();
    error InvalidAddress();
}
