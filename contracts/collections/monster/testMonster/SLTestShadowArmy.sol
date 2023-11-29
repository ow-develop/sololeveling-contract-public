// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import {ERC1155Upgradeable} from "../../../standard/ERC/ERC1155/ERC1155Upgradeable.sol";
import {ERC1155SupplyUpgradeable} from "../../../standard/ERC/ERC1155/ERC1155SupplyUpgradeable.sol";
import {ERC1155BurnableUpgradeable} from "../../../standard/ERC/ERC1155/ERC1155BurnableUpgradeable.sol";
import {UUPSUpgradeable} from "../../../utils/UUPSUpgradeable.sol";

import {Unsafe} from "../../../utils/Unsafe.sol";
import {StringsUpgradeable} from "../../../utils/StringsUpgradeable.sol";
import {CheckpointsUpgradeable} from "../../../utils/CheckpointsUpgradeable.sol";

import {ISLMonster} from "../ISLMonster.sol";
import {MonsterBase} from "../MonsterBase.sol";
import {ISLProject} from "../../../project/ISLProject.sol";
import {ISLMonsterFactory} from "../../../monsterFactory/ISLMonsterFactory.sol";
import {ISLApprovalController} from "../../approvalController/ISLApprovalController.sol";
import {ISLCollectable} from "../../ISLCollectable.sol";
import {ISLMT} from "../../../collections/ISLMT.sol";

contract SLTestShadowArmy is
    ISLMonster,
    MonsterBase,
    ERC1155Upgradeable,
    ERC1155SupplyUpgradeable,
    ERC1155BurnableUpgradeable,
    UUPSUpgradeable
{
    using Unsafe for uint256;
    using StringsUpgradeable for uint256;
    using CheckpointsUpgradeable for CheckpointsUpgradeable.History;

    function initialize(
        ISLProject _projectContract,
        ISLMonsterFactory _monsterFactoryContract,
        ISLApprovalController _approvalControllerContract,
        address[] calldata _controllers,
        string memory _baseTokenURI
    ) public initializer {
        __SLCotroller_init(_projectContract);
        __MintController_init(_controllers);
        __ERC1155_init(_baseTokenURI);

        name = "ShadowArmy";
        symbol = "ShadowArmy";

        monsterFactoryContract = _monsterFactoryContract;
        approvalControllerContract = _approvalControllerContract;

        projectApprovalMode = true;
    }

    function _authorizeUpgrade(address) internal override onlyOperator {}

    /*
     *  Collectable
     */
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
        uint256[] memory _ids,
        uint256[] memory _amounts
    ) private {
        uint256 transferScore;
        RankType[] memory monsterRanks = monsterFactoryContract
            .getMonsterRankTypeBatch(true, _ids);
        uint256[] memory scores = monsterFactoryContract.getMonsterScores(true);

        for (uint256 i = 0; i < _ids.length; i = i.increment()) {
            uint256 scoreIndex = uint256(monsterRanks[i]) - 3;

            transferScore += scores[scoreIndex] * _amounts[i];
        }
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
        bytes4 _interfaceId
    ) public view override returns (bool) {
        return
            ERC1155Upgradeable.supportsInterface(_interfaceId) ||
            _interfaceId == type(ISLMonster).interfaceId ||
            _interfaceId == type(ISLCollectable).interfaceId ||
            _interfaceId == type(ISLMT).interfaceId;
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

    function _afterTokenTransfer(
        address operator,
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory amounts,
        bytes memory data
    ) internal override {
        super._afterTokenTransfer(operator, from, to, ids, amounts, data);
        _updateCollectingScore(from, to, ids, amounts);
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

        mintedSupplies[_tokenId] += _amount;

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

            mintedSupplies[_tokenIds[i]] += _amounts[i];
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

        mintedSupplies[_tokenId] += _amount;

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

            mintedSupplies[_tokenIds[i]] += _amounts[i];
        }

        _mintBatch(_to, _tokenIds, _amounts, "");
    }

    /*
     *  Base
     */
    function setMonsterFactoryContract(
        ISLMonsterFactory _monsterFactoryContract
    ) external onlyOperator {
        monsterFactoryContract = _monsterFactoryContract;
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
    function exists(uint256 _tokenId) public view override returns (bool) {
        return monsterFactoryContract.isExistMonsterById(true, _tokenId);
    }

    function existsBatch(uint256[] calldata ids) external view returns (bool) {
        for (uint256 i = 0; i < ids.length; i = i.increment()) {
            if (!exists(ids[i])) return false;
        }

        return true;
    }

    function getMonsterFactoryContract() external view returns (address) {
        return address(monsterFactoryContract);
    }

    function getMintedSupply(uint256 _tokenId) public view returns (uint256) {
        return mintedSupplies[_tokenId];
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
        uint256 tokenLength = monsterFactoryContract.getMonsterLength(true);

        mintedSupplies = new uint256[](tokenLength);
        burnedSupplies = new uint256[](tokenLength);

        for (uint256 i = 0; i < tokenLength; i = i.increment()) {
            mintedSupplies[i] = getMintedSupply(i + 1);
            burnedSupplies[i] = getBurnedSupply(i + 1);
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
