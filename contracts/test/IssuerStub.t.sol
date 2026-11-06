// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Base} from "./Base.t.sol";
import {IssuerStub} from "../src/IssuerStub.sol";

contract IssuerStubTest is Base {
    function test_settleAtRoundsUpToWindow() public {
        uint256 id = depositA(1e18);
        (, uint64 settleAt) = claims.meta(id);
        uint256 raw = block.timestamp + 90 days;
        assertGe(settleAt, raw);
        assertEq(settleAt % 1 days, 0);
        assertLt(settleAt - raw, 1 days);
    }

    function test_settlePaysNav() public {
        uint256 id = depositA(1e18);
        (, uint64 settleAt) = claims.meta(id);
        vm.warp(settleAt);
        pushNav(address(fundA), NAV_A, 8, uint64(block.timestamp), 0); // settlement needs a fresh NAV
        vm.prank(address(wrapper));
        uint256 paid = issuer.settle(address(fundA), settleAt);
        assertEq(paid, valueOf(1e18));
    }

    function test_settleBeforeDueReverts() public {
        uint256 id = depositA(1e18);
        (, uint64 settleAt) = claims.meta(id);
        vm.prank(address(wrapper));
        vm.expectRevert(abi.encodeWithSelector(IssuerStub.NotDue.selector, settleAt));
        issuer.settle(address(fundA), settleAt);
    }

    function test_settleWhileFailedReverts() public {
        uint256 id = depositA(1e18);
        (, uint64 settleAt) = claims.meta(id);
        issuer.setFailed(true);
        vm.warp(settleAt);
        vm.prank(address(wrapper));
        vm.expectRevert(IssuerStub.IssuerFailed.selector);
        issuer.settle(address(fundA), settleAt);
    }

    function test_unlistedFundReverts() public {
        vm.expectRevert(abi.encodeWithSelector(IssuerStub.NotListed.selector, stranger));
        issuer.requestRedemption(stranger, 1);
    }
}
