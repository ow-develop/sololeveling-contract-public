// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

interface SeasonPackError {
    error DoesNotExistTokenId();
    error AlreadyMinted();
    error InvalidTokenId();
}
