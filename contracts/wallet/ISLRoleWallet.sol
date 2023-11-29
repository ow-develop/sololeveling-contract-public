// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

interface ISLRoleWallet {
    /*
     *  Event
     */
    event Deposit(address indexed sender, uint256 amount, uint256 balance);
    event ExecuteTransaction(
        address indexed from,
        address indexed to,
        uint256 value,
        bytes data
    );
    event MasterAdded(address indexed master, uint256 timestamp);
    event MasterRemoved(address indexed master, uint256 timestamp);
    event ManagerAdded(address indexed manager, uint256 timestamp);
    event ManagerRemoved(address indexed manager, uint256 timestamp);

    /*
     *  Error
     */
    error RequiredMaster();
    error TransactionFailed();
    error OnlyMaster();
    error OnlyManager();
    error AlreadyExistAccount();
    error DoesNotExistAccount();

    function executeTransaction(
        address _to,
        uint256 _value,
        bytes calldata _data
    ) external;

    function hasRole(address _account) external view returns (bool);

    /*
     *  Master
     */
    function addMaster(address _master) external;

    function renounceMaster() external;

    function isMaster(address _master) external view returns (bool);

    function getMaster(uint256 _index) external view returns (address);

    function getMasters() external view returns (address[] memory);

    function getMasterCount() external view returns (uint256);

    /*
     *  Manager
     */

    function addManager(address _manager) external;

    function removeManager(address _manager) external;

    function renounceManager() external;

    function isManager(address _manager) external view returns (bool);

    function getManager(uint256 _index) external view returns (address);

    function getManagers() external view returns (address[] memory);

    function getManagerCount() external view returns (uint256);
}
