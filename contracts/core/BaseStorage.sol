// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

abstract contract BaseStorage {
    /*
     *  Enum
     */
    enum TokenType {
        ERC721,
        ERC1155
    }

    enum RankType {
        E,
        D,
        C,
        B,
        A,
        S
    }

    /*
     *  Event
     */
    event Create(string target, uint64 targetId, uint256 timestamp);

    /*
     *  Constant
     */
    uint256 internal constant ESSENCE_STONE_TOKEN_ID = 1;
}
