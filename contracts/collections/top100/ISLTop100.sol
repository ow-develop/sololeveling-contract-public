// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

interface ISLTop100 {
    /*
     *  Mint
     */
    function mintTop100(address[] calldata _accounts) external;

    /*
     *  Base
     */
    function setBaseTokenURI(string calldata _baseTokenURI) external;

    function getBaseTokenURI() external view returns (string memory);

    function getMintedSupply() external view returns (uint256);

    function getBurnedSupply() external view returns (uint256);

    function ownerOfBatch(
        uint256[] calldata _tokenIds
    ) external view returns (address[] memory);
}
