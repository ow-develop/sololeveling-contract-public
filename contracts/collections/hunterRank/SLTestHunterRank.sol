// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import {ERC1155} from "../../standard/ERC/ERC1155/ERC1155.sol";
import {ERC1155Supply} from "../../standard/ERC/ERC1155/ERC1155Supply.sol";
import {ERC1155Burnable} from "../../standard/ERC/ERC1155/ERC1155Burnable.sol";
import {Unsafe} from "../../utils/Unsafe.sol";
import {Strings} from "../../utils/Strings.sol";

import {ISLHunterRank} from "./ISLHunterRank.sol";
import {HunterRankBase} from "./HunterRankBase.sol";
import {SLController} from "../../core/SLController.sol";
import {MintController} from "../core/MintController.sol";
import {ISLProject} from "../../project/ISLProject.sol";
import {ISLMT} from "../../collections/ISLMT.sol";

contract SLTestHunterRank is
    ISLHunterRank,
    HunterRankBase,
    ERC1155,
    ERC1155Supply,
    ERC1155Burnable
{
    using Unsafe for uint256;
    using Strings for uint256;

    constructor(
        ISLProject _projectContract,
        address[] memory _controllers,
        string memory _baseTokenURI
    )
        ERC1155(_baseTokenURI)
        SLController(_projectContract)
        MintController(_controllers) // seasonContract
    {
        mintEnabled = true;
    }

    /*
     *  Override
     */
    function supportsInterface(
        bytes4 _interfaceId
    ) public view override returns (bool) {
        return
            ERC1155.supportsInterface(_interfaceId) ||
            _interfaceId == type(ISLHunterRank).interfaceId ||
            _interfaceId == type(ISLMT).interfaceId;
    }

    function exists(uint256 id) public pure override returns (bool) {
        return id <= uint256(RankType.S);
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

    function setApprovalForAll(address, bool) public pure override {
        revert FunctionNotSupported();
    }

    function safeTransferFrom(
        address,
        address,
        uint256,
        uint256,
        bytes memory
    ) public pure override {
        revert FunctionNotSupported();
    }

    function safeBatchTransferFrom(
        address,
        address,
        uint256[] memory,
        uint256[] memory,
        bytes memory
    ) public pure override {
        revert FunctionNotSupported();
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
    modifier whenMintEnabled() {
        _whenMintEnabled();
        _;
    }

    function mintOfTest(
        address _to,
        uint256 _tokenId,
        uint256 _amount
    ) external whenMintEnabled {
        if (!exists(_tokenId)) {
            revert DoesNotExistTokenId();
        }

        mintedSupplyOfToken[_tokenId] += _amount;

        _mint(_to, _tokenId, _amount, "");
    }

    function mint(
        address _to,
        uint256 _tokenId,
        uint256 _amount
    ) external onlyController whenMintEnabled {
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
    ) external onlyController whenMintEnabled {
        for (uint256 i = 0; i < _tokenIds.length; i = i.increment()) {
            if (!exists(_tokenIds[i])) {
                revert DoesNotExistTokenId();
            }

            mintedSupplyOfToken[_tokenIds[i]] += _amounts[i];
        }

        _mintBatch(_to, _tokenIds, _amounts, "");
    }

    function _whenMintEnabled() private view {
        if (!mintEnabled) {
            revert DoesNotEnabled();
        }
    }

    /*
     *  Base
     */
    function setBaseTokenURI(
        string calldata _baseTokenURI
    ) external onlyOperator {
        _setURI(_baseTokenURI);
        emit SetBaseTokenURI(_baseTokenURI, block.timestamp);
    }

    function setMintEnabled(bool _mintEnabled) external onlyOperator {
        mintEnabled = _mintEnabled;
    }

    /*
     *  View
     */
    function existsBatch(uint256[] calldata ids) external pure returns (bool) {
        for (uint256 i = 0; i < ids.length; i = i.increment()) {
            if (!exists(ids[i])) return false;
        }

        return true;
    }

    function getMintedSupply(uint256 _tokenId) public view returns (uint256) {
        return mintedSupplyOfToken[_tokenId];
    }

    function getBurnedSupply(uint256 _tokenId) public view returns (uint256) {
        return getMintedSupply(_tokenId) - totalSupply(_tokenId);
    }

    function getCollectionSupply()
        external
        view
        returns (
            uint256[] memory mintedSupplies,
            uint256[] memory burnedSupplies
        )
    {
        uint256 length = uint256(RankType.S) + 1;

        mintedSupplies = new uint256[](length);
        burnedSupplies = new uint256[](length);

        for (uint256 i = 0; i < length; i = i.increment()) {
            mintedSupplies[i] = getMintedSupply(i);
            burnedSupplies[i] = getBurnedSupply(i);
        }
    }

    function getMintEnabled() external view returns (bool) {
        return mintEnabled;
    }
}
