// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Base} from "./Base.t.sol";
import {Vault} from "../src/Vault.sol";

/// @dev The demo, start to finish, on the 15-minute fund.
contract EndToEndTest is Base {
    function test_sellWaitSettle() public {
        uint256 priceStart = vault.sharePrice();

        // 1. holder sells 0.5 units of the demo fund, gets USDC now
        vm.prank(holder);
        (uint256 id, uint256 payout) = wrapper.depositAndSell(address(fundB), 5e17, 0);
        assertEq(usdc.balanceOf(holder), payout);
        assertEq(vault.sharePrice(), priceStart, "LPs unchanged while claim is held at cost");

        // 2. a second seller is refused above the cap
        fundB.mint(holder, 100e18);
        vm.prank(holder);
        uint256 bigId = wrapper.deposit(address(fundB), 60e18);
        assertEq(uint8(vault.quote(bigId, 60e18).verdict), uint8(Vault.Verdict.REFUSE));

        // 3. payout date passes, anyone settles, LP share price rises
        (, uint64 settleAt) = claims.meta(id);
        assertLe(settleAt - block.timestamp, 20 minutes);
        vm.warp(settleAt);
        vm.prank(stranger);
        uint256 received = vault.settle(id);
        assertEq(received, valueOf(5e17));
        assertGt(vault.sharePrice(), priceStart);
        assertEq(vault.deployedUsdc(), 0);

        // 4. LP withdraws everything including the gain
        uint256 shares = vault.balanceOf(lp);
        vm.prank(lp);
        uint256 out = vault.redeem(shares, lp, lp);
        assertGt(out, LP_DEPOSIT);
        assertApproxEqAbs(out, LP_DEPOSIT + received - payout, 1);
    }

    function test_issuerFailsAfterSale() public {
        vm.prank(holder);
        (uint256 id, uint256 payout) = wrapper.depositAndSell(address(fundB), 5e17, 0);
        uint256 priceStart = vault.sharePrice();

        // Issuer fails: its status API flips, CRE reports FAILED, trading halts, anyone marks the writedown
        issuer.setFailed(true);
        pushNav(address(fundB), NAV_A, 8, uint64(block.timestamp), 1);
        uint256 nextId = depositHolderB(1e17);
        assertEq(uint8(vault.quote(nextId, 1e17).verdict), uint8(Vault.Verdict.HALT));
        vault.markImpaired(address(fundB));
        assertLt(vault.sharePrice(), priceStart);
        assertEq(vault.totalAssets(), LP_DEPOSIT - payout + payout * 4000 / 10_000);

        // settlement is blocked while the issuer is failed
        (, uint64 settleAt) = claims.meta(id);
        vm.warp(settleAt);
        vm.expectRevert();
        vault.settle(id);
    }

    function depositHolderB(uint256 units) internal returns (uint256 id) {
        vm.prank(holder);
        id = wrapper.deposit(address(fundB), units);
    }
}
