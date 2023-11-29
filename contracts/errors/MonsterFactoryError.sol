// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

interface MonsterFactoryError {
    /////////////
    // Monster //
    /////////////

    error InvalidRankType();
    error InvalidMonsterId();
    error AlreadyMinted();
    error InvalidArgument();
    error DoesNotExistAriseMonster();
}
