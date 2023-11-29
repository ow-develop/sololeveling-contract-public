// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

interface SJWOfferingError {
    //////////////
    // Offering //
    //////////////

    error ExceedSupply();
    error InvalidTimestamp();
    error InvalidSupply();
    error InvalidOfferingId();
    error AlreadyStartOffering();
    error NotExistDistributableBalance();

    ///////////////
    // Ownership //
    ///////////////

    error OnlyOwnershipAccount();
    error NotExistMintableSupply();
    error AlreadyMinted();
    error InvalidOwnershipId();
    error AlreadyOwnershipAccount();

    //////////
    // Mint //
    //////////

    error InvalidArgument();
    error InvalidAddress();
    error InvalidPrice();
    error ExceedMaxAmountPerMint();
    error ExceedAccountMaxSupply();
    error WhitelistSignatureVerifyFailed();
    error DoesNotExistTokenId();

    //////////
    // Base //
    //////////

    error InvalidCollectionId();
}
