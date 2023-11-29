// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

interface ISLHunterRank {
    /*
     *  Mint
     */
    function mint(address _to, uint256 _tokenId, uint256 _amount) external;

    function mintBatch(
        address _to,
        uint256[] calldata _tokenIds,
        uint256[] calldata _amounts
    ) external;

    /*
     *  Base
     */
    function setBaseTokenURI(string calldata _baseTokenURI) external;

    function setMintEnabled(bool _mintEnabled) external;

    /*
     *  View
     */
    function existsBatch(uint256[] calldata ids) external pure returns (bool);

    function getMintedSupply(uint256 _tokenId) external view returns (uint256);

    function getBurnedSupply(uint256 _tokenId) external view returns (uint256);

    function getCollectionSupply()
        external
        view
        returns (
            uint256[] memory mintedSupplies,
            uint256[] memory burnedSupplies
        );

    function getMintEnabled() external view returns (bool);
}
