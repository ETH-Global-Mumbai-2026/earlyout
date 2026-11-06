// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {FundToken} from "../src/FundToken.sol";
import {FundRegistry} from "../src/FundRegistry.sol";
import {NavOracle} from "../src/NavOracle.sol";
import {IssuerStub} from "../src/IssuerStub.sol";
import {ClaimToken} from "../src/ClaimToken.sol";
import {ClaimWrapper} from "../src/ClaimWrapper.sol";
import {Vault} from "../src/Vault.sol";

/// Deploys Earlyout to Arc testnet.
/// Env: NEW_OWNER (takes ownership and the oracle forwarder role after deploy),
///      DEMO_HOLDER (gets demo fund tokens), EXPOSURE_CAP_USDC, VAULT_SEED_USDC,
///      ISSUER_FUND_USDC (whole USDC, defaults 20 / 5 / 10), INITIAL_NAV_8DP (default 111377320000).
contract Deploy is Script {
    address constant USDC = 0x3600000000000000000000000000000000000000;

    struct Deployed {
        FundRegistry registry;
        NavOracle oracle;
        IssuerStub issuer;
        ClaimToken claims;
        ClaimWrapper wrapper;
        Vault vault;
        FundToken fundA;
        FundToken fundB;
    }

    struct Params {
        address deployer;
        address newOwner;
        address demoHolder;
        uint256 cap;
        uint256 seed;
        uint256 issuerFund;
        uint256 nav8;
        uint64 navUpdatedAt; // use the feed's own updatedAt so real reports are not rejected as older
    }

    function run() external {
        Params memory p;
        p.deployer = msg.sender;
        p.newOwner = vm.envOr("NEW_OWNER", p.deployer);
        p.demoHolder = vm.envOr("DEMO_HOLDER", p.newOwner);
        p.cap = vm.envOr("EXPOSURE_CAP_USDC", uint256(20)) * 1e6;
        p.seed = vm.envOr("VAULT_SEED_USDC", uint256(5)) * 1e6;
        p.issuerFund = vm.envOr("ISSUER_FUND_USDC", uint256(10)) * 1e6;
        p.nav8 = vm.envOr("INITIAL_NAV_8DP", uint256(111377320000));
        p.navUpdatedAt = uint64(vm.envOr("INITIAL_NAV_UPDATED_AT", block.timestamp));

        vm.startBroadcast();
        Deployed memory d = _deploy(p);
        _configure(d, p);
        _fund(d, p);
        _handOver(d, p);
        vm.stopBroadcast();

        _write(d, p);
    }

    function _deploy(Params memory p) internal returns (Deployed memory d) {
        d.registry = new FundRegistry(50, 300);
        d.oracle = new NavOracle(p.deployer);
        d.issuer = new IssuerStub(IERC20(USDC), d.registry, d.oracle);
        d.claims = new ClaimToken();
        d.wrapper = new ClaimWrapper(IERC20(USDC), d.registry, d.issuer, d.claims);
        d.vault = new Vault(IERC20(USDC), d.registry, d.oracle, d.claims, d.wrapper);
        d.claims.setWrapper(address(d.wrapper));
        d.wrapper.setVault(address(d.vault));
        d.fundA = new FundToken("Apollo Diversified Credit (stand-in)", "ACRED");
        d.fundB = new FundToken("ACRED demo window", "ACREDd");
    }

    function _configure(Deployed memory d, Params memory p) internal {
        d.registry.listFund(address(d.fundA), _terms("ACRED", 90 days, 1 days, p.cap));
        d.registry.listFund(address(d.fundB), _terms("ACREDd", 15 minutes, 5 minutes, p.cap));

        address[3] memory allow = [p.demoHolder, address(d.wrapper), address(d.issuer)];
        for (uint256 i; i < 3; i++) {
            d.fundA.setAllowlisted(allow[i], true);
            d.fundB.setAllowlisted(allow[i], true);
        }
        d.claims.setAllowlisted(p.demoHolder, true);
        d.claims.setAllowlisted(address(d.wrapper), true);
        d.claims.setAllowlisted(address(d.vault), true);
        d.fundA.mint(p.demoHolder, 1e18);
        d.fundB.mint(p.demoHolder, 1e18);

        uint64 now_ = p.navUpdatedAt;
        d.oracle.onReport("", abi.encode(address(d.fundA), p.nav8, uint8(8), now_, uint8(0)));
        d.oracle.onReport("", abi.encode(address(d.fundB), p.nav8, uint8(8), now_, uint8(0)));
    }

    function _fund(Deployed memory d, Params memory p) internal {
        if (p.seed > 0) {
            IERC20(USDC).approve(address(d.vault), p.seed);
            d.vault.deposit(p.seed, p.deployer);
        }
        if (p.issuerFund > 0) IERC20(USDC).transfer(address(d.issuer), p.issuerFund);
    }

    function _handOver(Deployed memory d, Params memory p) internal {
        if (p.newOwner == p.deployer) return;
        d.oracle.setForwarder(p.newOwner);
        d.registry.transferOwnership(p.newOwner);
        d.oracle.transferOwnership(p.newOwner);
        d.issuer.transferOwnership(p.newOwner);
        d.claims.transferOwnership(p.newOwner);
        d.wrapper.transferOwnership(p.newOwner);
        d.vault.transferOwnership(p.newOwner);
        d.fundA.transferOwnership(p.newOwner);
        d.fundB.transferOwnership(p.newOwner);
    }

    function _write(Deployed memory d, Params memory p) internal {
        string memory json = "deployment";
        vm.serializeUint(json, "chainId", block.chainid);
        vm.serializeUint(json, "block", block.number);
        vm.serializeAddress(json, "FundRegistry", address(d.registry));
        vm.serializeAddress(json, "NavOracle", address(d.oracle));
        vm.serializeAddress(json, "IssuerStub", address(d.issuer));
        vm.serializeAddress(json, "ClaimToken", address(d.claims));
        vm.serializeAddress(json, "ClaimWrapper", address(d.wrapper));
        vm.serializeAddress(json, "Vault", address(d.vault));
        vm.serializeAddress(json, "FundA_ACRED", address(d.fundA));
        vm.serializeAddress(json, "FundB_ACREDd", address(d.fundB));
        vm.serializeAddress(json, "owner", p.newOwner);
        string memory out = vm.serializeAddress(json, "deployer", p.deployer);
        vm.writeJson(out, "./deployments/arc-testnet.json");

        console.log("FUND_REGISTRY=%s", address(d.registry));
        console.log("NAV_ORACLE=%s", address(d.oracle));
        console.log("ISSUER_STUB=%s", address(d.issuer));
        console.log("CLAIM_TOKEN=%s", address(d.claims));
        console.log("CLAIM_WRAPPER=%s", address(d.wrapper));
        console.log("VAULT=%s", address(d.vault));
        console.log("FUND_A=%s", address(d.fundA));
        console.log("FUND_B=%s", address(d.fundB));
    }

    function _terms(string memory symbol, uint64 delay, uint64 window, uint256 cap) internal pure returns (FundRegistry.Terms memory) {
        return FundRegistry.Terms({
            listed: true,
            settlementDelay: delay,
            window: window,
            maxAge: 96 hours,
            volBps: 800,
            creditBps: 150,
            recoveryBps: 4000,
            exposureCapUsdc: cap,
            symbol: symbol
        });
    }
}
