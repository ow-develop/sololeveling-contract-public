// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import {ERC1155Upgradeable} from "../../standard/ERC/ERC1155/ERC1155Upgradeable.sol";
import {ERC1155SupplyUpgradeable} from "../../standard/ERC/ERC1155/ERC1155SupplyUpgradeable.sol";
import {ERC1155BurnableUpgradeable} from "../../standard/ERC/ERC1155/ERC1155BurnableUpgradeable.sol";
import {UUPSUpgradeable} from "../../utils/UUPSUpgradeable.sol";
import {Unsafe} from "../../utils/Unsafe.sol";
import {StringsUpgradeable} from "../../utils/StringsUpgradeable.sol";
import {EnumerableSetUpgradeable} from "../../utils/EnumerableSetUpgradeable.sol";

import {ISLInviteSBT} from "./ISLInviteSBT.sol";
import {InviteSBTBase} from "./InviteSBTBase.sol";
import {ISLProject} from "../../project/ISLProject.sol";

contract SLInviteSBT is
    ISLInviteSBT,
    InviteSBTBase,
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
        address[] calldata _controllers, // batchOperator
        string memory _baseTokenURI
    ) public initializer {
        __SLCotroller_init(_projectContract);
        __MintController_init(_controllers);
        __ERC1155_init(_baseTokenURI);

        mintEnabled = true;
    }

    function _authorizeUpgrade(address) internal override onlyOperatorMaster {}

    /*
     *  Override
     */
    function supportsInterface(
        bytes4 _interfaceId
    ) public view override returns (bool) {
        return
            ERC1155Upgradeable.supportsInterface(_interfaceId) ||
            _interfaceId == type(ISLInviteSBT).interfaceId;
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
    ) internal override(ERC1155Upgradeable, ERC1155SupplyUpgradeable) {
        super._beforeTokenTransfer(operator, from, to, ids, amounts, data);

        if (to == address(0)) {
            for (uint256 i = 0; i < ids.length; ++i) {
                uint256 id = ids[i];
                invitedAccounts[id].remove(from);
            }
        }
    }

    /*
     *  Mint
     */
    modifier whenMintEnabled() {
        _whenMintEnabled();
        _;
    }

    function mintSBT(address _inviter) external whenMintEnabled {
        uint256 tokenId = getSBTId(_inviter);
        address sender = _msgSender();

        if (balanceOf(sender, tokenId) > 0) {
            revert AlreadyMinted();
        }

        invitedAccounts[tokenId].add(sender);
        mintedSupplyOfToken[tokenId] += 1;

        _mint(sender, tokenId, 1, "");
    }

    function mintSBTByOperator(
        address _inviter,
        address _invitee
    ) public onlyController whenMintEnabled {
        uint256 tokenId = getSBTId(_inviter);

        if (balanceOf(_invitee, tokenId) > 0) {
            revert AlreadyMinted();
        }

        invitedAccounts[tokenId].add(_invitee);
        mintedSupplyOfToken[tokenId] += 1;

        _mint(_invitee, tokenId, 1, "");
    }

    function mintSBTByOperatorBatch(
        address[] calldata _inviters,
        address[] calldata _invitees
    ) external onlyController whenMintEnabled {
        if (_inviters.length != _invitees.length) {
            revert InvalidArgument();
        }

        for (uint256 i = 0; i < _inviters.length; i = i.increment()) {
            mintSBTByOperator(_inviters[i], _invitees[i]);
        }
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
    function getSBTId(address _inviter) public pure returns (uint256) {
        return
            uint256(keccak256(abi.encodePacked(_inviter, name))) %
            type(uint32).max;
    }

    function isInviter(
        address _inviter,
        address _invitee
    ) external view returns (bool) {
        uint256 tokenId = getSBTId(_inviter);

        return invitedAccounts[tokenId].contains(_invitee);
    }

    function getInviteeLength(
        address _inviter
    ) external view returns (uint256) {
        uint256 tokenId = getSBTId(_inviter);

        return invitedAccounts[tokenId].length();
    }

    function getInviteeList(
        address _inviter
    ) external view returns (address[] memory) {
        uint256 tokenId = getSBTId(_inviter);

        return invitedAccounts[tokenId].values();
    }

    function getInviteeByIndex(
        address _inviter,
        uint256 _index
    ) external view returns (address) {
        uint256 tokenId = getSBTId(_inviter);

        return invitedAccounts[tokenId].at(_index);
    }

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

    function getMintEnabled() external view returns (bool) {
        return mintEnabled;
    }
}
