// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import {IERC165} from "../standard/ERC/ERC165/IERC165.sol";
import {IERC1155Receiver} from "../standard/ERC/ERC1155/IERC1155Receiver.sol";
import {IERC721Receiver} from "../standard/ERC/ERC721/IERC721Receiver.sol";
import {Context} from "../utils/Context.sol";
import {EnumerableSet} from "../utils/EnumerableSet.sol";

import {ISLRoleWallet} from "./ISLRoleWallet.sol";

contract SLRoleWallet is
    ISLRoleWallet,
    Context,
    IERC721Receiver,
    IERC1155Receiver
{
    using EnumerableSet for EnumerableSet.AddressSet;

    /*
     *  Storage
     */
    bytes32 public constant MASTER_ROLE = 0x00;
    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");

    mapping(bytes32 => EnumerableSet.AddressSet) internal roles;

    /*
     *  Modifier
     */
    modifier onlyMaster() {
        _onlyMaster();
        _;
    }

    modifier onlyManager() {
        _onlyManager();
        _;
    }

    /*
     *  Constructor
     */
    constructor(
        address[] memory _initialMaster,
        address[] memory _initialManager
    ) {
        if (_initialMaster.length == 0) revert RequiredMaster();

        for (uint256 i = 0; i < _initialMaster.length; i++) {
            _addMaster(_initialMaster[i]);
        }

        for (uint256 i = 0; i < _initialManager.length; i++) {
            _addManager(_initialManager[i]);
        }
    }

    /*
     *  Master Role
     */
    function addMaster(address _master) external onlyMaster {
        _addMaster(_master);
    }

    function renounceMaster() external onlyMaster {
        _removeMaster(_msgSender());
    }

    function _addMaster(address _master) private {
        if (roles[MASTER_ROLE].add(_master)) {
            emit MasterAdded(_master, block.timestamp);
        } else {
            revert AlreadyExistAccount();
        }
    }

    function _removeMaster(address _master) private {
        if (roles[MASTER_ROLE].remove(_master)) {
            emit MasterRemoved(_master, block.timestamp);
        } else {
            revert DoesNotExistAccount();
        }
    }

    /*
     *  Manager Role
     */
    function addManager(address _manager) external onlyMaster {
        _addManager(_manager);
    }

    function removeManager(address _manager) external onlyMaster {
        _removeManager(_manager);
    }

    function renounceManager() external onlyManager {
        _removeManager(_msgSender());
    }

    function _addManager(address _manager) private {
        if (roles[MANAGER_ROLE].add(_manager)) {
            emit ManagerAdded(_manager, block.timestamp);
        } else {
            revert AlreadyExistAccount();
        }
    }

    function _removeManager(address _manager) private {
        if (roles[MANAGER_ROLE].remove(_manager)) {
            emit ManagerRemoved(_manager, block.timestamp);
        } else {
            revert DoesNotExistAccount();
        }
    }

    /*
     * Execution
     */
    receive() external payable {
        emit Deposit(_msgSender(), msg.value, address(this).balance);
    }

    function executeTransaction(
        address _to,
        uint256 _value,
        bytes calldata _data
    ) external onlyMaster {
        (bool success, bytes memory returndata) = _to.call{value: _value}(
            _data
        );

        if (success) {
            emit ExecuteTransaction(_msgSender(), _to, _value, _data);
        } else {
            if (returndata.length > 0) {
                // The easiest way to bubble the revert reason is using memory via assembly
                /// @solidity memory-safe-assembly
                assembly {
                    let returndata_size := mload(returndata)
                    revert(add(32, returndata), returndata_size)
                }
            } else {
                revert TransactionFailed();
            }
        }
    }

    function _onlyMaster() private view {
        if (!isMaster(_msgSender())) {
            revert OnlyMaster();
        }
    }

    function _onlyManager() private view {
        if (!isManager(_msgSender())) {
            revert OnlyManager();
        }
    }

    /*
     * View
     */
    function hasRole(address _account) external view returns (bool) {
        return
            roles[MANAGER_ROLE].contains(_account) ||
            roles[MASTER_ROLE].contains(_account);
    }

    function isMaster(address _master) public view returns (bool) {
        return roles[MASTER_ROLE].contains(_master);
    }

    function getMaster(uint256 _index) external view returns (address) {
        return roles[MASTER_ROLE].at(_index);
    }

    function getMasters() external view returns (address[] memory) {
        return roles[MASTER_ROLE].values();
    }

    function getMasterCount() external view returns (uint256) {
        return roles[MASTER_ROLE].length();
    }

    function isManager(address _manager) public view returns (bool) {
        return roles[MANAGER_ROLE].contains(_manager);
    }

    function getManager(uint256 _index) external view returns (address) {
        return roles[MANAGER_ROLE].at(_index);
    }

    function getManagers() external view returns (address[] memory) {
        return roles[MANAGER_ROLE].values();
    }

    function getManagerCount() external view returns (uint256) {
        return roles[MANAGER_ROLE].length();
    }

    /*
     *  Receiver
     */
    function onERC1155Received(
        address,
        address,
        uint256,
        uint256,
        bytes calldata
    ) external pure returns (bytes4) {
        return this.onERC1155Received.selector;
    }

    function onERC1155BatchReceived(
        address,
        address,
        uint256[] calldata,
        uint256[] calldata,
        bytes calldata
    ) external pure returns (bytes4) {
        return this.onERC1155BatchReceived.selector;
    }

    function onERC721Received(
        address,
        address,
        uint256,
        bytes calldata
    ) external pure returns (bytes4) {
        return this.onERC721Received.selector;
    }

    function supportsInterface(
        bytes4 interfaceId
    ) external pure override returns (bool) {
        return
            interfaceId == type(IERC1155Receiver).interfaceId ||
            interfaceId == type(IERC721Receiver).interfaceId ||
            interfaceId == type(IERC165).interfaceId ||
            interfaceId == type(ISLRoleWallet).interfaceId;
    }
}
