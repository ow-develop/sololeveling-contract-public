// SPDX-License-Identifier: MIT

import {BaseStorage} from "../../core/BaseStorage.sol";

pragma solidity ^0.8.9;

interface ISLGateKey {
    /*
     *  Mint
     */
    function mint(address _to, uint256 _tokenId, uint256 _amount) external;

    function mintBatch(
        address _to,
        uint256[] calldata _tokenIds,
        uint256[] calldata _amounts
    ) external;

    function mintKey(
        address _to,
        BaseStorage.RankType _keyRank,
        uint256 _amount
    ) external;

    function mintKeyBatch(
        address _to,
        BaseStorage.RankType[] calldata _keyRanks,
        uint256[] calldata _amounts
    ) external;

    function mintKeyByWhitelist(
        BaseStorage.RankType _keyRank,
        uint256 _amount,
        bytes calldata _whitelistSignature
    ) external;

    function mintKeyByWhitelistBatch(
        BaseStorage.RankType[] calldata _keyRanks,
        uint256[] calldata _amounts,
        bytes[] calldata _whitelistSignatures
    ) external;

    /*
     *  Base
     */
    function setBaseTokenURI(string calldata _baseTokenURI) external;

    /*
     *  View
     */
    function getWhitelistNonce(
        address _account
    ) external view returns (uint256);

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

    /*
     *  Approval Controller
     */
    function getApprovalControllerContract() external view returns (address);

    function setProjectApprovalMode(bool _approved) external;

    function getProjectApprovalMode() external view returns (bool);
}
