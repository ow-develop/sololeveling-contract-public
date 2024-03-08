// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.9;

import "forge-std/Test.sol";
import {SLRoleWallet} from "../../contracts/wallet/SLRoleWallet.sol";
import {SLProject} from "../../contracts/project/SLProject.sol";
import {ERC1967Proxy} from "../../contracts/openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {RoleAccessError} from "../../contracts/errors/RoleAccessError.sol";

contract ProjectTest is Test {
    event Create(string target, uint64 targetId, uint256 timestamp);

    ERC1967Proxy public proxy;
    SLRoleWallet public operator;
    SLProject public impl;
    SLProject public project;

    address public operatorMaster = vm.addr(1);
    address public operatorManager = vm.addr(2);
    address public notOperator = vm.addr(3);

    function setUp() external {
        address[] memory masters = new address[](1);
        address[] memory managers = new address[](1);
        masters[0] = operatorMaster;
        managers[0] = operatorManager;

        // deploy operator wallet contract
        operator = new SLRoleWallet(masters, managers);

        // deploy project contract
        bytes memory initData = abi.encodeWithSignature(
            "initialize(address)",
            address(operator)
        );
        impl = new SLProject();
        proxy = new ERC1967Proxy(address(impl), initData);
        project = SLProject(address(proxy));
    }

    function test_initializable() external {
        assertEq(impl.getOperator(), address(0));
        assertEq(project.getOperator(), address(operator));
    }

    function test_addUniverse_success_operatorMaster() external {
        vm.prank(operatorMaster);
        vm.expectEmit(true, true, true, true, address(project));
        emit Create("Universe", 1, block.timestamp);

        project.addUniverse();
    }

    function test_addUniverse_success_operatorManager() external {
        vm.prank(operatorManager);
        vm.expectEmit(true, true, true, true, address(project));
        emit Create("Universe", 1, block.timestamp);

        project.addUniverse();
    }

    function test_addUniverse_failed_notOperator() external {
        vm.prank(notOperator);
        vm.expectRevert(RoleAccessError.OnlyOperator.selector);

        project.addUniverse();
    }
}
