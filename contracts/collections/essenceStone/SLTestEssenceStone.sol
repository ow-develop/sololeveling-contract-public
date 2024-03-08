// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import {ERC1155Upgradeable} from "../../standard/ERC/ERC1155/ERC1155Upgradeable.sol";
import {ERC1155SupplyUpgradeable} from "../../standard/ERC/ERC1155/ERC1155SupplyUpgradeable.sol";
import {ERC1155BurnableUpgradeable} from "../../standard/ERC/ERC1155/ERC1155BurnableUpgradeable.sol";
import {UUPSUpgradeable} from "../../utils/UUPSUpgradeable.sol";
import {Unsafe} from "../../utils/Unsafe.sol";
import {StringsUpgradeable} from "../../utils/StringsUpgradeable.sol";
import {EnumerableSetUpgradeable} from "../../utils/EnumerableSetUpgradeable.sol";

import {ISLEssenceStone} from "./ISLEssenceStone.sol";
import {EssenceStoneBase} from "./EssenceStoneBase.sol";
import {ISLProject} from "../../project/ISLProject.sol";
import {ISLApprovalController} from "../approvalController/ISLApprovalController.sol";
import {ISLMT} from "../../collections/ISLMT.sol";

contract SLTestEssenceStone is
    ISLEssenceStone,
    EssenceStoneBase,
    ERC1155Upgradeable,
    ERC1155SupplyUpgradeable,
    ERC1155BurnableUpgradeable,
    UUPSUpgradeable
{
    using Unsafe for uint256;
    using StringsUpgradeable for uint256;
    using EnumerableSetUpgradeable for EnumerableSetUpgradeable.UintSet;

    function initialize(
        ISLProject _projectContract,
        ISLApprovalController _approvalControllerContract,
        address[] calldata _controllers,
        string memory _baseTokenURI
    ) public initializer {
        __SLCotroller_init(_projectContract);
        __MintController_init(_controllers); // dungeonGateContract, systemContract, shopContract
        __ERC1155_init(_baseTokenURI);
        __essenceStone_init();

        approvalControllerContract = _approvalControllerContract;

        projectApprovalMode = true;
    }

    function _authorizeUpgrade(address) internal override onlyOperator {}

    function __essenceStone_init() private {
        tokenOpened[ESSENCE_STONE_TOKEN_ID] = true;
        openTokens.add(ESSENCE_STONE_TOKEN_ID);

        emit TokenOpened(ESSENCE_STONE_TOKEN_ID, block.timestamp);
    }

    /*
     *  Override
     */
    function supportsInterface(
        bytes4 _interfaceId
    ) public view override returns (bool) {
        return
            ERC1155Upgradeable.supportsInterface(_interfaceId) ||
            _interfaceId == type(ISLEssenceStone).interfaceId ||
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
    ) internal override(ERC1155Upgradeable, ERC1155SupplyUpgradeable) {
        super._beforeTokenTransfer(operator, from, to, ids, amounts, data);
    }

    /*
     *  Mint
     */
    function mintOfTest(
        address _to,
        uint256 _tokenId,
        uint256 _amount
    ) external {
        if (!exists(_tokenId)) {
            revert DoesNotExistTokenId();
        }

        mintedSupplyOfToken[_tokenId] += _amount;

        _mint(_to, _tokenId, _amount, "");
    }

    function mintOfTestBatch(
        address _to,
        uint256[] calldata _tokenIds,
        uint256[] calldata _amounts
    ) external {
        for (uint256 i = 0; i < _tokenIds.length; i = i.increment()) {
            if (!exists(_tokenIds[i])) {
                revert DoesNotExistTokenId();
            }

            mintedSupplyOfToken[_tokenIds[i]] += _amounts[i];
        }

        _mintBatch(_to, _tokenIds, _amounts, "");
    }

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

    function mintOfAirdrop(
        address[] calldata _accounts,
        uint256[] calldata _tokenIds,
        uint256[] calldata _amounts
    ) external onlyOperator {
        for (uint256 i = 0; i < _tokenIds.length; i = i.increment()) {
            if (!exists(_tokenIds[i])) {
                revert DoesNotExistTokenId();
            }

            mintedSupplyOfToken[_tokenIds[i]] += _amounts[i];

            _mint(_accounts[i], _tokenIds[i], _amounts[i], "");
        }
    }

    /*
     *  Base
     */
    function openToken(uint256 _tokenId) external onlyOperator {
        tokenOpened[_tokenId] = true;
        openTokens.add(_tokenId);

        emit TokenOpened(_tokenId, block.timestamp);
    }

    function closeToken(uint256 _tokenId) external onlyOperator {
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

    function getBurnedSupply(uint256 _tokenId) public view returns (uint256) {
        return getMintedSupply(_tokenId) - totalSupply(_tokenId);
    }

    function getOpenTokenLength() external view returns (uint256) {
        return openTokens.length();
    }

    function getOpenTokens() public view returns (uint256[] memory) {
        return openTokens.values();
    }

    function getCollectionSupply()
        external
        view
        returns (
            uint256[] memory mintedSupplies,
            uint256[] memory burnedSupplies
        )
    {
        uint256[] memory tokens = getOpenTokens();
        uint256 tokenLength = tokens.length;

        mintedSupplies = new uint256[](tokenLength);
        burnedSupplies = new uint256[](tokenLength);

        for (uint256 i = 0; i < tokenLength; i = i.increment()) {
            mintedSupplies[i] = getMintedSupply(tokens[i]);
            burnedSupplies[i] = getBurnedSupply(tokens[i]);
        }
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
