// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import {ERC1155} from "../../standard/ERC/ERC1155/ERC1155.sol";
import {ERC1155Supply} from "../../standard/ERC/ERC1155/ERC1155Supply.sol";
import {ERC1155Burnable} from "../../standard/ERC/ERC1155/ERC1155Burnable.sol";

import {Unsafe} from "../../utils/Unsafe.sol";
import {Strings} from "../../utils/Strings.sol";
import {EnumerableSet} from "../../utils/EnumerableSet.sol";

import {ISLSeasonPack} from "./ISLSeasonPack.sol";
import {SeasonPackBase} from "./SeasonPackBase.sol";
import {SLController} from "../../core/SLController.sol";
import {MintController} from "../core/MintController.sol";
import {ISLProject} from "../../project/ISLProject.sol";
import {ISLApprovalController} from "../approvalController/ISLApprovalController.sol";
import {ISLMT} from "../../collections/ISLMT.sol";

contract SLSeasonPack is
    ISLSeasonPack,
    SeasonPackBase,
    ERC1155,
    ERC1155Supply,
    ERC1155Burnable
{
    using Unsafe for uint256;
    using Strings for uint256;
    using EnumerableSet for EnumerableSet.UintSet;

    constructor(
        ISLProject _projectContract,
        ISLApprovalController _approvalControllerContract,
        address[] memory _controllers, // dungeonGateContract
        string memory _baseTokenURI
    )
        ERC1155(_baseTokenURI)
        SLController(_projectContract)
        MintController(_controllers) // dungeonGateContract
    {
        approvalControllerContract = _approvalControllerContract;

        projectApprovalMode = true;
    }

    /*
     *  Override
     */
    function supportsInterface(
        bytes4 _interfaceId
    ) public view override returns (bool) {
        return
            ERC1155.supportsInterface(_interfaceId) ||
            _interfaceId == type(ISLSeasonPack).interfaceId ||
            _interfaceId == type(ISLMT).interfaceId;
    }

    function exists(uint256 id) public view override returns (bool) {
        return tokenOpened[id];
    }

    function uri(
        uint256 _tokenId
    ) public view override returns (string memory) {
        if (!exists(_tokenId)) {
            revert DoesNotExistTokenId();
        }

        return
            string(abi.encodePacked(super.uri(_tokenId), _tokenId.toString()));
    }

    function isApprovedForAll(
        address account,
        address operator
    ) public view override returns (bool) {
        if (
            projectApprovalMode &&
            approvalControllerContract.isProjectApproved(account, operator)
        ) {
            return true;
        }

        return super.isApprovedForAll(account, operator);
    }

    function _beforeTokenTransfer(
        address operator,
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory amounts,
        bytes memory data
    ) internal override(ERC1155, ERC1155Supply) {
        super._beforeTokenTransfer(operator, from, to, ids, amounts, data);
    }

    /*
     *  Mint
     */
    function mint(
        address _to,
        uint256 _tokenId,
        uint256 _amount
    ) external onlyController {
        if (!exists(_tokenId)) {
            revert DoesNotExistTokenId();
        }

        mintedSupplyOfToken[_tokenId] += _amount;

        _mint(_to, _tokenId, _amount, "");
    }

    function mintBatch(
        address _to,
        uint256[] calldata _tokenIds,
        uint256[] calldata _amounts
    ) external onlyController {
        for (uint256 i = 0; i < _tokenIds.length; i = i.increment()) {
            if (!exists(_tokenIds[i])) {
                revert DoesNotExistTokenId();
            }

            mintedSupplyOfToken[_tokenIds[i]] += _amounts[i];
        }

        _mintBatch(_to, _tokenIds, _amounts, "");
    }

    /*
     *  Base
     */
    function openToken(uint256 _tokenId) external onlyOperator {
        if (_tokenId == 0) revert InvalidTokenId();

        tokenOpened[_tokenId] = true;
        openTokens.add(_tokenId);

        emit TokenOpened(_tokenId, block.timestamp);
    }

    function closeToken(uint256 _tokenId) external onlyOperator {
        if (_tokenId == 0) revert InvalidTokenId();
        if (getMintedSupply(_tokenId) > 0) revert AlreadyMinted();

        tokenOpened[_tokenId] = false;
        openTokens.remove(_tokenId);
        emit TokenClosed(_tokenId, block.timestamp);
    }

    function setBaseTokenURI(
        string calldata _baseTokenURI
    ) external onlyOperator {
        _setURI(_baseTokenURI);
        emit SetBaseTokenURI(_baseTokenURI, block.timestamp);
    }

    /*
     *  View
     */
    function existsBatch(uint256[] calldata ids) external view returns (bool) {
        for (uint256 i = 0; i < ids.length; i = i.increment()) {
            if (!exists(ids[i])) return false;
        }

        return true;
    }

    function getMintedSupply(uint256 _tokenId) public view returns (uint256) {
        return mintedSupplyOfToken[_tokenId];
    }

    function getBurnedSupply(uint256 _tokenId) external view returns (uint256) {
        return getMintedSupply(_tokenId) - totalSupply(_tokenId);
    }

    function getOpenTokenLength() external view returns (uint256) {
        return openTokens.length();
    }

    function getOpenTokens() external view returns (uint256[] memory) {
        return openTokens.values();
    }

    /*
     *  Approval Controller
     */
    function getApprovalControllerContract() external view returns (address) {
        return address(approvalControllerContract);
    }

    function setProjectApprovalMode(bool _approved) external onlyOperator {
        projectApprovalMode = _approved;
    }

    function getProjectApprovalMode() external view returns (bool) {
        return projectApprovalMode;
    }
}
