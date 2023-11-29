// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import {CountersUpgradeable} from "../../utils/CountersUpgradeable.sol";
import {EnumerableSetUpgradeable} from "../../utils/EnumerableSetUpgradeable.sol";
import {SafeCastUpgradeable} from "../../utils/SafeCastUpgradeable.sol";

import {Role} from "./Role.sol";

abstract contract Universe is Role {
    using CountersUpgradeable for CountersUpgradeable.Counter;
    using EnumerableSetUpgradeable for EnumerableSetUpgradeable.UintSet;
    using SafeCastUpgradeable for uint256;

    /*
     *  Universe
     */
    function addUniverse() external onlyOperator {
        universeIds.increment();
        uint64 universeId = universeIds.current().toUint64();

        universes[universeId] = Universe({
            id: universeId,
            createdTimestamp: block.timestamp.toUint64(),
            isActive: true
        });

        emitCreate("Universe", universeId);
    }

    function setUniverseActive(
        uint256 _universeId,
        bool _isActive
    ) external onlyOperator {
        if (!isExistUniverseById(_universeId)) {
            revert InvalidUniverseId();
        }

        Universe storage universe = universes[_universeId];

        universe.isActive = _isActive;
    }

    /*
     *  View
     */
    function getUniverseId() external view returns (uint256) {
        return universeIds.current();
    }

    function isExistUniverseById(
        uint256 _universeId
    ) public view returns (bool) {
        return _universeId != 0 && _universeId <= universeIds.current();
    }

    function isActiveUniverse(
        uint256 _universeId
    ) external view returns (bool) {
        return universes[_universeId].isActive;
    }

    function getUniverseById(
        uint256 _universeId
    )
        external
        view
        returns (Universe memory universe, uint256[] memory collectionIds)
    {
        if (!isExistUniverseById(_universeId)) {
            revert InvalidUniverseId();
        }

        universe = universes[_universeId];
        collectionIds = collectionOfUniverse[_universeId].values();
    }
}
