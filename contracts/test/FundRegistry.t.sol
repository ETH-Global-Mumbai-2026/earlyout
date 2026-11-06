// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Base} from "./Base.t.sol";
import {FundRegistry} from "../src/FundRegistry.sol";

contract FundRegistryTest is Base {
    function test_listsAndReads() public view {
        assertEq(registry.fundCount(), 2);
        assertEq(registry.fundAt(0), address(fundA));
        assertTrue(registry.isListed(address(fundA)));
        assertFalse(registry.isListed(stranger));
        assertEq(registry.getTerms(address(fundA)).settlementDelay, 90 days);
    }

    function test_maxTenFunds() public {
        for (uint256 i = 2; i < 10; i++) {
            registry.listFund(address(uint160(1000 + i)), _terms("X", 1 days, 0, 1 days, 1));
        }
        vm.expectRevert(FundRegistry.TooManyFunds.selector);
        registry.listFund(address(uint160(2000)), _terms("X", 1 days, 0, 1 days, 1));
    }

    function test_relistDoesNotDuplicate() public {
        registry.listFund(address(fundA), _terms("ACRED", 30 days, 1 days, 96 hours, 1));
        assertEq(registry.fundCount(), 2);
        assertEq(registry.getTerms(address(fundA)).settlementDelay, 30 days);
    }

    function test_badTermsRejected() public {
        FundRegistry.Terms memory t = _terms("X", 1 days, 0, 1 days, 1);
        t.recoveryBps = 10_001;
        vm.expectRevert(FundRegistry.BadTerms.selector);
        registry.listFund(stranger, t);
    }

    function test_onlyOwner() public {
        vm.prank(stranger);
        vm.expectRevert();
        registry.setGlobals(1, 1);
    }
}
