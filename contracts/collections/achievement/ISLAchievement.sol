// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import {AchievementBase} from "./AchievementBase.sol";

interface ISLAchievement {
    /*
     *  Achievement
     */
    function addAchievement(
        AchievementBase.CollectionSet calldata _collectionSet
    ) external;

    function setAchievementMintEnabled(
        uint256 _achievementId,
        bool _mintEnabled
    ) external;

    function setCollectionAchievement(
        uint256 _achievementId,
        AchievementBase.CollectionSet calldata _collectionSet
    ) external;

    /*
     *  Achievement View
     */
    function isExistAchievementById(
        uint256 _achievementId
    ) external view returns (bool);

    function getAchievementMintEnabled(
        uint256 _achievementId
    ) external view returns (bool);

    function getAchievementById(
        uint256 _achievementId
    ) external view returns (AchievementBase.Achievement memory);

    function getCollectionAchievementById(
        uint256 _achievementId
    )
        external
        view
        returns (
            AchievementBase.Achievement memory,
            AchievementBase.CollectionSet memory
        );

    function isMintedAchievement(
        uint256 _achievementId,
        address _hunter
    ) external view returns (bool);

    /*
     *  Mint
     */
    function claimAchievement(
        uint256 _achievementId,
        bytes calldata _achievementSignature
    ) external;

    /*
     *  Base
     */
    function setBaseTokenURI(string calldata _baseTokenURI) external;

    function existsBatch(uint256[] calldata ids) external view returns (bool);

    function getMintedSupply(uint256 _tokenId) external view returns (uint256);

    function getBurnedSupply(uint256 _tokenId) external view returns (uint256);
}
