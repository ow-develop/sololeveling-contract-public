// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

interface ISLShadowMonarch {
    /*
     *  Collectable
     */
    function setTokenCollectingScore(uint256 _tokenId, uint256 _score) external;

    function setDefaultCollectingScore(uint256 _score) external;

    function getTokenCollectingScore(
        uint256 _tokenId
    ) external view returns (uint256);

    function getDefaultCollectingScore() external view returns (uint256);

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

    /*
     *  Mint
     */
    function mint(address _to, uint256 _amount) external;

    function mintBatch(
        address[] calldata _accounts,
        uint256[] calldata _amounts
    ) external;

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

    function getTokenOfOwner(
        address _owner
    ) external view returns (uint256[] memory);

    /*
     *  Approval Controller
     */
    function getApprovalControllerContract() external view returns (address);

    function setProjectApprovalMode(bool _approved) external;

    function getProjectApprovalMode() external view returns (bool);
}
