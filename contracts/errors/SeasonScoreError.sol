// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

interface SeasonScoreError {
    error FunctionNotSupported();
    error OnlySeasonSettlementContract();
    error DoesNotExistTokenId();
}
