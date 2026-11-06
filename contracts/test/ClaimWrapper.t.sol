// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Base} from "./Base.t.sol";
import {ClaimWrapper} from "../src/ClaimWrapper.sol";

contract ClaimWrapperTest is Base {
    function test_depositMintsClaim() public {
        uint256 id = depositA(2e18);
        (address fund, uint64 settleAt) = claims.meta(id);
        assertEq(fund, address(fundA));
        assertEq(claims.balanceOf(holder, id), 2e18);
        assertEq(claims.totalSupply(id), 2e18);
        assertEq(fundA.balanceOf(address(issuer)), 2e18);
        assertEq(issuer.pending(address(wrapper), address(fundA), settleAt), 2e18);
    }

    function test_unlistedFundReverts() public {
        vm.prank(holder);
        vm.expectRevert(abi.encodeWithSelector(ClaimWrapper.NotListed.selector, stranger));
        wrapper.deposit(stranger, 1);
    }

    function test_depositAndSellPaysHolder() public {
        uint256 before = usdc.balanceOf(holder);
        vm.prank(holder);
        (uint256 id, uint256 payout) = wrapper.depositAndSell(address(fundA), 1e18, 0);
        assertGt(payout, 0);
        assertEq(usdc.balanceOf(holder) - before, payout);
        assertEq(claims.balanceOf(address(vault), id), 1e18);
        assertEq(claims.balanceOf(address(wrapper), id), 0);
    }

    function test_collectThenRedeemProRata() public {
        uint256 id = depositA(4e18);
        vm.prank(holder);
        claims.safeTransferFrom(holder, buyer, id, 1e18, "");
        (, uint64 settleAt) = claims.meta(id);

        vm.expectRevert(abi.encodeWithSelector(ClaimWrapper.NotCollected.selector));
        wrapper.redeem(id, 1);

        vm.warp(settleAt);
        pushNav(address(fundA), NAV_A, 8, uint64(block.timestamp), 0); // settlement needs a fresh NAV
        uint256 collected = wrapper.collect(id);
        assertEq(collected, valueOf(4e18));

        vm.prank(buyer);
        uint256 paid = wrapper.redeem(id, 1e18);
        assertEq(paid, collected / 4);
        assertEq(claims.balanceOf(buyer, id), 0);

        vm.expectRevert(ClaimWrapper.AlreadyCollected.selector);
        wrapper.collect(id);
    }

    function test_collectBeforeDueReverts() public {
        uint256 id = depositA(1e18);
        (, uint64 settleAt) = claims.meta(id);
        vm.expectRevert(abi.encodeWithSelector(ClaimWrapper.NotDue.selector, settleAt));
        wrapper.collect(id);
    }
}
