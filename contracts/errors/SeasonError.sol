// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

interface SeasonError {
    ////////////
    // Season //
    ////////////

    error InvalidBlockNumber();
    error InvalidSeasonId();
    error InvalidCollectionId();
    error EndedSeason();
    error AlreadyStartSeason();
}
