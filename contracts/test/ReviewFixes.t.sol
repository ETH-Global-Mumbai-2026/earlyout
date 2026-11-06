// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Base} from "./Base.t.sol";
import {Vault} from "../src/Vault.sol";
import {NavOracle} from "../src/NavOracle.sol";
import {IssuerStub} from "../src/IssuerStub.sol";
import {ClaimWrapper} from "../src/ClaimWrapper.sol";
import {ERC4626} from "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";

/// @dev Regression tests for the fixes made in the security review (docs/studio-review.md).
contract ReviewFixesTest is Base {
    // ------------------------------------------------------------ NavOracle: future timestamps

    function test_oracle_futureReportBeyondDriftRejected() public {
        uint64 tooFar = uint64(block.timestamp) + 5 minutes + 1;
        vm.prank(forwarder);
        vm.expectRevert(
            abi.encodeWithSelector(NavOracle.FutureReport.selector, address(fundA), tooFar, uint64(block.timestamp) + 5 minutes)
        );
        oracle.onReport("", abi.encode(address(fundA), NAV_A, uint8(8), tooFar, uint8(0)));
    }

    function test_oracle_futureReportWithinDriftAccepted_andCorrectable() public {
        uint64 ahead = uint64(block.timestamp) + 5 minutes;
        pushNav(address(fundA), NAV_A, 8, ahead, 0);
        (, uint64 at,) = oracle.getNav(address(fundA));
        assertEq(at, ahead);
        // a correction at the same stamp still lands (equal is accepted)
        pushNav(address(fundA), NAV_A, 8, ahead, 1);
        // and after the clock catches up a normal report is accepted
        vm.warp(block.timestamp + 6 minutes);
        pushNav(address(fundA), NAV_A, 8, uint64(block.timestamp), 0);
    }

    function test_vault_quoteDoesNotRevertOnSlightlyFutureNav() public {
        uint256 id = depositA(1e18);
        pushNav(address(fundA), NAV_A, 8, uint64(block.timestamp) + 2 minutes, 0);
        Vault.Quote memory q = vault.quote(id, 1e18);
        assertEq(uint8(q.verdict), uint8(Vault.Verdict.BUY));
    }

    // ------------------------------------------------------------ NavOracle: workflow identity

    function _meta(bytes32 id, address wfOwner) internal pure returns (bytes memory) {
        return abi.encodePacked(id, bytes10("wf"), wfOwner, bytes2(0x0001));
    }

    function _report() internal view returns (bytes memory) {
        return abi.encode(address(fundA), NAV_A, uint8(8), uint64(block.timestamp), uint8(0));
    }

    function test_oracle_workflowOwnerPinned() public {
        address good = makeAddr("workflowOwner");
        address other = makeAddr("otherOwner");
        oracle.setExpectedWorkflowOwner(good);

        vm.startPrank(forwarder);
        vm.expectRevert(abi.encodeWithSelector(NavOracle.BadMetadata.selector, 0));
        oracle.onReport("", _report());

        vm.expectRevert(abi.encodeWithSelector(NavOracle.InvalidWorkflowOwner.selector, other));
        oracle.onReport(_meta(bytes32(uint256(1)), other), _report());

        oracle.onReport(_meta(bytes32(uint256(1)), good), _report());
        vm.stopPrank();
    }

    function test_oracle_workflowIdPinned() public {
        address wfOwner = makeAddr("workflowOwner");
        bytes32 id = bytes32(uint256(0xabc));
        oracle.setExpectedWorkflowId(id);

        vm.startPrank(forwarder);
        vm.expectRevert(abi.encodeWithSelector(NavOracle.InvalidWorkflowId.selector, bytes32(uint256(0xdef))));
        oracle.onReport(_meta(bytes32(uint256(0xdef)), wfOwner), _report());
        oracle.onReport(_meta(id, wfOwner), _report());
        vm.stopPrank();
    }

    function test_oracle_workflowPinningIsOwnerOnlyAndOptional() public {
        vm.startPrank(stranger);
        vm.expectRevert();
        oracle.setExpectedWorkflowOwner(stranger);
        vm.expectRevert();
        oracle.setExpectedWorkflowId(bytes32(uint256(1)));
        vm.stopPrank();
        // unset: empty metadata is fine (simulation forwarder / EOA stand-in)
        vm.prank(forwarder);
        oracle.onReport("", _report());
    }

    // ------------------------------------------------------------ IssuerStub: settlement NAV

    function test_issuer_settleWithoutNavRevertsAndStaysRetryable() public {
        address fundC = address(new FundC(address(this)));
        registry.listFund(fundC, _terms("C", 1 days, 1 days, 96 hours, CAP_A));
        // a redemption exists but the oracle never reported for this fund
        FundC(fundC).approve(address(issuer), 1e18);
        issuer.requestRedemption(fundC, 1e18);
        uint64 settleAt = uint64(((block.timestamp + 1 days + 1 days - 1) / 1 days) * 1 days);
        vm.warp(settleAt);

        vm.expectRevert(abi.encodeWithSelector(IssuerStub.NoNav.selector, fundC));
        issuer.settle(fundC, settleAt);
        assertEq(issuer.pending(address(this), fundC, settleAt), 1e18, "redemption not consumed");

        pushNav(fundC, NAV_A, 8, uint64(block.timestamp), 0);
        assertEq(issuer.settle(fundC, settleAt), valueOf(1e18));
    }

    function test_issuer_settleOnStaleNavRevertsThenRetries() public {
        uint256 id = depositA(1e18);
        (, uint64 settleAt) = claims.meta(id);
        vm.warp(settleAt);
        (, uint64 at,) = oracle.getNav(address(fundA));
        vm.expectRevert(abi.encodeWithSelector(IssuerStub.NavStale.selector, address(fundA), at, uint64(96 hours)));
        wrapper.collect(id);
        assertFalse(wrapper.isCollected(id));

        pushNav(address(fundA), NAV_A, 8, uint64(block.timestamp), 0);
        assertEq(wrapper.collect(id), valueOf(1e18));
    }

    function test_issuer_settleWhileOracleReportsFailureReverts() public {
        uint256 id = depositA(1e18);
        (, uint64 settleAt) = claims.meta(id);
        vm.warp(settleAt);
        pushNav(address(fundA), NAV_A, 8, uint64(block.timestamp), 1);
        vm.expectRevert(abi.encodeWithSelector(IssuerStub.OracleReportsFailure.selector, address(fundA)));
        wrapper.collect(id);
        assertFalse(wrapper.isCollected(id));
        pushNav(address(fundA), NAV_A, 8, uint64(block.timestamp), 0);
        wrapper.collect(id);
    }

    // ------------------------------------------------------------ ClaimWrapper: claim eligibility at entry

    function test_wrapper_depositRequiresClaimAllowlist() public {
        claims.setAllowlisted(holder, false);
        vm.startPrank(holder);
        vm.expectRevert(abi.encodeWithSelector(ClaimWrapper.NotAllowlisted.selector, holder));
        wrapper.deposit(address(fundA), 1e18);
        vm.expectRevert(abi.encodeWithSelector(ClaimWrapper.NotAllowlisted.selector, holder));
        wrapper.depositAndSell(address(fundA), 1e18, 0);
        vm.stopPrank();
        assertEq(fundA.balanceOf(holder), HOLDER_UNITS, "fund tokens untouched");

        claims.setAllowlisted(holder, true);
        vm.prank(holder);
        wrapper.depositAndSell(address(fundA), 1e18, 0);
    }

    // ------------------------------------------------------------ Vault: LP flows around impairment

    function test_vault_lpFlowsPausedBetweenFailureReportAndWritedown() public {
        sellA(10e18);
        uint256 shares = vault.balanceOf(lp);
        pushNav(address(fundA), NAV_A, 8, uint64(block.timestamp), 1); // oracle says FAILED, not yet marked

        assertEq(vault.maxWithdraw(lp), 0);
        assertEq(vault.maxRedeem(lp), 0);
        assertEq(vault.maxDeposit(lp), 0);
        assertEq(vault.maxMint(lp), 0);

        vm.startPrank(lp);
        vm.expectRevert();
        vault.withdraw(1e6, lp, lp);
        vm.expectRevert();
        vault.redeem(shares / 10, lp, lp);
        vm.expectRevert();
        vault.deposit(1e6, lp);
        vm.expectRevert();
        vault.mint(1e6, lp);
        vm.stopPrank();

        // anyone ends the pause by writing the claims down; exits then price in the loss
        vault.markImpaired(address(fundA));
        assertGt(vault.maxWithdraw(lp), 0);
        uint256 price = vault.convertToAssets(shares);
        vm.prank(lp);
        assertEq(vault.redeem(shares / 2, lp, lp), price / 2);
    }

    function test_vault_entriesPausedUntilWritedownCleared_exitsStayOpen() public {
        sellA(10e18);
        pushNav(address(fundA), NAV_A, 8, uint64(block.timestamp), 1);
        vault.markImpaired(address(fundA));
        assertGt(vault.maxWithdraw(lp), 0);
        assertGt(vault.maxDeposit(lp), 0);

        // issuer recovers: a new LP must not be able to buy in at the written-down price
        pushNav(address(fundA), NAV_A, 8, uint64(block.timestamp), 0);
        assertEq(vault.maxDeposit(buyer), 0);
        assertEq(vault.maxMint(buyer), 0);
        assertGt(vault.maxWithdraw(lp), 0, "exits stay open");
        vm.startPrank(buyer);
        vm.expectRevert(abi.encodeWithSelector(ERC4626.ERC4626ExceededMaxDeposit.selector, buyer, 1e6, 0));
        vault.deposit(1e6, buyer);
        vm.stopPrank();

        vault.clearImpaired(address(fundA));
        assertGt(vault.maxDeposit(buyer), 0);
        vm.prank(buyer);
        vault.deposit(1e6, buyer);
    }

    function test_vault_noLockWithoutExposure() public {
        // fund has no claims held by the vault, so a failure report does not freeze LPs
        pushNav(address(fundA), NAV_A, 8, uint64(block.timestamp), 1);
        assertEq(vault.maxWithdraw(lp), LP_DEPOSIT);
        assertGt(vault.maxDeposit(lp), 0);
    }
}

/// @dev Minimal unrestricted 18dp token for a fund that has never had an oracle report.
contract FundC {
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    constructor(address to) {
        balanceOf[to] = 10e18;
    }

    function approve(address s, uint256 v) external returns (bool) {
        allowance[msg.sender][s] = v;
        return true;
    }

    function transferFrom(address f, address t, uint256 v) external returns (bool) {
        allowance[f][msg.sender] -= v;
        balanceOf[f] -= v;
        balanceOf[t] += v;
        return true;
    }

    function transfer(address t, uint256 v) external returns (bool) {
        balanceOf[msg.sender] -= v;
        balanceOf[t] += v;
        return true;
    }
}
