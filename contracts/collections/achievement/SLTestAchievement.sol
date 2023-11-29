// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import {ERC1155Upgradeable} from "../../standard/ERC/ERC1155/ERC1155Upgradeable.sol";
import {ERC1155SupplyUpgradeable} from "../../standard/ERC/ERC1155/ERC1155SupplyUpgradeable.sol";
import {ERC1155BurnableUpgradeable} from "../../standard/ERC/ERC1155/ERC1155BurnableUpgradeable.sol";
import {UUPSUpgradeable} from "../../utils/UUPSUpgradeable.sol";
import {Unsafe} from "../../utils/Unsafe.sol";
import {StringsUpgradeable} from "../../utils/StringsUpgradeable.sol";
import {CountersUpgradeable} from "../../utils/CountersUpgradeable.sol";
import {SafeCastUpgradeable} from "../../utils/SafeCastUpgradeable.sol";
import {ECDSAUpgradeable} from "../../utils/ECDSAUpgradeable.sol";
import {IERC1155} from "../../standard/ERC/ERC1155/IERC1155.sol";
import {IERC721} from "../../standard/ERC/ERC721/IERC721.sol";

import {ISLAchievement} from "./ISLAchievement.sol";
import {AchievementBase} from "./AchievementBase.sol";
import {SLControllerUpgradeable} from "../../core/SLControllerUpgradeable.sol";
import {ISLProject} from "../../project/ISLProject.sol";

contract SLTestAchievement is
    ISLAchievement,
    AchievementBase,
    ERC1155Upgradeable,
    ERC1155SupplyUpgradeable,
    ERC1155BurnableUpgradeable,
    UUPSUpgradeable
{
    using Unsafe for uint256;
    using CountersUpgradeable for CountersUpgradeable.Counter;
    using StringsUpgradeable for uint256;
    using SafeCastUpgradeable for uint256;
    using ECDSAUpgradeable for bytes32;

    function initialize(
        ISLProject _projectContract,
        string memory _baseTokenURI
    ) public initializer {
        __SLCotroller_init(_projectContract);
        __ERC1155_init(_baseTokenURI);
    }

    function _authorizeUpgrade(address) internal override onlyOperator {}

    /*
     *  Achievement
     */
    function addAchievement(
        CollectionSet calldata _collectionSet
    ) external onlyOperator {
        achievementIds.increment();
        uint64 achievementId = achievementIds.current().toUint64();

        AchievementType achievementType;
        if (_collectionSet.collections.length > 0) {
            achievementType = AchievementType.Collection;

            if (!_isValidCollection(_collectionSet.collections))
                revert InvalidCollection();

            collectionAchievements[achievementId] = _collectionSet;
        } else {
            achievementType = AchievementType.General;
        }

        achievements[achievementId] = Achievement({
            id: achievementId,
            mintEnabled: false,
            achievementType: achievementType
        });

        emitCreate("Achievement", achievementId);
    }

    function setAchievementMintEnabled(
        uint256 _achievementId,
        bool _mintEnabled
    ) external onlyOperator {
        if (!isExistAchievementById(_achievementId))
            revert InvalidAchievementId();

        achievements[_achievementId].mintEnabled = _mintEnabled;
    }

    function setCollectionAchievement(
        uint256 _achievementId,
        CollectionSet calldata _collectionSet
    ) external onlyOperator {
        if (!isExistAchievementById(_achievementId))
            revert InvalidAchievementId();

        Achievement memory achievement = achievements[_achievementId];

        if (achievement.achievementType != AchievementType.Collection)
            revert InvalidAchievementId();

        if (achievement.mintEnabled == true) revert InvalidAchievementId();

        if (!_isValidCollection(_collectionSet.collections))
            revert InvalidCollection();

        collectionAchievements[_achievementId] = _collectionSet;
    }

    function _isValidCollection(
        Collection[] calldata _collections
    ) private view returns (bool) {
        for (uint256 i = 0; i < _collections.length; i = i.increment()) {
            if (_collections[i].tokenIds.length == 0) return false;

            uint256 collectionId = _collections[i].collectionId;
            if (!projectContract.isActiveCollection(collectionId)) return false;

            TokenType collectionType = projectContract
                .getCollectionTypeByCollectionId(collectionId);

            if (collectionType == TokenType.ERC721) {
                if (_collections[i].amounts.length > 0) return false;
            } else {
                if (
                    _collections[i].tokenIds.length !=
                    _collections[i].amounts.length
                ) return false;
            }
        }

        return true;
    }

    /*
     *  Achievement View
     */
    function isExistAchievementById(
        uint256 _achievementId
    ) public view returns (bool) {
        return
            _achievementId != 0 && _achievementId <= achievementIds.current();
    }

    function getAchievementMintEnabled(
        uint256 _achievementId
    ) public view returns (bool) {
        if (!isExistAchievementById(_achievementId))
            revert InvalidAchievementId();

        return achievements[_achievementId].mintEnabled;
    }

    function getAchievementById(
        uint256 _achievementId
    ) external view returns (Achievement memory) {
        if (!isExistAchievementById(_achievementId))
            revert InvalidAchievementId();

        return achievements[_achievementId];
    }

    function getCollectionAchievementById(
        uint256 _achievementId
    )
        external
        view
        returns (
            Achievement memory achievement,
            CollectionSet memory collectionSet
        )
    {
        if (!isExistAchievementById(_achievementId))
            revert InvalidAchievementId();

        achievement = achievements[_achievementId];
        collectionSet = collectionAchievements[_achievementId];
    }

    function isMintedAchievement(
        uint256 _achievementId,
        address _hunter
    ) public view returns (bool) {
        if (!isExistAchievementById(_achievementId))
            revert InvalidAchievementId();

        return balanceOf(_hunter, _achievementId) > 0;
    }

    /*
     *  Override
     */
    function supportsInterface(
        bytes4 _interfaceId
    ) public view override returns (bool) {
        return
            ERC1155Upgradeable.supportsInterface(_interfaceId) ||
            _interfaceId == type(ISLAchievement).interfaceId;
    }

    function exists(uint256 id) public view override returns (bool) {
        return isExistAchievementById(id);
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

        for (uint i = 0; i < _amount; i++) {
            mintedSupplyOfToken[_tokenId].increment();
        }

        _mint(_to, _tokenId, _amount, "");
    }

    function claimAchievement(
        uint256 _achievementId,
        bytes calldata _achievementSignature
    ) external {
        if (!isExistAchievementById(_achievementId))
            revert InvalidAchievementId();

        if (!getAchievementMintEnabled(_achievementId))
            revert DoesNotMintEnabled();

        address hunter = _msgSender();

        if (isMintedAchievement(_achievementId, hunter)) revert AlreadyMinted();

        AchievementType achievementType = achievements[_achievementId]
            .achievementType;

        if (achievementType == AchievementType.Collection) {
            CollectionSet memory collectionSet = collectionAchievements[
                _achievementId
            ];

            _checkHunterCollectionBalance(hunter, collectionSet.collections);
        } else {
            if (
                !_verifyAchievementSignature(
                    _achievementSignature,
                    _achievementId,
                    hunter
                )
            ) revert GeneralAchievementVerifyFailed();
        }

        mintedSupplyOfToken[_achievementId].increment();
        _mint(hunter, _achievementId, 1, "");
        emit AchievementClaimed(_achievementId, hunter, block.timestamp);
    }

    function _checkHunterCollectionBalance(
        address _hunter,
        Collection[] memory _collections
    ) private view {
        for (uint256 i = 0; i < _collections.length; i = i.increment()) {
            uint256 collectionId = _collections[i].collectionId;
            uint256[] memory tokenIds = _collections[i].tokenIds;

            TokenType collectionType = projectContract
                .getCollectionTypeByCollectionId(collectionId);

            if (collectionType == TokenType.ERC721) {
                IERC721 collection = IERC721(
                    projectContract.getTokenContractByCollectionId(collectionId)
                );

                for (uint256 j = 0; j < tokenIds.length; j = j.increment()) {
                    if (_hunter != collection.ownerOf(tokenIds[j]))
                        revert NotEnoughTokenBalance();
                }
            } else {
                uint256[] memory amounts = _collections[i].amounts;

                IERC1155 collection = IERC1155(
                    projectContract.getTokenContractByCollectionId(collectionId)
                );

                uint256[] memory balances = collection.balanceOfBatch(
                    _asAddressArray(_hunter, tokenIds.length),
                    tokenIds
                );

                for (uint256 j = 0; j < tokenIds.length; j = j.increment()) {
                    if (balances[j] < amounts[j]) {
                        revert NotEnoughTokenBalance();
                    }
                }
            }
        }
    }

    function _asAddressArray(
        address _element,
        uint256 _length
    ) private pure returns (address[] memory) {
        address[] memory array = new address[](_length);

        for (uint256 i = 0; i < _length; i = i.increment()) {
            array[i] = _element;
        }

        return array;
    }

    function _verifyAchievementSignature(
        bytes calldata _signature,
        uint256 _achievementId,
        address _hunter
    ) internal view returns (bool) {
        bytes32 data = keccak256(abi.encodePacked(_achievementId, _hunter));

        bytes32 signedHash = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", data)
        );
        address signer = signedHash.recover(_signature);

        return projectContract.isOperator(signer);
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
        return mintedSupplyOfToken[_tokenId].current();
    }

    function getBurnedSupply(uint256 _tokenId) external view returns (uint256) {
        return getMintedSupply(_tokenId) - totalSupply(_tokenId);
    }
}
