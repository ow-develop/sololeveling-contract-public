// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import {ERC721EnumerableUpgradeable} from "../../standard/ERC/ERC721/ERC721EnumerableUpgradeable.sol";
import {ERC721BurnableUpgradeable} from "../../standard/ERC/ERC721/ERC721BurnableUpgradeable.sol";
import {ERC721Upgradeable} from "../../standard/ERC/ERC721/ERC721Upgradeable.sol";
import {IERC721Upgradeable} from "../../standard/ERC/ERC721/IERC721Upgradeable.sol";

import {UUPSUpgradeable} from "../../utils/UUPSUpgradeable.sol";
import {Unsafe} from "../../utils/Unsafe.sol";
import {CountersUpgradeable} from "../../utils/CountersUpgradeable.sol";
import {EnumerableSetUpgradeable} from "../../utils/EnumerableSetUpgradeable.sol";
import {CheckpointsUpgradeable} from "../../utils/CheckpointsUpgradeable.sol";

import {ISLShadowMonarch} from "./ISLShadowMonarch.sol";
import {ShadowMonarchBase} from "./ShadowMonarchBase.sol";
import {ISLProject} from "../../project/ISLProject.sol";
import {ISLApprovalController} from "../approvalController/ISLApprovalController.sol";
import {ISLCollectable} from "../ISLCollectable.sol";

contract SLTestShadowMonarch is
    ISLShadowMonarch,
    ShadowMonarchBase,
    ERC721EnumerableUpgradeable,
    ERC721BurnableUpgradeable,
    UUPSUpgradeable
{
    using Unsafe for uint256;
    using CountersUpgradeable for CountersUpgradeable.Counter;
    using EnumerableSetUpgradeable for EnumerableSetUpgradeable.UintSet;
    using CheckpointsUpgradeable for CheckpointsUpgradeable.History;

    function initialize(
        ISLProject _projectContract,
        ISLApprovalController _approvalControllerContract,
        address[] calldata _controllers,
        string memory _baseTokenURI
    ) public initializer {
        __SLCotroller_init(_projectContract);
        __MintController_init(_controllers); // offeringContract
        __ERC721_init("ShadowMonarch", "SJW");

        approvalControllerContract = _approvalControllerContract;

        projectApprovalMode = true;
        defaultCollectingScore = 0;
        baseTokenURI = _baseTokenURI;
    }

    function _authorizeUpgrade(address) internal override onlyOperator {}

    /*
     *  Collectable
     */
    function setTokenCollectingScore(
        uint256 _tokenId,
        uint256 _score
    ) external onlyOperator {
        tokenScores[_tokenId] = _score;
    }

    function setDefaultCollectingScore(uint256 _score) external onlyOperator {
        defaultCollectingScore = _score;
    }

    function getTokenCollectingScore(
        uint256 _tokenId
    ) external view returns (uint256) {
        return tokenScores[_tokenId];
    }

    function getDefaultCollectingScore() external view returns (uint256) {
        return defaultCollectingScore;
    }

    function getCollectingScoreAtBlock(
        address _hunter,
        uint256 _blockNumber
    ) public view returns (uint256) {
        return collectingScores[_hunter].getAtBlock(_blockNumber);
    }

    function getLatestCollectingScore(
        address _hunter
    ) public view returns (uint256) {
        return collectingScores[_hunter].latest();
    }

    function getCollectingScoreAtBlockBatch(
        address[] calldata _hunters,
        uint256[] calldata _blockNumbers
    ) external view returns (uint256[] memory) {
        if (_hunters.length != _blockNumbers.length) revert InvalidArgument();

        uint256 hunterCount = _hunters.length;

        uint256[] memory scores = new uint256[](hunterCount);

        for (uint256 i = 0; i < hunterCount; i = i.increment()) {
            scores[i] = getCollectingScoreAtBlock(
                _hunters[i],
                _blockNumbers[i]
            );
        }

        return scores;
    }

    function getLatestCollectingScoreBatch(
        address[] calldata _hunters
    ) external view returns (uint256[] memory) {
        uint256 hunterCount = _hunters.length;

        uint256[] memory scores = new uint256[](hunterCount);

        for (uint256 i = 0; i < hunterCount; i = i.increment()) {
            scores[i] = getLatestCollectingScore(_hunters[i]);
        }

        return scores;
    }

    function _updateCollectingScore(
        address _from,
        address _to,
        uint256 _tokenId
    ) private {
        uint256 transferScore = tokenScores[_tokenId] == 0
            ? defaultCollectingScore
            : tokenScores[_tokenId];

        if (_to != address(0)) {
            uint256 oldScore = collectingScores[_to].latest();
            uint256 newScore = oldScore + transferScore;
            collectingScores[_to].push(newScore);
            emit CollectingScoreChanged(_to, oldScore, newScore);
        }
        if (_from != address(0)) {
            uint256 oldScore = collectingScores[_from].latest();
            uint256 newScore = oldScore - transferScore;
            collectingScores[_from].push(newScore);
            emit CollectingScoreChanged(_from, oldScore, newScore);
        }
    }

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
        return
            ERC721EnumerableUpgradeable.supportsInterface(interfaceId) ||
            interfaceId == type(ISLShadowMonarch).interfaceId ||
            interfaceId == type(ISLCollectable).interfaceId;
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
        address from,
        address to,
        uint256 tokenId
    ) internal override(ERC721Upgradeable, ERC721EnumerableUpgradeable) {
        ERC721EnumerableUpgradeable._beforeTokenTransfer(from, to, tokenId);
    }

    function _afterTokenTransfer(
        address from,
        address to,
        uint256 tokenId
    ) internal override {
        super._afterTokenTransfer(from, to, tokenId);
        _updateCollectingScore(from, to, tokenId);
        _updateTokenOfOwner(from, to, tokenId);
    }

    function _baseURI() internal view override returns (string memory) {
        return baseTokenURI;
    }

    function _updateTokenOfOwner(
        address _from,
        address _to,
        uint256 _tokenId
    ) private {
        if (_to != address(0)) {
            tokenOfOwner[_to].add(_tokenId);
        }
        if (_from != address(0)) {
            tokenOfOwner[_from].remove(_tokenId);
        }
    }

    /*
     *  Mint
     */
    function mintOfTest(address _to, uint256 _amount) external {
        _mints(_to, _amount);
    }

    function mint(address _to, uint256 _amount) external onlyController {
        _mints(_to, _amount);
    }

    function mintBatch(
        address[] calldata _accounts,
        uint256[] calldata _amounts
    ) external onlyController {
        for (uint256 i = 0; i < _accounts.length; i = i.increment()) {
            address to = _accounts[i];
            uint256 amount = _amounts[i];

            _mints(to, amount);
        }
    }

    function _mints(address _to, uint256 _amount) private {
        if (getMintedSupply() + _amount > MAX_SUPPLY) revert ExceedSupply();

        for (uint256 i = 0; i < _amount; i = i.increment()) {
            tokenIds.increment();
            uint256 newItemId = tokenIds.current();

            _mint(_to, newItemId);
        }
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

    function getBaseTokenURI() external view returns (string memory) {
        return baseTokenURI;
    }

    function getMintedSupply() public view returns (uint256) {
        return tokenIds.current();
    }

    function getBurnedSupply() external view returns (uint256) {
        return getMintedSupply() - totalSupply();
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

    function getTokenOfOwner(
        address _owner
    ) external view returns (uint256[] memory) {
        return tokenOfOwner[_owner].values();
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
