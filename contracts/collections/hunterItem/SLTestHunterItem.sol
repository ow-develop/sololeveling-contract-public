// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import {ERC1155Upgradeable} from "../../standard/ERC/ERC1155/ERC1155Upgradeable.sol";
import {ERC1155SupplyUpgradeable} from "../../standard/ERC/ERC1155/ERC1155SupplyUpgradeable.sol";
import {ERC1155BurnableUpgradeable} from "../../standard/ERC/ERC1155/ERC1155BurnableUpgradeable.sol";
import {UUPSUpgradeable} from "../../utils/UUPSUpgradeable.sol";
import {Unsafe} from "../../utils/Unsafe.sol";
import {StringsUpgradeable} from "../../utils/StringsUpgradeable.sol";
import {EnumerableSetUpgradeable} from "../../utils/EnumerableSetUpgradeable.sol";

import {ISLHunterItem} from "./ISLHunterItem.sol";
import {HunterItemBase} from "./HunterItemBase.sol";
import {ISLProject} from "../../project/ISLProject.sol";
import {ISLMT} from "../../collections/ISLMT.sol";

contract SLTestHunterItem is
    ISLHunterItem,
    HunterItemBase,
    ERC1155Upgradeable,
    ERC1155SupplyUpgradeable,
    ERC1155BurnableUpgradeable,
    UUPSUpgradeable
{
    using Unsafe for uint256;
    using StringsUpgradeable for uint256;
    using EnumerableSetUpgradeable for EnumerableSetUpgradeable.AddressSet;

    function initialize(
        ISLProject _projectContract,
        address[] calldata _controllers,
        string memory _baseTokenURI
    ) public initializer {
        __SLCotroller_init(_projectContract);
        __MintController_init(_controllers); // seasonQuestContract
        __ERC1155_init(_baseTokenURI);

        mintEnabled = true;
    }

    function _authorizeUpgrade(address) internal override onlyOperator {}

    /*
     *  Override
     */
    function supportsInterface(
        bytes4 _interfaceId
    ) public view override returns (bool) {
        return
            ERC1155Upgradeable.supportsInterface(_interfaceId) ||
            _interfaceId == type(ISLHunterItem).interfaceId ||
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
    function openToken(uint256 _tokenId) external onlyOperator {
        tokenOpened[_tokenId] = true;

        emit TokenOpened(_tokenId, block.timestamp);
    }

    function closeToken(uint256 _tokenId) external onlyOperator {
        if (getMintedSupply(_tokenId) > 0) {
            revert AlreadyMinted();
        }

        tokenOpened[_tokenId] = false;
        emit TokenClosed(_tokenId, block.timestamp);
    }

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

    function getMintEnabled() external view returns (bool) {
        return mintEnabled;
    }
}
