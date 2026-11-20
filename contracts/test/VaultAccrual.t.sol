// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Base} from "./Base.t.sol";
import {Vault} from "../src/Vault.sol";
import {FundRegistry} from "../src/FundRegistry.sol";

/// @dev Claims carried at a value that rises linearly from purchase to payout
///      date, toward their value at the purchase NAV (fix for LP gain sniping).
contract VaultAccrualTest is Base {
    function _settleAt(uint256 id) internal view returns (uint64 s) {
        (, s) = claims.meta(id);
    }

    function _line(uint256 v0, uint256 target, uint256 t0, uint256 s, uint256 t) internal pure returns (uint256) {
        if (t >= s) return target;
        return v0 + (target - v0) * (t - t0) / (s - t0);
    }

    function _freshNav() internal {
        pushNav(address(fundA), NAV_A, 8, uint64(block.timestamp), 0);
    }

    // ------------------------------------------------------------ Task 1

    function test_valueStartsAtCost() public {
        (uint256 id, uint256 cost) = sellA(10e18);
        assertEq(vault.positionValue(id), cost);
    }

    function test_valueAtMidpoint() public {
        (uint256 id, uint256 cost) = sellA(10e18);
        uint256 t0 = block.timestamp;
        uint64 s = _settleAt(id);
        vm.warp(t0 + (s - t0) / 2);
        uint256 expected = _line(cost, valueOf(10e18), t0, s, block.timestamp);
        assertApproxEqAbs(vault.positionValue(id), expected, 1);
        assertGt(vault.positionValue(id), cost);
        assertLt(vault.positionValue(id), valueOf(10e18));
    }

    function test_valueCappedAfterPayout() public {
        (uint256 id,) = sellA(10e18);
        vm.warp(_settleAt(id) + 30 days);
        assertEq(vault.positionValue(id), valueOf(10e18));
    }

    function test_twoSalesMerge() public {
        (uint256 id1, uint256 c1) = sellA(4e18);
        uint256 t1 = block.timestamp;
        vm.warp(t1 + 10 hours); // same daily window, so the same claim id
        (uint256 id2, uint256 c2) = sellA(6e18);
        assertEq(id2, id1, "same claim id");
        uint256 t2 = block.timestamp;
        uint64 s = _settleAt(id1);

        vm.warp(t2 + 30 days);
        uint256 expected = _line(c1, valueOf(4e18), t1, s, block.timestamp) + _line(c2, valueOf(6e18), t2, s, block.timestamp);
        assertApproxEqAbs(vault.positionValue(id1), expected, 2);
    }

    function test_totalAssetsUsesCarriedValue() public {
        (uint256 id,) = sellA(10e18);
        vm.warp(block.timestamp + 45 days);
        assertEq(vault.totalAssets(), vault.idleUsdc() + vault.positionValue(id));
        assertGt(vault.totalAssets(), LP_DEPOSIT, "LPs see the gain accrue before settlement");
    }

    function test_impairedClearedResumesAccrual() public {
        (uint256 id, uint256 cost) = sellA(10e18);
        uint256 t0 = block.timestamp;
        uint64 s = _settleAt(id);
        vm.warp(t0 + (s - t0) / 2);

        pushNav(address(fundA), NAV_A, 8, uint64(block.timestamp), 1);
        vault.markImpaired(address(fundA));
        assertEq(vault.totalAssets(), vault.idleUsdc() + cost * 4000 / 10_000);

        _freshNav();
        vault.clearImpaired(address(fundA));
        uint256 expected = _line(cost, valueOf(10e18), t0, s, block.timestamp);
        assertApproxEqAbs(vault.totalAssets(), vault.idleUsdc() + expected, 1);
    }

    // ------------------------------------------------------------ Task 2

    function test_snipingNoLongerPays() public {
        (uint256 id, uint256 cost) = sellA(10e18);
        uint256 lpAtSale = vault.convertToAssets(vault.balanceOf(lp));
        vm.warp(_settleAt(id));
        _freshNav();

        address attacker = makeAddr("attacker");
        uint256 stake = 1_000_000e6;
        usdc.mint(attacker, stake);
        vm.startPrank(attacker);
        usdc.approve(address(vault), type(uint256).max);
        vault.deposit(stake, attacker);
        vm.stopPrank();

        uint256 gain = vault.settle(id) - cost;

        uint256 sh = vault.balanceOf(attacker);
        vm.prank(attacker);
        uint256 out = vault.redeem(sh, attacker, attacker);
        uint256 lpAfter = vault.convertToAssets(vault.balanceOf(lp));

        assertLe(out > stake ? out - stake : 0, 1e6, "attacker makes at most 1 USDC");
        assertGe(lpAfter - lpAtSale, gain * 99 / 100, "LP keeps the gain it funded");
    }

    function test_partialBuyReducesValueProRata() public {
        (uint256 id,) = sellA(2e18);
        vm.warp(block.timestamp + 45 days);
        _freshNav();
        uint256 v = vault.positionValue(id);
        vm.prank(buyer);
        vault.buy(id, 1e18, type(uint256).max);
        assertApproxEqAbs(vault.positionValue(id), v / 2, 1);
    }

    function test_sellAfterPartialBuyMerges() public {
        (uint256 id, uint256 c1) = sellA(4e18);
        uint256 t1 = block.timestamp;
        vm.warp(t1 + 5 hours);
        vm.prank(buyer);
        vault.buy(id, 2e18, type(uint256).max);
        vm.warp(block.timestamp + 2 hours);
        (uint256 id3, uint256 c3) = sellA(3e18);
        assertEq(id3, id);
        uint256 t3 = block.timestamp;
        uint64 s = _settleAt(id);

        vm.warp(t3 + 30 days);
        uint256 expected = _line(c1, valueOf(4e18), t1, s, block.timestamp) / 2 + _line(c3, valueOf(3e18), t3, s, block.timestamp);
        assertApproxEqAbs(vault.positionValue(id), expected, 3);
    }

    function test_settleNavDropTrueUp() public {
        (uint256 id,) = sellA(10e18);
        vm.warp(_settleAt(id));
        pushNav(address(fundA), NAV_A * 99 / 100, 8, uint64(block.timestamp), 0);
        uint256 before = vault.totalAssets();
        uint256 carried = vault.positionValue(id);
        uint256 received = vault.settle(id);
        assertLt(received, carried, "NAV fell, so settlement pays less than carried");
        assertEq(vault.totalAssets(), before - (carried - received));
    }

    // ------------------------------------------------------------ running totals

    function _folded(uint256 id) internal view returns (bool f) {
        (,,,,,,, f) = vault.positions(id);
    }

    function test_acredRealTermsHundredDays() public {
        uint256[] memory ids = new uint256[](100);
        for (uint256 i; i < 100; ++i) {
            (ids[i],) = sellA(1e17); // every day opens a new payout date
            vm.warp(block.timestamp + 1 days);
            _freshNav();
        }
        uint256 sum;
        for (uint256 i; i < 100; ++i) sum += vault.positionValue(ids[i]);
        assertApproxEqAbs(vault.totalAssets(), vault.idleUsdc() + sum, 100);
        assertTrue(_folded(ids[0]), "matured claims fold during later sales");
    }

    function test_foldMatchesUnfolded() public {
        (uint256 id,) = sellA(10e18);
        vm.warp(_settleAt(id) + 1 days);
        uint256 before = vault.totalAssets();
        assertFalse(_folded(id));
        vm.prank(stranger);
        vault.fold(address(fundA), 10);
        assertTrue(_folded(id));
        assertApproxEqAbs(vault.totalAssets(), before, 1);
        assertApproxEqAbs(before, vault.idleUsdc() + valueOf(10e18), 1);
    }

    function test_foldBoundedBySteps() public {
        (uint256 a,) = sellA(1e18);
        vm.warp(block.timestamp + 1 days);
        _freshNav();
        (uint256 b,) = sellA(1e18);
        vm.warp(_settleAt(b) + 1);
        vault.fold(address(fundA), 1);
        assertTrue(_folded(a));
        assertFalse(_folded(b));
        vault.fold(address(fundA), 1);
        assertTrue(_folded(b));
    }

    function test_settleFoldedAndUnfolded() public {
        (uint256 a,) = sellA(1e18);
        vm.warp(block.timestamp + 1 days);
        _freshNav();
        (uint256 b,) = sellA(1e18);
        vm.warp(_settleAt(b) + 1);
        _freshNav();
        vault.fold(address(fundA), 1); // a folded, b not
        vault.settle(a);
        assertApproxEqAbs(vault.totalAssets(), vault.idleUsdc() + vault.positionValue(b), 1);
        vault.settle(b);
        assertEq(vault.totalAssets(), vault.idleUsdc());
        assertEq(vault.deployedUsdc(), 0);
    }

    function test_resellAfterFullBuyout() public {
        (uint256 id,) = sellA(2e18);
        vm.prank(buyer);
        vault.buy(id, 2e18, type(uint256).max);
        assertEq(vault.positionValue(id), 0);
        assertEq(vault.totalAssets(), vault.idleUsdc());

        (uint256 id2, uint256 c2) = sellA(1e18);
        assertEq(id2, id);
        assertEq(vault.positionValue(id), c2);
        assertEq(vault.totalAssets(), vault.idleUsdc() + c2);
    }

    function test_termsChangeInsertsInOrder() public {
        (uint256 late,) = sellA(1e18); // pays in 90 days
        registry.setTerms(address(fundA), _terms("ACRED", 10 days, 1 days, 96 hours, CAP_A));
        (uint256 early,) = sellA(1e18); // pays in 10 days, earlier than the queue tail
        assertLt(_settleAt(early), _settleAt(late));
        vm.warp(_settleAt(early) + 1);
        _freshNav();
        assertApproxEqAbs(vault.totalAssets(), vault.idleUsdc() + vault.positionValue(early) + vault.positionValue(late), 2);
        vault.fold(address(fundA), 10);
        assertTrue(_folded(early));
        assertFalse(_folded(late));
    }

    function test_dustSaleRefused() public view {
        Vault.Quote memory q = vault.quoteFund(address(fundA), 1);
        assertEq(uint8(q.verdict), uint8(Vault.Verdict.REFUSE));
        assertEq(q.reason, "Amount too small");
    }

    function test_settleClearsPosition() public {
        (uint256 a,) = sellA(1e18);
        vm.warp(block.timestamp + 1 days);
        _freshNav();
        (uint256 b,) = sellA(1e18);
        vm.warp(_settleAt(a));
        _freshNav();
        vault.settle(a);
        assertEq(vault.positionValue(a), 0);
        assertApproxEqAbs(vault.totalAssets(), vault.idleUsdc() + vault.positionValue(b), 1);
    }
}
