// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Base} from "./Base.t.sol";
import {ClaimToken} from "../src/ClaimToken.sol";

contract ClaimTokenTest is Base {
    function test_idIsHashOfFundAndDate() public view {
        assertEq(claims.claimId(address(fundA), 123), uint256(keccak256(abi.encode(address(fundA), uint64(123)))));
    }

    function test_onlyWrapperMints() public {
        vm.prank(stranger);
        vm.expectRevert(ClaimToken.OnlyWrapper.selector);
        claims.mint(stranger, address(fundA), 1, 1);
    }

    function test_transferToNonAllowlistedReverts() public {
        uint256 id = depositA(1e18);
        vm.prank(holder);
        vm.expectRevert(abi.encodeWithSelector(ClaimToken.NotAllowlisted.selector, stranger));
        claims.safeTransferFrom(holder, stranger, id, 1e18, "");
    }

    function test_transferBetweenAllowlistedWorks() public {
        uint256 id = depositA(1e18);
        vm.prank(holder);
        claims.safeTransferFrom(holder, buyer, id, 1e18, "");
        assertEq(claims.balanceOf(buyer, id), 1e18);
    }

    function test_wrapperSetOnce() public {
        vm.expectRevert(ClaimToken.WrapperAlreadySet.selector);
        claims.setWrapper(stranger);
    }
}
