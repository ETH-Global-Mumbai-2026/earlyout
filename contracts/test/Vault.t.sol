// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Base} from "./Base.t.sol";
import {Vault} from "../src/Vault.sol";

contract VaultTest is Base {
    function test_quoteIsBuyWithFourTerms() public {
        uint256 id = depositA(1e18);
        Vault.Quote memory q = vault.quote(id, 1e18);
        assertEq(uint8(q.verdict), uint8(Vault.Verdict.BUY));
        assertEq(q.nav, NAV_A_18);
        assertEq(q.baseBps, 50);
        assertEq(q.utilBps, 0);
        assertEq(q.creditBps, 150);
        // 90 days: 800 * sqrt(90/365) = 397 bps, give or take window rounding
        assertGt(q.timeBps, 380);
        assertLt(q.timeBps, 410);
        uint256 spread = uint256(q.baseBps) + q.utilBps + q.timeBps + q.creditBps;
        assertEq(q.payout, valueOf(1e18) * (10_000 - spread) / 10_000);
        assertEq(q.capacityLeft, CAP_A);
    }

    function test_sellHappyPath() public {
        uint256 id = depositA(1e18);
        Vault.Quote memory q = vault.quote(id, 1e18);
        uint256 assetsBefore = vault.totalAssets();

        vm.expectEmit(true, true, false, true);
        emit Vault.ClaimSold(id, holder, 1e18, q.payout, q.nav, q.baseBps, q.utilBps, q.timeBps, q.creditBps);
        vm.prank(holder);
        uint256 payout = vault.sell(id, 1e18, q.payout, holder);

        assertEq(payout, q.payout);
        assertEq(usdc.balanceOf(holder), payout);
        assertEq(claims.balanceOf(address(vault), id), 1e18);
        assertEq(vault.deployedUsdc(), payout);
        assertEq(vault.fundCost(address(fundA)), payout);
        assertEq(vault.totalAssets(), assetsBefore, "claims held at cost");
    }

    function test_utilisationRaisesSpread() public {
        (, uint256 p1) = sellA(10e18);
        uint256 id2 = depositA(10e18);
        Vault.Quote memory q = vault.quote(id2, 10e18);
        assertGt(q.utilBps, 0);
        assertEq(q.utilBps, 300 * p1 / vault.totalAssets());
    }

    function test_refuseOverCap() public {
        // 50 units is about 55,689 USDC of value, above the 50,000 cap
        uint256 id = depositA(50e18);
        Vault.Quote memory q = vault.quote(id, 50e18);
        assertEq(uint8(q.verdict), uint8(Vault.Verdict.REFUSE));
        assertEq(q.reason, "Over the fund cap");
        vm.prank(holder);
        vm.expectRevert(abi.encodeWithSelector(Vault.NotBuyable.selector, Vault.Verdict.REFUSE, "Over the fund cap"));
        vault.sell(id, 50e18, 0, holder);
    }

    function test_refuseWhenVaultShortOfUsdc() public {
        registry.setTerms(address(fundA), _terms("ACRED", 90 days, 1 days, 96 hours, 10_000_000e6));
        vm.prank(lp);
        vault.withdraw(LP_DEPOSIT - 1_000e6, lp, lp);
        uint256 id = depositA(2e18);
        Vault.Quote memory q = vault.quote(id, 2e18);
        assertEq(uint8(q.verdict), uint8(Vault.Verdict.REFUSE));
        assertEq(q.reason, "Vault short of USDC");
    }

    function test_haltOnStaleNav() public {
        uint256 id = depositA(1e18);
        vm.warp(block.timestamp + 96 hours + 1);
        Vault.Quote memory q = vault.quote(id, 1e18);
        assertEq(uint8(q.verdict), uint8(Vault.Verdict.HALT));
        assertEq(q.reason, "NAV is stale");
        // a fresh report clears it
        pushNav(address(fundA), NAV_A, 8, uint64(block.timestamp), 0);
        assertEq(uint8(vault.quote(id, 1e18).verdict), uint8(Vault.Verdict.BUY));
    }

    function test_haltOnIssuerFailed() public {
        uint256 id = depositA(1e18);
        pushNav(address(fundA), NAV_A, 8, uint64(block.timestamp), 1);
        Vault.Quote memory q = vault.quote(id, 1e18);
        assertEq(uint8(q.verdict), uint8(Vault.Verdict.HALT));
        assertEq(q.reason, "Issuer reports failure");
        vm.prank(holder);
        vm.expectRevert();
        vault.sell(id, 1e18, 0, holder);
    }

    function test_markImpairedDropsSharePriceOnce() public {
        (, uint256 cost) = sellA(10e18);
        uint256 priceBefore = vault.sharePrice();
        uint256 assetsBefore = vault.totalAssets();

        vm.expectRevert(abi.encodeWithSelector(Vault.IssuerNotFailed.selector, address(fundA)));
        vault.markImpaired(address(fundA));

        pushNav(address(fundA), NAV_A, 8, uint64(block.timestamp), 1);
        vm.prank(stranger);
        vault.markImpaired(address(fundA));

        assertEq(vault.totalAssets(), assetsBefore - cost + cost * 4000 / 10_000, "written down to 40% of cost");
        assertLt(vault.sharePrice(), priceBefore);
        assertEq(vault.sharePrice(), vault.totalAssets() * 1e12 / vault.totalSupply());
    }

    function test_clearImpairedNeedsStatusOk() public {
        sellA(1e18);
        pushNav(address(fundA), NAV_A, 8, uint64(block.timestamp), 1);
        vault.markImpaired(address(fundA));
        vm.expectRevert(abi.encodeWithSelector(Vault.IssuerStillFailed.selector, address(fundA)));
        vault.clearImpaired(address(fundA));
        pushNav(address(fundA), NAV_A, 8, uint64(block.timestamp), 0);
        vault.clearImpaired(address(fundA));
        assertFalse(vault.impaired(address(fundA)));
    }

    function test_lpWithdrawCappedAtIdle() public {
        (, uint256 cost) = sellA(10e18);
        assertEq(vault.maxWithdraw(lp), LP_DEPOSIT - cost);
        assertEq(vault.maxRedeem(lp), vault.convertToShares(LP_DEPOSIT - cost));
        vm.prank(lp);
        vm.expectRevert();
        vault.withdraw(LP_DEPOSIT, lp, lp);
        vm.prank(lp);
        vault.withdraw(LP_DEPOSIT - cost, lp, lp);
        assertEq(vault.idleUsdc(), 0);
    }

    function test_minPayoutReverts() public {
        uint256 id = depositA(1e18);
        uint256 payout = vault.quote(id, 1e18).payout;
        vm.prank(holder);
        vm.expectRevert(abi.encodeWithSelector(Vault.BelowMinPayout.selector, payout, payout + 1));
        vault.sell(id, 1e18, payout + 1, holder);
    }

    function test_buyFromVaultAndMaxCost() public {
        (uint256 id, uint256 cost) = sellA(2e18);
        uint256 price = vault.buyPrice(id, 1e18);
        // buyer pays NAV minus time and credit only, so more than the vault paid per unit
        assertGt(price, cost / 2);
        assertLt(price, valueOf(1e18));

        vm.prank(buyer);
        vm.expectRevert(abi.encodeWithSelector(Vault.AboveMaxCost.selector, price, price - 1));
        vault.buy(id, 1e18, price - 1);

        uint256 assetsBefore = vault.totalAssets();
        vm.prank(buyer);
        uint256 paid = vault.buy(id, 1e18, price);
        assertEq(paid, price);
        assertEq(claims.balanceOf(buyer, id), 1e18);
        (uint256 amt, uint256 c) = vault.positions(id);
        assertEq(amt, 1e18);
        assertEq(c, cost / 2);
        assertEq(vault.totalAssets(), assetsBefore + price - cost / 2, "gain realised on sale");
    }

    function test_buyByNonAllowlistedReverts() public {
        (uint256 id,) = sellA(1e18);
        usdc.mint(stranger, 1e12);
        vm.startPrank(stranger);
        usdc.approve(address(vault), type(uint256).max);
        vm.expectRevert();
        vault.buy(id, 1e18, type(uint256).max);
        vm.stopPrank();
    }

    function test_settleRealisesGain() public {
        (uint256 id, uint256 cost) = sellA(1e18);
        (, uint64 settleAt) = claims.meta(id);
        vm.expectRevert(abi.encodeWithSelector(Vault.NotDue.selector, settleAt));
        vault.settle(id);

        uint256 priceBefore = vault.sharePrice();
        vm.warp(settleAt);
        pushNav(address(fundA), NAV_A, 8, uint64(block.timestamp), 0);
        uint256 received = vault.settle(id);
        assertEq(received, valueOf(1e18));
        assertGt(received, cost);
        assertEq(vault.deployedUsdc(), 0);
        assertEq(vault.totalAssets(), LP_DEPOSIT + received - cost);
        assertGt(vault.sharePrice(), priceBefore);
    }

    function test_refuseWhenClaimAlreadyDue() public {
        uint256 id = depositA(1e18);
        (, uint64 settleAt) = claims.meta(id);
        vm.warp(settleAt);
        pushNav(address(fundA), NAV_A, 8, uint64(block.timestamp), 0);
        assertEq(vault.quote(id, 1e18).reason, "Claim is already due");
    }

    function test_quoteFundMatchesQuoteAfterDeposit() public {
        Vault.Quote memory before = vault.quoteFund(address(fundA), 1e18);
        uint256 id = depositA(1e18);
        Vault.Quote memory after_ = vault.quote(id, 1e18);
        assertEq(uint8(before.verdict), uint8(Vault.Verdict.BUY));
        assertEq(before.payout, after_.payout);
        assertEq(before.timeBps, after_.timeBps);
        assertEq(wrapper.claimFund(id), address(fundA));
        (, uint64 settleAt) = claims.meta(id);
        assertEq(wrapper.claimSettleAt(id), settleAt);
    }

    function test_quoteFundUnlistedReverts() public {
        vm.expectRevert(abi.encodeWithSelector(Vault.FundNotListed.selector, stranger));
        vault.quoteFund(stranger, 1e18);
    }

    function test_unknownClaimReverts() public {
        vm.expectRevert(abi.encodeWithSelector(Vault.UnknownClaim.selector, 42));
        vault.quote(42, 1);
    }
}
