// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

interface SystemError {
    error InvalidRankType();
    error InvalidArgument();
    error InvalidMonsterSignature();
    error InvalidMonster();
    error DoesNotEnoughStoneBalance();
    error InvalidPercentage();
    error InvalidCollectionId();
}
