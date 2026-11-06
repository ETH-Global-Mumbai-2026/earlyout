// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ERC1155Holder} from "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {FundRegistry} from "./FundRegistry.sol";
import {IssuerStub} from "./IssuerStub.sol";
import {ClaimToken} from "./ClaimToken.sol";

interface IVaultSell {
    function sell(uint256 claimId, uint256 amount, uint256 minPayout, address receiver) external returns (uint256);
}

/// @notice Turns a fund redemption into a claim token, and pays claim holders
///         once the issuer has settled.
contract ClaimWrapper is ERC1155Holder, Ownable {
    using SafeERC20 for IERC20;

    struct Collected {
        bool done;
        uint256 usdc;
        uint256 supplyAtCollect;
    }

    IERC20 public immutable usdc;
    FundRegistry public immutable registry;
    IssuerStub public immutable issuer;
    ClaimToken public immutable claims;
    IVaultSell public vault;

    mapping(uint256 => Collected) private _collected;

    event ClaimMinted(uint256 indexed claimId, address indexed fund, uint64 settleAt, address indexed owner, uint256 amount);
    event ClaimCollected(uint256 indexed claimId, uint256 usdcCollected, uint256 supply);
    event ClaimRedeemed(uint256 indexed claimId, address indexed holder, uint256 amount, uint256 usdcPaid);
    event VaultSet(address indexed vault);

    error NotListed(address fund);
    error NotDue(uint64 settleAt);
    error AlreadyCollected();
    error NotCollected();
    error VaultNotSet();
    error ZeroAmount();
    error NotAllowlisted(address account);

    constructor(IERC20 usdc_, FundRegistry registry_, IssuerStub issuer_, ClaimToken claims_) Ownable(msg.sender) {
        usdc = usdc_;
        registry = registry_;
        issuer = issuer_;
        claims = claims_;
    }

    function setVault(address vault_) external onlyOwner {
        vault = IVaultSell(vault_);
        claims.setApprovalForAll(vault_, true);
        emit VaultSet(vault_);
    }

    /// @notice Deposit fund tokens, file the redemption, receive the claim.
    function deposit(address fund, uint256 amount) external returns (uint256 claimId) {
        return _deposit(msg.sender, fund, amount);
    }

    /// @notice Deposit and sell the claim to the vault in one transaction.
    function depositAndSell(address fund, uint256 amount, uint256 minPayout)
        external
        returns (uint256 claimId, uint256 payout)
    {
        if (address(vault) == address(0)) revert VaultNotSet();
        claimId = _deposit(address(this), fund, amount);
        payout = vault.sell(claimId, amount, minPayout, msg.sender);
    }

    function _deposit(address to, address fund, uint256 amount) private returns (uint256 claimId) {
        if (!registry.isListed(fund)) revert NotListed(fund);
        if (amount == 0) revert ZeroAmount();
        // Same eligibility whether the claim lands with the caller (deposit) or
        // passes straight through to the vault (depositAndSell).
        if (!claims.allowlisted(msg.sender)) revert NotAllowlisted(msg.sender);
        IERC20(fund).safeTransferFrom(msg.sender, address(this), amount);
        IERC20(fund).forceApprove(address(issuer), amount);
        uint64 settleAt = issuer.requestRedemption(fund, amount);
        claimId = claims.mint(to, fund, settleAt, amount);
        emit ClaimMinted(claimId, fund, settleAt, to, amount);
    }

    /// @notice After the payout date, pull the USDC from the issuer.
    function collect(uint256 claimId) public returns (uint256 usdcCollected) {
        Collected storage c = _collected[claimId];
        if (c.done) revert AlreadyCollected();
        (address fund, uint64 settleAt) = claims.meta(claimId);
        if (block.timestamp < settleAt) revert NotDue(settleAt);
        usdcCollected = issuer.settle(fund, settleAt);
        c.done = true;
        c.usdc = usdcCollected;
        c.supplyAtCollect = claims.totalSupply(claimId);
        emit ClaimCollected(claimId, usdcCollected, c.supplyAtCollect);
    }

    /// @notice Burn claims for a pro-rata share of the collected USDC.
    function redeem(uint256 claimId, uint256 amount) external returns (uint256 usdcPaid) {
        Collected storage c = _collected[claimId];
        if (!c.done) revert NotCollected();
        if (amount == 0) revert ZeroAmount();
        usdcPaid = c.usdc * amount / c.supplyAtCollect;
        claims.burn(msg.sender, claimId, amount);
        usdc.safeTransfer(msg.sender, usdcPaid);
        emit ClaimRedeemed(claimId, msg.sender, amount, usdcPaid);
    }

    function claimFund(uint256 claimId) external view returns (address fund) {
        (fund,) = claims.meta(claimId);
    }

    function claimSettleAt(uint256 claimId) external view returns (uint64 settleAt) {
        (, settleAt) = claims.meta(claimId);
    }

    function isCollected(uint256 claimId) external view returns (bool) {
        return _collected[claimId].done;
    }

    function collected(uint256 claimId) external view returns (Collected memory) {
        return _collected[claimId];
    }
}
