// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

interface ISLRandom {
    /*
     *  Signer
     */
    function setRandomSigner(address _signer) external;

    function getRandomSigner() external view returns (address);

    /*
     *  Verify
     */
    function verifyRandomSignature(
        address _hunter,
        bytes calldata _signature
    ) external;

    function getNonce(address _hunter) external view returns (uint256);
}
