// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

interface SeasonSettlementError {
    ///////////
    // Score //
    ///////////

    error InvalidRate();
    error InvalidSeasonId();

    ////////////
    // Reward //
    ////////////

    error AlreadyClaimed();

    ////////////////
    // Collection //
    ////////////////

    error InvalidCollectionId();
}
