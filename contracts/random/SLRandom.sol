// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import {UUPSUpgradeable} from "../utils/UUPSUpgradeable.sol";
import {CountersUpgradeable} from "../utils/CountersUpgradeable.sol";
import {ECDSAUpgradeable} from "../utils/ECDSAUpgradeable.sol";

import {ISLRandom} from "./ISLRandom.sol";
import {RandomBase} from "./RandomBase.sol";
import {ISLProject} from "../project/ISLProject.sol";

contract SLRandom is ISLRandom, RandomBase, UUPSUpgradeable {
    using CountersUpgradeable for CountersUpgradeable.Counter;
    using ECDSAUpgradeable for bytes32;

    function initialize(
        ISLProject _projectContract,
        address _signer
    ) public initializer {
        __SLCotroller_init(_projectContract);

        signer = _signer;
    }

    function _authorizeUpgrade(address) internal override onlyOperatorMaster {}

    /*
     *  Signer
     */
    function setRandomSigner(address _signer) external onlyOperator {
        signer = _signer;
    }

    function getRandomSigner() public view returns (address) {
        return signer;
    }

    /*
     *  Verify
     */
    function verifyRandomSignature(
        address _hunter,
        bytes calldata _signature
    ) external {
        bytes32 data = keccak256(abi.encodePacked(_hunter, _useNonce(_hunter)));

        bytes32 signedHash = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", data)
        );
        address signer = signedHash.recover(_signature);

        if (signer != getRandomSigner()) revert RandomSignatureVerifyFailed();
    }

    function getNonce(address _hunter) external view returns (uint256) {
        return nonces[_hunter].current();
    }

    function _useNonce(address _hunter) private returns (uint256) {
        CountersUpgradeable.Counter storage nonce = nonces[_hunter];

        uint256 current = nonce.current();
        nonce.increment();

        return current;
    }
}
