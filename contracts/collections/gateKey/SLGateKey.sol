// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import {ERC1155Upgradeable} from "../../standard/ERC/ERC1155/ERC1155Upgradeable.sol";
import {ERC1155SupplyUpgradeable} from "../../standard/ERC/ERC1155/ERC1155SupplyUpgradeable.sol";
import {ERC1155BurnableUpgradeable} from "../../standard/ERC/ERC1155/ERC1155BurnableUpgradeable.sol";
import {UUPSUpgradeable} from "../../utils/UUPSUpgradeable.sol";
import {Unsafe} from "../../utils/Unsafe.sol";
import {CountersUpgradeable} from "../../utils/CountersUpgradeable.sol";
import {StringsUpgradeable} from "../../utils/StringsUpgradeable.sol";
import {ECDSAUpgradeable} from "../../utils/ECDSAUpgradeable.sol";

import {ISLGateKey} from "./ISLGateKey.sol";
import {GateKeyBase} from "./GateKeyBase.sol";
import {ISLProject} from "../../project/ISLProject.sol";
import {ISLApprovalController} from "../approvalController/ISLApprovalController.sol";
import {ISLMT} from "../../collections/ISLMT.sol";

contract SLGateKey is
    ISLGateKey,
    GateKeyBase,
    ERC1155Upgradeable,
    ERC1155SupplyUpgradeable,
    ERC1155BurnableUpgradeable,
    UUPSUpgradeable
{
    using Unsafe for uint256;
    using CountersUpgradeable for CountersUpgradeable.Counter;
    using StringsUpgradeable for uint256;
    using ECDSAUpgradeable for bytes32;

    function initialize(
        ISLProject _projectContract,
        ISLApprovalController _approvalControllerContract,
        address[] calldata _controllers, // shopContract
        string memory _baseTokenURI
    ) public initializer {
        __SLCotroller_init(_projectContract);
        __MintController_init(_controllers);
        __ERC1155_init(_baseTokenURI);

        approvalControllerContract = _approvalControllerContract;

        projectApprovalMode = true;
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
            _interfaceId == type(ISLGateKey).interfaceId ||
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

    function mintKey(
        address _to,
        RankType _keyRank,
        uint256 _amount
    ) external onlyOperator {
        mintedSupplyOfToken[uint256(_keyRank)] += _amount;

        _mint(_to, uint256(_keyRank), _amount, "");

        emit KeyMinted(_to, _keyRank, _amount, block.timestamp);
    }

    function mintKeyBatch(
        address _to,
        RankType[] calldata _keyRanks,
        uint256[] calldata _amounts
    ) external onlyOperator {
        uint256[] memory tokenIds = new uint256[](_keyRanks.length);

        for (uint256 i = 0; i < _keyRanks.length; i = i.increment()) {
            RankType keyRank = _keyRanks[i];
            uint256 amount = _amounts[i];

            mintedSupplyOfToken[uint256(keyRank)] += amount;
            tokenIds[i] = uint256(keyRank);
        }

        _mintBatch(_to, tokenIds, _amounts, "");

        emit KeyMintedBatch(_to, _keyRanks, _amounts, block.timestamp);
    }

    function mintKeyByWhitelist(
        RankType _keyRank,
        uint256 _amount,
        bytes calldata _whitelistSignature
    ) external {
        address sender = _msgSender();

        if (
            !_verifyWhitelistSignature(
                sender,
                _whitelistSignature,
                _keyRank,
                _amount
            )
        ) revert SignatureVerifyFailed();

        mintedSupplyOfToken[uint256(_keyRank)] += _amount;

        _mint(sender, uint256(_keyRank), _amount, "");

        emit KeyMinted(sender, _keyRank, _amount, block.timestamp);
    }

    function mintKeyByWhitelistBatch(
        RankType[] calldata _keyRanks,
        uint256[] calldata _amounts,
        bytes[] calldata _whitelistSignatures
    ) external {
        address sender = _msgSender();

        uint256[] memory tokenIds = new uint256[](_keyRanks.length);

        if (
            _keyRanks.length != _amounts.length ||
            _amounts.length != _whitelistSignatures.length
        ) revert InvalidArgument();

        for (uint256 i = 0; i < _keyRanks.length; i = i.increment()) {
            RankType keyRank = _keyRanks[i];
            uint256 amount = _amounts[i];

            if (
                !_verifyWhitelistSignature(
                    sender,
                    _whitelistSignatures[i],
                    keyRank,
                    amount
                )
            ) revert SignatureVerifyFailed();

            mintedSupplyOfToken[uint256(keyRank)] += amount;
            tokenIds[i] = uint256(keyRank);
        }

        _mintBatch(sender, tokenIds, _amounts, "");

        emit KeyMintedBatch(sender, _keyRanks, _amounts, block.timestamp);
    }

    function _verifyWhitelistSignature(
        address _account,
        bytes calldata _signature,
        RankType _keyRank,
        uint256 _amount
    ) private returns (bool) {
        bytes32 data = keccak256(
            abi.encodePacked(_account, _useNonce(_account), _keyRank, _amount)
        );

        bytes32 signedHash = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", data)
        );
        address signer = signedHash.recover(_signature);

        return projectContract.isOperator(signer);
    }

    function _useNonce(address _account) private returns (uint256) {
        CountersUpgradeable.Counter storage nonce = whitelistNonces[_account];

        uint256 current = nonce.current();
        nonce.increment();

        return current;
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
    function getWhitelistNonce(
        address _account
    ) external view returns (uint256) {
        return whitelistNonces[_account].current();
    }

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
