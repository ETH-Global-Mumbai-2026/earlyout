// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC1155} from "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import {ERC1155Supply} from "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Supply.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @notice One token id per (fund, payout date). Minted by ClaimWrapper only.
///         Transfers only between allowlisted addresses.
contract ClaimToken is ERC1155Supply, Ownable {
    struct Meta {
        address fund;
        uint64 settleAt;
    }

    address public wrapper;
    mapping(address => bool) public allowlisted;
    mapping(uint256 => Meta) private _meta;

    event WrapperSet(address indexed wrapper);
    event Allowlisted(address indexed account, bool allowed);

    error OnlyWrapper();
    error WrapperAlreadySet();
    error NotAllowlisted(address account);

    constructor() ERC1155("") Ownable(msg.sender) {}

    function setWrapper(address wrapper_) external onlyOwner {
        if (wrapper != address(0)) revert WrapperAlreadySet();
        wrapper = wrapper_;
        emit WrapperSet(wrapper_);
    }

    function setAllowlisted(address account, bool allowed) external onlyOwner {
        allowlisted[account] = allowed;
        emit Allowlisted(account, allowed);
    }

    function claimId(address fund, uint64 settleAt) public pure returns (uint256) {
        return uint256(keccak256(abi.encode(fund, settleAt)));
    }

    function meta(uint256 id) external view returns (address fund, uint64 settleAt) {
        Meta storage m = _meta[id];
        return (m.fund, m.settleAt);
    }

    function mint(address to, address fund, uint64 settleAt, uint256 amount) external returns (uint256 id) {
        if (msg.sender != wrapper) revert OnlyWrapper();
        id = claimId(fund, settleAt);
        if (_meta[id].fund == address(0)) _meta[id] = Meta(fund, settleAt);
        _mint(to, id, amount, "");
    }

    function burn(address from, uint256 id, uint256 amount) external {
        if (msg.sender != wrapper) revert OnlyWrapper();
        _burn(from, id, amount);
    }

    function _update(address from, address to, uint256[] memory ids, uint256[] memory values)
        internal
        override(ERC1155Supply)
    {
        if (from != address(0) && to != address(0)) {
            if (!allowlisted[from]) revert NotAllowlisted(from);
            if (!allowlisted[to]) revert NotAllowlisted(to);
        }
        super._update(from, to, ids, values);
    }
}
