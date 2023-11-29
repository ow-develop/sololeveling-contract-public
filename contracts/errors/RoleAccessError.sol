// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

interface RoleAccessError {
    error OnlyOperatorMaster();
    error OnlyOperator();
}
