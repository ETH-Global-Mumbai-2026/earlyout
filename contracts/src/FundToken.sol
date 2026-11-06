// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @notice Stand-in for a tokenized fund share. Real ones only move between
///         issuer-approved wallets, so transfers here are allowlisted too.
contract FundToken is ERC20, Ownable {
    mapping(address => bool) public allowlisted;

    event Allowlisted(address indexed account, bool allowed);

    error NotAllowlisted(address account);

    constructor(string memory name_, string memory symbol_) ERC20(name_, symbol_) Ownable(msg.sender) {}

    function setAllowlisted(address account, bool allowed) external onlyOwner {
        allowlisted[account] = allowed;
        emit Allowlisted(account, allowed);
    }

    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    function _update(address from, address to, uint256 value) internal override {
        if (from != address(0) && to != address(0)) {
            if (!allowlisted[from]) revert NotAllowlisted(from);
            if (!allowlisted[to]) revert NotAllowlisted(to);
        }
        super._update(from, to, value);
    }
}
