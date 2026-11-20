// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {MockUSDC} from "./mocks/MockUSDC.sol";
import {UsycSleeve} from "../src/UsycSleeve.sol";
import {MockUsyc, MockTeller} from "./mocks/UsycMocks.sol";

contract UsycSleeveTest is Test {
    MockUSDC usdc;
    MockUsyc usyc;
    MockTeller teller;
    UsycSleeve sleeve;
    address vault = makeAddr("vault");
    address stranger = makeAddr("stranger");

    function setUp() public {
        usdc = new MockUSDC();
        usyc = new MockUsyc();
        teller = new MockTeller(usdc, usyc);
        usdc.mint(address(teller), 1_000_000e6);
        sleeve = new UsycSleeve(usdc, usyc, address(teller));
        sleeve.setVault(vault);
        usdc.mint(vault, 1_000e6);
        vm.prank(vault);
        usdc.approve(address(sleeve), type(uint256).max);
    }

    function test_subscribePullsUsdcAndHoldsUsyc() public {
        vm.prank(vault);
        sleeve.subscribe(110e6);
        assertEq(usdc.balanceOf(vault), 890e6);
        assertEq(usyc.balanceOf(address(sleeve)), 100e6);
        assertEq(sleeve.value(), 110e6);
    }

    function test_valueFollowsPrice() public {
        vm.prank(vault);
        sleeve.subscribe(110e6);
        teller.setPrice(1.21e18);
        assertEq(sleeve.value(), 121e6);
    }

    function test_withdrawUsdcSendsAtLeastAmountToVault() public {
        vm.prank(vault);
        sleeve.subscribe(110e6);
        vm.prank(vault);
        uint256 got = sleeve.withdrawUsdc(55e6);
        assertGe(got, 55e6);
        assertEq(usdc.balanceOf(vault), 890e6 + got);
        assertLe(got - 55e6, 2, "rounds up by at most dust");
    }

    function test_withdrawAllWhenAskingMoreThanValue() public {
        vm.prank(vault);
        sleeve.subscribe(110e6);
        vm.prank(vault);
        uint256 got = sleeve.withdrawUsdc(1_000e6);
        assertEq(got, 110e6);
        assertEq(usyc.balanceOf(address(sleeve)), 0);
    }

    function test_onlyVaultMovesMoney() public {
        vm.prank(stranger);
        vm.expectRevert(abi.encodeWithSelector(UsycSleeve.NotVault.selector, stranger));
        sleeve.subscribe(1e6);
        vm.prank(stranger);
        vm.expectRevert(abi.encodeWithSelector(UsycSleeve.NotVault.selector, stranger));
        sleeve.withdrawUsdc(1e6);
    }

    function test_onlyOwnerSetsVault() public {
        vm.prank(stranger);
        vm.expectRevert();
        sleeve.setVault(stranger);
    }
}
