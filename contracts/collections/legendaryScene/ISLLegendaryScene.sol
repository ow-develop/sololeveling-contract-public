// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import {ISLSeason} from "../../season/ISLSeason.sol";

interface ISLLegendaryScene {
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
    function setSeasonContract(ISLSeason _seasonContract) external;

    function setBaseTokenURI(string calldata _baseTokenURI) external;

    /*
     *  View
     */
    function existsBatch(uint256[] calldata ids) external view returns (bool);

    function getSeasonContract() external view returns (address);

    function getMintedSupply(uint256 _tokenId) external view returns (uint256);

    function getBurnedSupply(uint256 _tokenId) external view returns (uint256);

    /*
     *  Approval Controller
     */
    function getApprovalControllerContract() external view returns (address);

    function setProjectApprovalMode(bool _approved) external;

    function getProjectApprovalMode() external view returns (bool);
}
