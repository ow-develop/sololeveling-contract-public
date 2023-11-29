// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import {Unsafe} from "../../utils/Unsafe.sol";
import {EnumerableSetUpgradeable} from "../../utils/EnumerableSetUpgradeable.sol";

import {ISLDungeonGate} from "../ISLDungeonGate.sol";
import {DungeonGateBase} from "../DungeonGateBase.sol";
import {ISLMT} from "../../collections/ISLMT.sol";

abstract contract Slot is ISLDungeonGate, DungeonGateBase {
    using Unsafe for uint256;
    using EnumerableSetUpgradeable for EnumerableSetUpgradeable.UintSet;

    /*
     *  Slot
     */
    // E - S
    function setSlotPerHunterRank(
        uint256[6] calldata _slots
    ) external onlyOperator {
        for (uint256 i = 0; i < _slots.length; i = i.increment()) {
            if (_slots[i] < 1) revert InvalidSlot();

            slotPerHunterRank[RankType(i)] = _slots[i];
        }
    }

    /*
     *  View
     */
    function getHunterUsingSlot(address _hunter) public view returns (uint256) {
        return gateOfHunterSlot[_hunter].length();
    }

    function getHunterSlot(
        uint256 _seasonId,
        address _hunter
    ) public view returns (uint256 availableSlot, uint256 usingSlot) {
        usingSlot = getHunterUsingSlot(_hunter);

        RankType hunterRank = seasonContract.getHunterRank(_seasonId, _hunter);
        availableSlot = slotPerHunterRank[hunterRank];
    }

    function getSlotPerHunterRank() external view returns (uint256[6] memory) {
        uint256[6] memory slots;

        for (uint256 i = 0; i < 6; i = i.increment()) {
            slots[i] = slotPerHunterRank[RankType(i)];
        }

        return slots;
    }
}
