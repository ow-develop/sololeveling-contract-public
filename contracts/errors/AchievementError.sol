// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

interface AchievementError {
    error InvalidCollection();
    error InvalidAchievementId();
    error FunctionNotSupported();
    error DoesNotExistTokenId();
    error DoesNotMintEnabled();
    error AlreadyMinted();
    error NotEnoughTokenBalance();
    error GeneralAchievementVerifyFailed();
}
