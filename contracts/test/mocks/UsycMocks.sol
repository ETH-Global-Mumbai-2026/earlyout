// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract MockUsyc is ERC20("USYC", "USYC") {
    function decimals() public pure override returns (uint8) {
        return 6;
    }

    function mint(address to, uint256 a) external {
        _mint(to, a);
    }

    function burn(address from, uint256 a) external {
        _burn(from, a);
    }
}

/// @dev Teller with a fixed price of 1.1 USDC per USYC, like the Arc testnet one.
contract MockTeller {
    IERC20 public immutable asset;
    MockUsyc public immutable share;
    uint256 public price = 1.1e18;

    constructor(IERC20 usdc, MockUsyc usyc) {
        asset = usdc;
        share = usyc;
    }

    function setPrice(uint256 p) external {
        price = p;
    }

    /// @dev Redemption fee in bps, taken from what `redeem` pays out (previewRedeem ignores it).
    uint256 public redeemFeeBps;

    function setRedeemFee(uint256 bps) external {
        redeemFeeBps = bps;
    }

    function deposit(uint256 assets, address receiver) external returns (uint256 shares) {
        asset.transferFrom(msg.sender, address(this), assets);
        shares = assets * 1e18 / price;
        share.mint(receiver, shares);
    }

    function redeem(uint256 shares, address receiver, address account) external returns (uint256 assets) {
        require(account == msg.sender, "account");
        share.burn(account, shares);
        assets = previewRedeem(shares) * (10_000 - redeemFeeBps) / 10_000;
        asset.transfer(receiver, assets);
    }

    function previewRedeem(uint256 shares) public view returns (uint256) {
        return shares * price / 1e18;
    }

    function convertToShares(uint256 assets) external view returns (uint256) {
        return assets * 1e18 / price;
    }
}
