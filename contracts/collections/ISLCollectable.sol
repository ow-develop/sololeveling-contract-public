// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

interface ISLCollectable {
    function getCollectingScoreAtBlock(
        address _hunter,
        uint256 _blockNumber
    ) external view returns (uint256);

    function getLatestCollectingScore(
        address _hunter
    ) external view returns (uint256);

    function getCollectingScoreAtBlockBatch(
        address[] calldata _hunters,
        uint256[] calldata _blockNumbers
    ) external view returns (uint256[] memory);

    function getLatestCollectingScoreBatch(
        address[] calldata _hunters
    ) external view returns (uint256[] memory);
}
