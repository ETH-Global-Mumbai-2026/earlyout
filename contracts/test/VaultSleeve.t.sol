// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Base} from "./Base.t.sol";
import {Vault} from "../src/Vault.sol";
import {UsycSleeve} from "../src/UsycSleeve.sol";
import {MockUsyc, MockTeller} from "./mocks/UsycMocks.sol";

/// @dev Idle vault USDC parked in USYC through the sleeve.
contract VaultSleeveTest is Base {
    MockUsyc usyc;
    MockTeller teller;
    UsycSleeve sleeve;

    function setUp() public override {
        super.setUp();
        usyc = new MockUsyc();
        teller = new MockTeller(usdc, usyc);
        usdc.mint(address(teller), 10_000_000e6);
        sleeve = new UsycSleeve(usdc, usyc, address(teller));
        sleeve.setVault(address(vault));
        vault.setSleeve(address(sleeve));
    }

    function test_sweepKeepsTotalAssets() public {
        uint256 before = vault.totalAssets();
        vault.sweepToSleeve(90_000e6);
        assertEq(vault.idleUsdc(), LP_DEPOSIT - 90_000e6);
        assertApproxEqAbs(vault.totalAssets(), before, 1);
    }

    function test_onlyOwnerSweepsAndPulls() public {
        vm.prank(stranger);
        vm.expectRevert();
        vault.sweepToSleeve(1e6);
        vm.prank(stranger);
        vm.expectRevert();
        vault.pullFromSleeve(1e6);
    }

    function test_usycYieldRaisesSharePrice() public {
        vault.sweepToSleeve(90_000e6);
        uint256 p = vault.sharePrice();
        teller.setPrice(1.111e18); // +1%
        assertGt(vault.sharePrice(), p);
    }

    function test_quoteCountsSleeveCash() public {
        vault.sweepToSleeve(99_000e6); // 1,000 idle, a 10 unit claim pays about 10,900
        Vault.Quote memory q = vault.quoteFund(address(fundA), 10e18);
        assertEq(uint8(q.verdict), uint8(Vault.Verdict.BUY));
    }

    function test_sellPullsShortfallFromSleeve() public {
        vault.sweepToSleeve(99_000e6);
        uint256 before = usdc.balanceOf(holder);
        (, uint256 payout) = sellA(10e18);
        assertEq(usdc.balanceOf(holder), before + payout);
    }

    function test_lpCanWithdrawEverything() public {
        vault.sweepToSleeve(90_000e6);
        uint256 max = vault.maxWithdraw(lp);
        assertApproxEqAbs(max, LP_DEPOSIT, 2);
        uint256 shares = vault.maxRedeem(lp);
        vm.prank(lp);
        uint256 out = vault.redeem(shares, lp, lp);
        assertApproxEqAbs(out, LP_DEPOSIT, 2);
    }

    function test_pullFromSleeveReturnsCash() public {
        vault.sweepToSleeve(50_000e6);
        vault.pullFromSleeve(20_000e6);
        assertGe(vault.idleUsdc(), 70_000e6);
    }

    function test_vaultIgnoresASleeveThatPointsElsewhere() public {
        vault.sweepToSleeve(50_000e6);
        sleeve.setVault(stranger); // repointed at another vault
        assertEq(vault.sleeveValue(), 0, "not ours any more");
        assertEq(vault.totalAssets(), vault.idleUsdc());
        // sales and exits work on idle cash and never call the sleeve
        (, uint256 payout) = sellA(10e18);
        assertGt(payout, 0);
    }

    function test_sellCoversATellerRedeemFee() public {
        vault.sweepToSleeve(99_000e6);
        teller.setRedeemFee(5); // 0.05% taken on redemption
        uint256 before = usdc.balanceOf(holder);
        (, uint256 payout) = sellA(10e18);
        assertEq(usdc.balanceOf(holder), before + payout);
    }

    function test_shortAfterSleeveRevertsClearly() public {
        vault.sweepToSleeve(99_000e6);
        teller.setRedeemFee(10_000); // redemptions pay nothing
        uint256 id = depositA(10e18);
        vm.prank(holder);
        vm.expectRevert(Vault.SleeveShort.selector);
        vault.sell(id, 10e18, 0, holder);
    }
}
