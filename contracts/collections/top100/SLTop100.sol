// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import {ERC721EnumerableUpgradeable} from "../../standard/ERC/ERC721/ERC721EnumerableUpgradeable.sol";
import {ERC721BurnableUpgradeable} from "../../standard/ERC/ERC721/ERC721BurnableUpgradeable.sol";
import {ERC721Upgradeable} from "../../standard/ERC/ERC721/ERC721Upgradeable.sol";
import {IERC721Upgradeable} from "../../standard/ERC/ERC721/IERC721Upgradeable.sol";

import {UUPSUpgradeable} from "../../utils/UUPSUpgradeable.sol";
import {Unsafe} from "../../utils/Unsafe.sol";
import {CountersUpgradeable} from "../../utils/CountersUpgradeable.sol";

import {ISLTop100} from "./ISLTop100.sol";
import {Top100Base} from "./Top100Base.sol";
import {ISLProject} from "../../project/ISLProject.sol";

contract SLTop100 is
    ISLTop100,
    Top100Base,
    ERC721EnumerableUpgradeable,
    ERC721BurnableUpgradeable,
    UUPSUpgradeable
{
    using Unsafe for uint256;
    using CountersUpgradeable for CountersUpgradeable.Counter;

    function initialize(
        ISLProject _projectContract,
        string memory _baseTokenURI
    ) public initializer {
        __SLCotroller_init(_projectContract);
        __ERC721_init("Top100", "TOP100");

        baseTokenURI = _baseTokenURI;
    }

    function _authorizeUpgrade(address) internal override onlyOperator {}

    /*
     *  Override
     */
    function supportsInterface(
        bytes4 interfaceId
    )
        public
        view
        override(ERC721Upgradeable, ERC721EnumerableUpgradeable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId
    ) internal override(ERC721Upgradeable, ERC721EnumerableUpgradeable) {
        super._beforeTokenTransfer(from, to, tokenId);
    }

    function _baseURI() internal view override returns (string memory) {
        return baseTokenURI;
    }

    function approve(address, uint256) public pure override(ERC721Upgradeable) {
        revert FunctionNotSupported();
    }

    function setApprovalForAll(
        address,
        bool
    ) public pure override(ERC721Upgradeable) {
        revert FunctionNotSupported();
    }

    function transferFrom(
        address,
        address,
        uint256
    ) public pure override(ERC721Upgradeable) {
        revert FunctionNotSupported();
    }

    function safeTransferFrom(
        address,
        address,
        uint256
    ) public pure override(ERC721Upgradeable) {
        revert FunctionNotSupported();
    }

    function safeTransferFrom(
        address,
        address,
        uint256,
        bytes memory
    ) public pure override(ERC721Upgradeable) {
        revert FunctionNotSupported();
    }

    /*
     *  Mint
     */
    function mintTop100(address[] calldata _accounts) external onlyOperator {
        if (_accounts.length != 100) revert InvalidArgument();
        if (minted) revert AlreadyMinted();

        minted = true;

        for (uint256 i = 0; i < _accounts.length; i = i.increment()) {
            address account = _accounts[i];
            if (balanceOf(account) > 0) revert DuplicateAccount();

            tokenIds.increment();
            uint256 newItemId = tokenIds.current();

            _mint(account, newItemId);
        }

        emit Top100Minted(_accounts, block.timestamp);
    }

    /*
     *  Base
     */
    function setBaseTokenURI(
        string calldata _baseTokenURI
    ) external onlyOperator {
        baseTokenURI = _baseTokenURI;
        emit SetBaseTokenURI(_baseTokenURI, block.timestamp);
    }

    function getMintedSupply() public view returns (uint256) {
        return tokenIds.current();
    }

    function getBurnedSupply() external view returns (uint256) {
        return getMintedSupply() - totalSupply();
    }

    function getBaseTokenURI() external view returns (string memory) {
        return baseTokenURI;
    }

    function ownerOfBatch(
        uint256[] calldata _tokenIds
    ) external view returns (address[] memory) {
        address[] memory owners = new address[](_tokenIds.length);
        for (uint256 i = 0; i < _tokenIds.length; i = i.increment()) {
            owners[i] = ownerOf(_tokenIds[i]);
        }

        return owners;
    }
}
