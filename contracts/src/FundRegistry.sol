// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @notice Listed funds and their pricing terms. Max 10 funds so the vault
///         can sum exposure in a bounded loop.
contract FundRegistry is Ownable {
    struct Terms {
        bool listed;
        uint64 settlementDelay; // seconds from request to payout
        uint64 window; // payout dates are rounded up to this step (seconds)
        uint64 maxAge; // NAV older than this halts trading (seconds)
        uint16 volBps; // volatility term, scaled by sqrt(years to payout)
        uint16 creditBps; // issuer credit term
        uint16 recoveryBps; // value of claims after impairment, in bps of cost
        uint256 exposureCapUsdc; // max USDC the vault may deploy into this fund (6dp)
        string symbol;
    }

    uint256 public constant MAX_FUNDS = 10;

    uint16 public baseBps;
    uint16 public utilSlopeBps;

    address[] private _funds;
    mapping(address => Terms) private _terms;

    event FundListed(address indexed fund, string symbol);
    event TermsUpdated(address indexed fund);
    event GlobalsUpdated(uint16 baseBps, uint16 utilSlopeBps);

    error TooManyFunds();
    error NotListed(address fund);
    error BadTerms();

    constructor(uint16 baseBps_, uint16 utilSlopeBps_) Ownable(msg.sender) {
        baseBps = baseBps_;
        utilSlopeBps = utilSlopeBps_;
    }

    function listFund(address fund, Terms calldata t) external onlyOwner {
        if (!_terms[fund].listed) {
            if (_funds.length >= MAX_FUNDS) revert TooManyFunds();
            _funds.push(fund);
            emit FundListed(fund, t.symbol);
        }
        _setTerms(fund, t);
    }

    function setTerms(address fund, Terms calldata t) external onlyOwner {
        if (!_terms[fund].listed) revert NotListed(fund);
        _setTerms(fund, t);
    }

    function setGlobals(uint16 baseBps_, uint16 utilSlopeBps_) external onlyOwner {
        baseBps = baseBps_;
        utilSlopeBps = utilSlopeBps_;
        emit GlobalsUpdated(baseBps_, utilSlopeBps_);
    }

    function _setTerms(address fund, Terms calldata t) private {
        if (t.recoveryBps > 10_000 || t.settlementDelay == 0) revert BadTerms();
        _terms[fund] = t;
        _terms[fund].listed = true;
        emit TermsUpdated(fund);
    }

    function isListed(address fund) external view returns (bool) {
        return _terms[fund].listed;
    }

    function getTerms(address fund) external view returns (Terms memory) {
        return _terms[fund];
    }

    function fundCount() external view returns (uint256) {
        return _funds.length;
    }

    function fundAt(uint256 i) external view returns (address) {
        return _funds[i];
    }

    function funds() external view returns (address[] memory) {
        return _funds;
    }
}
