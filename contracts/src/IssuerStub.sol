// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {FundRegistry} from "./FundRegistry.sol";
import {NavOracle} from "./NavOracle.sol";

/// @notice Stand-in for a fund issuer's redemption desk. Queues redemptions and
///         pays NAV in USDC once the payout date passes. Owner pre-funds USDC.
contract IssuerStub is Ownable {
    using SafeERC20 for IERC20;

    IERC20 public immutable usdc;
    FundRegistry public immutable registry;
    NavOracle public immutable oracle;

    bool public failed;

    // requester => fund => settleAt => fund token amount queued
    mapping(address => mapping(address => mapping(uint64 => uint256))) public pending;

    event RedemptionRequested(address indexed requester, address indexed fund, uint64 settleAt, uint256 amount);
    event RedemptionSettled(address indexed requester, address indexed fund, uint64 settleAt, uint256 amount, uint256 usdcPaid);
    event FailedSet(bool failed);

    error NotListed(address fund);
    error NothingPending();
    error NotDue(uint64 settleAt);
    error IssuerFailed();
    error ZeroAmount();
    error NoNav(address fund);
    error NavStale(address fund, uint64 updatedAt, uint64 maxAge);
    error OracleReportsFailure(address fund);

    constructor(IERC20 usdc_, FundRegistry registry_, NavOracle oracle_) Ownable(msg.sender) {
        usdc = usdc_;
        registry = registry_;
        oracle = oracle_;
    }

    function setFailed(bool failed_) external onlyOwner {
        failed = failed_;
        emit FailedSet(failed_);
    }

    function requestRedemption(address fund, uint256 amount) external returns (uint64 settleAt) {
        FundRegistry.Terms memory t = registry.getTerms(fund);
        if (!t.listed) revert NotListed(fund);
        if (amount == 0) revert ZeroAmount();

        IERC20(fund).safeTransferFrom(msg.sender, address(this), amount);

        uint256 raw = block.timestamp + t.settlementDelay;
        settleAt = uint64(t.window == 0 ? raw : ((raw + t.window - 1) / t.window) * t.window);

        pending[msg.sender][fund][settleAt] += amount;
        emit RedemptionRequested(msg.sender, fund, settleAt, amount);
    }

    function settle(address fund, uint64 settleAt) external returns (uint256 usdcPaid) {
        if (failed) revert IssuerFailed();
        if (block.timestamp < settleAt) revert NotDue(settleAt);
        uint256 amount = pending[msg.sender][fund][settleAt];
        if (amount == 0) revert NothingPending();

        // Collection is permissionless and final, so it must never lock in a
        // missing, stale or failed NAV. Revert before consuming the redemption.
        (uint256 nav, uint64 updatedAt, uint8 status) = oracle.getNav(fund);
        if (status == oracle.STATUS_FAILED()) revert OracleReportsFailure(fund);
        if (nav == 0) revert NoNav(fund);
        uint64 maxAge = registry.getTerms(fund).maxAge;
        if (block.timestamp > updatedAt && block.timestamp - updatedAt > maxAge) {
            revert NavStale(fund, updatedAt, maxAge);
        }
        delete pending[msg.sender][fund][settleAt];

        usdcPaid = amount * nav / 1e30;
        usdc.safeTransfer(msg.sender, usdcPaid);
        emit RedemptionSettled(msg.sender, fund, settleAt, amount, usdcPaid);
    }
}
