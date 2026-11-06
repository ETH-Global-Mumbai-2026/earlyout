// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {MockUSDC} from "./mocks/MockUSDC.sol";
import {FundToken} from "../src/FundToken.sol";
import {FundRegistry} from "../src/FundRegistry.sol";
import {NavOracle} from "../src/NavOracle.sol";
import {IssuerStub} from "../src/IssuerStub.sol";
import {ClaimToken} from "../src/ClaimToken.sol";
import {ClaimWrapper} from "../src/ClaimWrapper.sol";
import {Vault} from "../src/Vault.sol";

/// @dev Full deployment with two funds: A pays in 90 days, B (demo window) in 15 minutes.
abstract contract Base is Test {
    MockUSDC usdc;
    FundToken fundA;
    FundToken fundB;
    FundRegistry registry;
    NavOracle oracle;
    IssuerStub issuer;
    ClaimToken claims;
    ClaimWrapper wrapper;
    Vault vault;

    address forwarder = makeAddr("forwarder");
    address holder = makeAddr("holder");
    address lp = makeAddr("lp");
    address buyer = makeAddr("buyer");
    address stranger = makeAddr("stranger");

    uint256 constant NAV_A = 1113_7732_0000; // 1113.7732 at 8dp, like the ACRED feed
    uint256 constant NAV_A_18 = 1113_7732 * 1e14;
    uint256 constant CAP_A = 50_000e6;
    uint256 constant LP_DEPOSIT = 100_000e6;
    uint256 constant HOLDER_UNITS = 100e18;

    function setUp() public virtual {
        vm.warp(1_762_400_000); // Nov 2026, so updatedAt arithmetic has room

        usdc = new MockUSDC();
        registry = new FundRegistry(50, 300);
        oracle = new NavOracle(forwarder);
        issuer = new IssuerStub(usdc, registry, oracle);
        claims = new ClaimToken();
        wrapper = new ClaimWrapper(usdc, registry, issuer, claims);
        vault = new Vault(usdc, registry, oracle, claims, wrapper);

        claims.setWrapper(address(wrapper));
        wrapper.setVault(address(vault));

        fundA = new FundToken("Apollo Diversified Credit (stand-in)", "ACRED");
        fundB = new FundToken("ACRED demo window", "ACRED-15m");

        registry.listFund(address(fundA), _terms("ACRED", 90 days, 1 days, 96 hours, CAP_A));
        registry.listFund(address(fundB), _terms("ACRED-15m", 15 minutes, 5 minutes, 96 hours, CAP_A));

        _allow(fundA);
        _allow(fundB);
        claims.setAllowlisted(holder, true);
        claims.setAllowlisted(buyer, true);
        claims.setAllowlisted(address(wrapper), true);
        claims.setAllowlisted(address(vault), true);

        fundA.mint(holder, HOLDER_UNITS);
        fundB.mint(holder, HOLDER_UNITS);

        pushNav(address(fundA), NAV_A, 8, uint64(block.timestamp - 1 hours), 0);
        pushNav(address(fundB), NAV_A, 8, uint64(block.timestamp - 1 hours), 0);

        usdc.mint(lp, LP_DEPOSIT);
        vm.startPrank(lp);
        usdc.approve(address(vault), type(uint256).max);
        vault.deposit(LP_DEPOSIT, lp);
        vm.stopPrank();

        usdc.mint(address(issuer), 1_000_000e6);
        usdc.mint(buyer, 1_000_000e6);

        vm.startPrank(holder);
        fundA.approve(address(wrapper), type(uint256).max);
        fundB.approve(address(wrapper), type(uint256).max);
        claims.setApprovalForAll(address(vault), true);
        vm.stopPrank();
        vm.prank(buyer);
        usdc.approve(address(vault), type(uint256).max);
    }

    function _terms(string memory symbol, uint64 delay, uint64 window, uint64 maxAge, uint256 cap)
        internal
        pure
        returns (FundRegistry.Terms memory)
    {
        return FundRegistry.Terms({
            listed: true,
            settlementDelay: delay,
            window: window,
            maxAge: maxAge,
            volBps: 800,
            creditBps: 150,
            recoveryBps: 4000,
            exposureCapUsdc: cap,
            symbol: symbol
        });
    }

    function _allow(FundToken f) internal {
        f.setAllowlisted(holder, true);
        f.setAllowlisted(address(wrapper), true);
        f.setAllowlisted(address(issuer), true);
    }

    function pushNav(address fund, uint256 nav, uint8 dec, uint64 updatedAt, uint8 status) internal {
        vm.prank(forwarder);
        oracle.onReport("", abi.encode(fund, nav, dec, updatedAt, status));
    }

    function depositA(uint256 units) internal returns (uint256 id) {
        vm.prank(holder);
        id = wrapper.deposit(address(fundA), units);
    }

    function sellA(uint256 units) internal returns (uint256 id, uint256 payout) {
        id = depositA(units);
        vm.prank(holder);
        payout = vault.sell(id, units, 0, holder);
    }

    function valueOf(uint256 units) internal pure returns (uint256) {
        return units * NAV_A_18 / 1e30;
    }
}
