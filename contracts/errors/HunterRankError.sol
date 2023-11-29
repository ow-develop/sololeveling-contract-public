// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

interface HunterRankError {
    error FunctionNotSupported();
    error OnlySeasonContract();
    error DoesNotEnabled();
    error DoesNotExistTokenId();
}
