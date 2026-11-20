// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @dev The USYC Teller on Arc: subscribes USDC into USYC and redeems back, T+0.
interface IUsycTeller {
    function deposit(uint256 assets, address receiver) external returns (uint256 shares);
    function redeem(uint256 shares, address receiver, address account) external returns (uint256 assets);
    function previewRedeem(uint256 shares) external view returns (uint256 assets);
    function convertToShares(uint256 assets) external view returns (uint256 shares);
}

/// @notice Holds the vault's idle USDC as USYC (tokenized Treasury fund). It is
///         the only address that touches the Teller, so it is the one address
///         Circle allowlists, and it stays the same when the vault is
///         redeployed: the owner points it at the current vault.
contract UsycSleeve is Ownable {
    using SafeERC20 for IERC20;

    IERC20 public immutable usdc;
    IERC20 public immutable usyc;
    IUsycTeller public immutable teller;
    address public vault;

    event VaultSet(address indexed vault);
    event Subscribed(uint256 usdcIn, uint256 usycOut);
    event Redeemed(uint256 usycIn, uint256 usdcOut);

    error NotVault(address caller);

    constructor(IERC20 usdc_, IERC20 usyc_, address teller_) Ownable(msg.sender) {
        usdc = usdc_;
        usyc = usyc_;
        teller = IUsycTeller(teller_);
    }

    modifier onlyVault() {
        if (msg.sender != vault) revert NotVault(msg.sender);
        _;
    }

    function setVault(address vault_) external onlyOwner {
        vault = vault_;
        emit VaultSet(vault_);
    }

    /// @notice USDC value of the USYC held, at the Teller's redemption price.
    function value() public view returns (uint256) {
        uint256 bal = usyc.balanceOf(address(this));
        return bal == 0 ? 0 : teller.previewRedeem(bal);
    }

    /// @notice Pull `amount` USDC from the vault and subscribe it into USYC.
    function subscribe(uint256 amount) external onlyVault returns (uint256 shares) {
        usdc.safeTransferFrom(msg.sender, address(this), amount);
        usdc.forceApprove(address(teller), amount);
        shares = teller.deposit(amount, address(this));
        emit Subscribed(amount, shares);
    }

    /// @notice Redeem enough USYC for at least `amount` USDC (or everything held,
    ///         if worth less) and send the USDC to the vault.
    function withdrawUsdc(uint256 amount) external onlyVault returns (uint256 out) {
        uint256 bal = usyc.balanceOf(address(this));
        uint256 shares = teller.convertToShares(amount) + 1; // round up past the Teller's floor
        if (shares > bal) shares = bal;
        if (shares == 0) return 0;
        out = teller.redeem(shares, address(this), address(this));
        usdc.safeTransfer(msg.sender, out);
        emit Redeemed(shares, out);
    }
}
