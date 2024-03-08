// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import {BaseStorage} from "../../core/BaseStorage.sol";
import {ISLMonsterFactory} from "../../monsterFactory/ISLMonsterFactory.sol";

interface ISLMonster {
    /*
     *  Collectable
     */
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
    function mint(address _to, uint256 _tokenId, uint256 _amount) external;

    function mintBatch(
        address _to,
        uint256[] calldata _tokenIds,
        uint256[] calldata _amounts
    ) external;

    /*
     *  Base
     */
    function setMonsterFactoryContract(
        ISLMonsterFactory _monsterFactoryContract
    ) external;

    function setBaseTokenURI(string calldata _baseTokenURI) external;

    /*
     *  View
     */
    function existsBatch(uint256[] calldata ids) external view returns (bool);

    function getMonsterFactoryContract() external view returns (address);

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
