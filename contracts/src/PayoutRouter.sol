// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ClaimToken} from "./ClaimToken.sol";
import {ClaimWrapper} from "./ClaimWrapper.sol";

/// @dev Circle CCTP V2 TokenMessenger.
interface ITokenMessengerV2 {
    function depositForBurnWithHook(
        uint256 amount,
        uint32 destinationDomain,
        bytes32 mintRecipient,
        address burnToken,
        bytes32 destinationCaller,
        uint256 maxFee,
        uint32 minFinalityThreshold,
        bytes calldata hookData
    ) external;
}

/// @notice Sell a pending redemption and get paid on another chain, in one
///         transaction: the sale settles on Arc, then the USDC payout is burned
///         through CCTP V2 with Circle's Forwarding Service, which mints
///         `payout - fees` to the recipient on the destination chain. The
///         recipient needs no gas there.
contract PayoutRouter {
    using SafeERC20 for IERC20;

    /// @dev Forwarding Service hook, v0 with no extra data: "cctp-forward" in 24 bytes, version 0, length 0.
    bytes public constant FORWARD_HOOK = hex"636374702d666f72776172640000000000000000000000000000000000000000";
    /// @dev Standard (finalized) transfer; the fee is the forwarding fee alone.
    uint32 public constant FINALITY = 1000;

    IERC20 public immutable usdc;
    ClaimWrapper public immutable wrapper;
    ClaimToken public immutable claims;
    ITokenMessengerV2 public immutable messenger;

    event PaidOut(
        address indexed seller,
        address indexed fund,
        uint256 claimId,
        uint256 amount,
        uint256 payout,
        uint32 destinationDomain,
        bytes32 recipient,
        uint256 maxFee
    );

    error NotAllowlisted(address seller);
    error FeeTooHigh(uint256 payout, uint256 maxFee);
    error ZeroRecipient();

    constructor(IERC20 usdc_, ClaimWrapper wrapper_, ClaimToken claims_, address messenger_) {
        usdc = usdc_;
        wrapper = wrapper_;
        claims = claims_;
        messenger = ITokenMessengerV2(messenger_);
    }

    /// @param recipient Destination address, left-padded to bytes32.
    /// @param maxFee Most USDC (6dp) Circle may take for the transfer; quote it
    ///        from the Iris fee endpoint with forward=true.
    function sellAndBridge(
        address fund,
        uint256 amount,
        uint256 minPayout,
        uint32 destinationDomain,
        bytes32 recipient,
        uint256 maxFee
    ) external returns (uint256 payout) {
        // Same eligibility as selling directly: the router itself is allowlisted,
        // so the seller is checked here.
        if (!claims.allowlisted(msg.sender)) revert NotAllowlisted(msg.sender);
        if (recipient == bytes32(0)) revert ZeroRecipient();

        IERC20(fund).safeTransferFrom(msg.sender, address(this), amount);
        IERC20(fund).forceApprove(address(wrapper), amount);
        uint256 claimId;
        (claimId, payout) = wrapper.depositAndSell(fund, amount, minPayout);
        if (payout <= maxFee) revert FeeTooHigh(payout, maxFee);

        usdc.forceApprove(address(messenger), payout);
        messenger.depositForBurnWithHook(
            payout, destinationDomain, recipient, address(usdc), bytes32(0), maxFee, FINALITY, FORWARD_HOOK
        );
        emit PaidOut(msg.sender, fund, claimId, amount, payout, destinationDomain, recipient, maxFee);
    }
}
