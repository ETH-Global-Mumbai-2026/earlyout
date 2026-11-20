// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Base} from "./Base.t.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {PayoutRouter} from "../src/PayoutRouter.sol";

/// @dev Records the burn the router asks CCTP for and takes the USDC, like TokenMessengerV2.
contract MockTokenMessenger {
    uint256 public amount;
    uint32 public destDomain;
    bytes32 public recipient;
    address public burnToken;
    bytes32 public destCaller;
    uint256 public maxFee;
    uint32 public finality;
    bytes public hookData;

    function depositForBurnWithHook(
        uint256 amount_,
        uint32 destDomain_,
        bytes32 recipient_,
        address burnToken_,
        bytes32 destCaller_,
        uint256 maxFee_,
        uint32 finality_,
        bytes calldata hookData_
    ) external {
        IERC20(burnToken_).transferFrom(msg.sender, address(this), amount_);
        amount = amount_;
        destDomain = destDomain_;
        recipient = recipient_;
        burnToken = burnToken_;
        destCaller = destCaller_;
        maxFee = maxFee_;
        finality = finality_;
        hookData = hookData_;
    }
}

contract PayoutRouterTest is Base {
    MockTokenMessenger messenger;
    PayoutRouter router;
    bytes32 constant TO = bytes32(uint256(uint160(0xBEEF)));

    function setUp() public override {
        super.setUp();
        messenger = new MockTokenMessenger();
        router = new PayoutRouter(usdc, wrapper, claims, address(messenger));
        claims.setAllowlisted(address(router), true);
        fundA.setAllowlisted(address(router), true);
        vm.prank(holder);
        fundA.approve(address(router), type(uint256).max);
    }

    function test_sellAndBridgeBurnsWholePayoutWithForwarding() public {
        uint256 expected = vault.quoteFund(address(fundA), 10e18).payout;
        vm.prank(holder);
        uint256 payout = router.sellAndBridge(address(fundA), 10e18, 0, 6, TO, 60_000);
        assertEq(payout, expected);
        assertEq(messenger.amount(), payout);
        assertEq(messenger.destDomain(), 6);
        assertEq(messenger.recipient(), TO);
        assertEq(messenger.burnToken(), address(usdc));
        assertEq(messenger.destCaller(), bytes32(0));
        assertEq(messenger.maxFee(), 60_000);
        assertEq(messenger.finality(), 1000);
        assertEq(messenger.hookData(), hex"636374702d666f72776172640000000000000000000000000000000000000000");
        assertEq(usdc.balanceOf(address(router)), 0, "router keeps nothing");
        assertEq(fundA.balanceOf(address(router)), 0);
    }

    function test_sellerMustBeAllowlisted() public {
        fundA.setAllowlisted(stranger, true);
        fundA.mint(stranger, 1e18);
        vm.startPrank(stranger);
        fundA.approve(address(router), type(uint256).max);
        vm.expectRevert(abi.encodeWithSelector(PayoutRouter.NotAllowlisted.selector, stranger));
        router.sellAndBridge(address(fundA), 1e18, 0, 6, TO, 60_000);
        vm.stopPrank();
    }

    function test_feeMustBeBelowPayout() public {
        uint256 payout = vault.quoteFund(address(fundA), 1e15).payout;
        vm.prank(holder);
        vm.expectRevert(abi.encodeWithSelector(PayoutRouter.FeeTooHigh.selector, payout, payout));
        router.sellAndBridge(address(fundA), 1e15, 0, 6, TO, payout);
    }

    function test_zeroRecipientRejected() public {
        vm.prank(holder);
        vm.expectRevert(PayoutRouter.ZeroRecipient.selector);
        router.sellAndBridge(address(fundA), 1e18, 0, 6, bytes32(0), 60_000);
    }
}
