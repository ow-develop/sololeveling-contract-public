// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import {IERC165} from "../../standard/ERC/ERC165/IERC165.sol";
import {IERC1155Receiver} from "../../standard/ERC/ERC1155/IERC1155Receiver.sol";
import {IERC721Receiver} from "../../standard/ERC/ERC721/IERC721Receiver.sol";
import {Context} from "../../utils/Context.sol";

import {IDAOFundWallet} from "./IDAOFundWallet.sol";

contract DAOFundWallet is
    IDAOFundWallet,
    Context,
    IERC721Receiver,
    IERC1155Receiver
{
    receive() external payable {
        emit Deposit(_msgSender(), msg.value, address(this).balance);
    }

    function executeTransaction(
        address _to,
        uint256 _value,
        bytes calldata _data
    ) external {
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
            interfaceId == type(IDAOFundWallet).interfaceId;
    }
}
