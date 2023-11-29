// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

interface InviteSBTError {
    error FunctionNotSupported();
    error DoesNotEnabled();
    error AlreadyMinted();
    error InvalidArgument();
    error DoesNotExistTokenId();
}
