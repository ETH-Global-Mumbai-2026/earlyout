// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Base} from "./Base.t.sol";
import {NavOracle} from "../src/NavOracle.sol";
import {IReceiver} from "../src/interfaces/IReceiver.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";

contract NavOracleTest is Base {
    function test_rejectsNonForwarder() public {
        vm.prank(stranger);
        vm.expectRevert(abi.encodeWithSelector(NavOracle.InvalidSender.selector, stranger));
        oracle.onReport("", abi.encode(address(fundA), uint256(1e8), uint8(8), uint64(block.timestamp), uint8(0)));
    }

    function test_normalises6_8_18Decimals() public {
        address f6 = makeAddr("f6");
        address f8 = makeAddr("f8");
        address f18 = makeAddr("f18");
        uint64 t = uint64(block.timestamp);
        pushNav(f6, 11_268694, 6, t, 0); // USTB style
        pushNav(f8, 1_02783700, 8, t, 0); // mGLOBAL style
        pushNav(f18, 1_034440_000000000000, 18, t, 0); // USPC style
        (uint256 n6,,) = oracle.getNav(f6);
        (uint256 n8,,) = oracle.getNav(f8);
        (uint256 n18,,) = oracle.getNav(f18);
        assertEq(n6, 11_268694 * 1e12);
        assertEq(n8, 1_02783700 * 1e10);
        assertEq(n18, 1_034440_000000000000);
    }

    function test_equalTimestampAccepted_statusFlips() public {
        (, uint64 at,) = oracle.getNav(address(fundA));
        pushNav(address(fundA), NAV_A, 8, at, 1);
        (,, uint8 status) = oracle.getNav(address(fundA));
        assertEq(status, 1);
    }

    function test_olderTimestampRejected() public {
        (, uint64 at,) = oracle.getNav(address(fundA));
        vm.prank(forwarder);
        vm.expectRevert(abi.encodeWithSelector(NavOracle.StaleReport.selector, address(fundA), at - 1, at));
        oracle.onReport("", abi.encode(address(fundA), NAV_A, uint8(8), at - 1, uint8(0)));
    }

    function test_badStatusRejected() public {
        vm.prank(forwarder);
        vm.expectRevert(abi.encodeWithSelector(NavOracle.BadStatus.selector, uint8(2)));
        oracle.onReport("", abi.encode(address(fundA), NAV_A, uint8(8), uint64(block.timestamp), uint8(2)));
    }

    function test_supportsInterface() public view {
        assertTrue(oracle.supportsInterface(type(IReceiver).interfaceId));
        assertTrue(oracle.supportsInterface(type(IERC165).interfaceId));
        assertFalse(oracle.supportsInterface(0xdeadbeef));
    }

    function test_onlyOwnerSetsForwarder() public {
        vm.prank(stranger);
        vm.expectRevert();
        oracle.setForwarder(stranger);
        oracle.setForwarder(stranger);
        assertEq(oracle.forwarder(), stranger);
    }
}
