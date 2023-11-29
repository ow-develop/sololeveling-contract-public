// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

interface IDAOFundWallet {
    /*
     *  Event
     */
    event Deposit(address indexed sender, uint256 amount, uint256 balance);
    event ExecuteTransaction(
        address indexed operator,
        address indexed to,
        uint256 value,
        bytes data
    );

    /*
     *  Error
     */
    error TransactionFailed();
    error OnlyOperator();

    function executeTransaction(
        address _to,
        uint256 _value,
        bytes calldata _data
    ) external;
}
