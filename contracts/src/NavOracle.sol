// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {IReceiver} from "./interfaces/IReceiver.sol";

/// @notice Receives NAV and issuer status reports from the Chainlink CRE
///         forwarder. Any address can be set as forwarder, so a script can
///         stand in for CRE until the workflow is live.
contract NavOracle is IReceiver, Ownable {
    struct NavData {
        uint256 nav; // normalised to 18 decimals
        uint64 updatedAt;
        uint8 status; // 0 = OK, 1 = FAILED
    }

    uint8 public constant STATUS_OK = 0;
    uint8 public constant STATUS_FAILED = 1;

    /// @notice Largest amount a report's updatedAt may sit ahead of block.timestamp.
    ///         A far-future stamp would become the stored lower bound and block
    ///         every later correction, so anything beyond clock skew is refused.
    uint64 public constant MAX_FUTURE_DRIFT = 5 minutes;

    address public forwarder;
    /// @notice When set, only reports whose forwarder metadata names this
    ///         workflow owner are accepted. Zero disables the check.
    address public expectedWorkflowOwner;
    /// @notice When set, only reports from this exact workflow id are accepted.
    ///         Zero disables the check.
    bytes32 public expectedWorkflowId;
    mapping(address => NavData) private _data;

    event ForwarderUpdated(address indexed forwarder);
    event ExpectedWorkflowOwnerUpdated(address indexed workflowOwner);
    event ExpectedWorkflowIdUpdated(bytes32 indexed workflowId);
    event NavUpdated(address indexed fund, uint256 nav, uint64 updatedAt, uint8 status);

    error InvalidSender(address sender);
    error StaleReport(address fund, uint64 incoming, uint64 stored);
    error BadStatus(uint8 status);
    error BadDecimals(uint8 decimals);
    error FutureReport(address fund, uint64 incoming, uint64 maxAllowed);
    error BadMetadata(uint256 length);
    error InvalidWorkflowOwner(address workflowOwner);
    error InvalidWorkflowId(bytes32 workflowId);

    constructor(address forwarder_) Ownable(msg.sender) {
        forwarder = forwarder_;
        emit ForwarderUpdated(forwarder_);
    }

    function setForwarder(address forwarder_) external onlyOwner {
        forwarder = forwarder_;
        emit ForwarderUpdated(forwarder_);
    }

    /// @notice Pin reports to one workflow owner. The CRE forwarder is shared by
    ///         every workflow, so the sender check alone does not say whose report
    ///         this is. Leave at zero while using the permissionless simulation
    ///         forwarder, set it before pointing at the deployed forwarder.
    function setExpectedWorkflowOwner(address workflowOwner) external onlyOwner {
        expectedWorkflowOwner = workflowOwner;
        emit ExpectedWorkflowOwnerUpdated(workflowOwner);
    }

    /// @notice Pin reports to one workflow id (changes on every workflow redeploy).
    function setExpectedWorkflowId(bytes32 workflowId) external onlyOwner {
        expectedWorkflowId = workflowId;
        emit ExpectedWorkflowIdUpdated(workflowId);
    }

    /// @param metadata forwarder metadata: abi.encodePacked(bytes32 workflowId, bytes10 workflowName,
    ///        address workflowOwner, bytes2 reportId). Only checked when an expected owner or id is set.
    /// @param report abi.encode(address fund, uint256 nav, uint8 navDecimals, uint64 updatedAt, uint8 status)
    function onReport(bytes calldata metadata, bytes calldata report) external override {
        if (msg.sender != forwarder) revert InvalidSender(msg.sender);
        _checkWorkflow(metadata);
        (address fund, uint256 nav, uint8 navDecimals, uint64 updatedAt, uint8 status) =
            abi.decode(report, (address, uint256, uint8, uint64, uint8));
        if (status > STATUS_FAILED) revert BadStatus(status);
        if (navDecimals > 36) revert BadDecimals(navDecimals);

        NavData storage d = _data[fund];
        if (updatedAt < d.updatedAt) revert StaleReport(fund, updatedAt, d.updatedAt);
        if (updatedAt > block.timestamp + MAX_FUTURE_DRIFT) {
            revert FutureReport(fund, updatedAt, uint64(block.timestamp) + MAX_FUTURE_DRIFT);
        }

        uint256 normalised = navDecimals <= 18 ? nav * (10 ** (18 - navDecimals)) : nav / (10 ** (navDecimals - 18));

        d.nav = normalised;
        d.updatedAt = updatedAt;
        d.status = status;
        emit NavUpdated(fund, normalised, updatedAt, status);
    }

    function _checkWorkflow(bytes calldata metadata) private view {
        address wantOwner = expectedWorkflowOwner;
        bytes32 wantId = expectedWorkflowId;
        if (wantOwner == address(0) && wantId == bytes32(0)) return;
        if (metadata.length < 62) revert BadMetadata(metadata.length);
        if (wantId != bytes32(0)) {
            bytes32 id = bytes32(metadata[0:32]);
            if (id != wantId) revert InvalidWorkflowId(id);
        }
        if (wantOwner != address(0)) {
            address wo = address(bytes20(metadata[42:62]));
            if (wo != wantOwner) revert InvalidWorkflowOwner(wo);
        }
    }

    function getNav(address fund) external view returns (uint256 nav, uint64 updatedAt, uint8 status) {
        NavData storage d = _data[fund];
        return (d.nav, d.updatedAt, d.status);
    }

    function supportsInterface(bytes4 interfaceId) public pure override returns (bool) {
        return interfaceId == type(IReceiver).interfaceId || interfaceId == type(IERC165).interfaceId;
    }
}
