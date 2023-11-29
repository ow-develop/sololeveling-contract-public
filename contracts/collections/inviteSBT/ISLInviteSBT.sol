// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

interface ISLInviteSBT {
    /*
     *  Mint
     */
    function mintSBT(address _inviter) external;

    function mintSBTByOperator(address _inviter, address _invitee) external;

    function mintSBTByOperatorBatch(
        address[] calldata _inviters,
        address[] calldata _invitees
    ) external;

    /*
     *  Base
     */
    function setBaseTokenURI(string calldata _baseTokenURI) external;

    function setMintEnabled(bool _mintEnabled) external;

    /*
     *  View
     */
    function getSBTId(address _inviter) external pure returns (uint256);

    function isInviter(
        address _inviter,
        address _invitee
    ) external view returns (bool);

    function getInviteeLength(address _inviter) external view returns (uint256);

    function getInviteeList(
        address _inviter
    ) external view returns (address[] memory);

    function getInviteeByIndex(
        address _inviter,
        uint256 _index
    ) external view returns (address);

    function existsBatch(uint256[] calldata ids) external view returns (bool);

    function getMintedSupply(uint256 _tokenId) external view returns (uint256);

    function getBurnedSupply(uint256 _tokenId) external view returns (uint256);

    function getMintEnabled() external view returns (bool);
}
