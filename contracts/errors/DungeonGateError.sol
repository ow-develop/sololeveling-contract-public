// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

interface DungeonGateError {
    //////////
    // Slot //
    //////////

    error InvalidSlot();

    //////////
    // Gate //
    //////////

    error InvalidSeasonId();
    error InvalidRankType();
    error InvalidPrice();
    error ExceedGateSlot();
    error InvalidGateId();
    error InvalidGateSignature();
    error AlreadyClearGate();
    error InvalidArgument();

    //////////
    // Base //
    //////////

    error InvalidCollectionId();
}
