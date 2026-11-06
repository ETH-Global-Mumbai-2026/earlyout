// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Base} from "./Base.t.sol";
import {FundToken} from "../src/FundToken.sol";

contract FundTokenTest is Base {
    function test_transferToNonAllowlistedReverts() public {
        vm.prank(holder);
        vm.expectRevert(abi.encodeWithSelector(FundToken.NotAllowlisted.selector, stranger));
        fundA.transfer(stranger, 1e18);
    }

    function test_transferBetweenAllowlistedWorks() public {
        fundA.setAllowlisted(stranger, true);
        vm.prank(holder);
        fundA.transfer(stranger, 1e18);
        assertEq(fundA.balanceOf(stranger), 1e18);
    }

    function test_onlyOwnerMints() public {
        vm.prank(stranger);
        vm.expectRevert();
        fundA.mint(stranger, 1);
    }
}
