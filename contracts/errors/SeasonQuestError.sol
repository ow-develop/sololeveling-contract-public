// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

interface SeasonQuestError {
    ////////////
    // Season //
    ////////////

    error InvalidSeasonId();
    error EndedSeason();

    ///////////
    // Quest //
    ///////////

    error InvalidArgument();
    error InvalidQuestId();
    error UnActiveQuest();
    error InvalidMonster();
    error InvalidTrait();
    error InvalidHunterItemId();

    /////////////
    // Comfirm //
    /////////////

    error InvalidHunterRank();
    error ExceedCompletableCount();
    error NotCompleteRequiredQuest();
    error NotEnoughMonster();
    error GeneralQuestVerifyFailed();
    error InvalidQuestType();

    /////////
    // Base//
    /////////

    error InvalidCollectionId();
}
