// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

interface ShopError {
    error InvalidPrice();
    error SellPaused();
    error ExceedBalance();
    error TransferFailed();
    error InvalidCollectionId();
    error InsufficientAllowance();
}
