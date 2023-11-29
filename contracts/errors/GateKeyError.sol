// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

interface GateKeyError {
    error DoesNotExistTokenId();
    error SignatureVerifyFailed();
    error InvalidArgument();
}
