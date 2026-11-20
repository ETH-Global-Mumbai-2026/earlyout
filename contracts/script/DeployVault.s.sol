// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {FundRegistry} from "../src/FundRegistry.sol";
import {NavOracle} from "../src/NavOracle.sol";
import {ClaimToken} from "../src/ClaimToken.sol";
import {ClaimWrapper} from "../src/ClaimWrapper.sol";
import {Vault} from "../src/Vault.sol";

/// Redeploys only the Vault against the contracts in deployments/arc-testnet.json
/// and points the wrapper at it. Run it with the owner's key: setVault and
/// setAllowlisted are owner-only. The old vault stays in place; its claims can
/// still be settled, since ClaimWrapper.redeem is open to any holder.
/// Env: VAULT_SEED_USDC (whole USDC, default 5).
contract DeployVault is Script {
    address constant USDC = 0x3600000000000000000000000000000000000000;

    function run() external returns (Vault vault) {
        string memory json = vm.readFile("./deployments/arc-testnet.json");
        FundRegistry registry = FundRegistry(vm.parseJsonAddress(json, ".FundRegistry"));
        NavOracle oracle = NavOracle(vm.parseJsonAddress(json, ".NavOracle"));
        ClaimToken claims = ClaimToken(vm.parseJsonAddress(json, ".ClaimToken"));
        ClaimWrapper wrapper = ClaimWrapper(vm.parseJsonAddress(json, ".ClaimWrapper"));
        address oldVault = vm.parseJsonAddress(json, ".Vault");
        uint256 seed = vm.envOr("VAULT_SEED_USDC", uint256(5)) * 1e6;

        require(wrapper.owner() == msg.sender, "signer must own ClaimWrapper");
        require(claims.owner() == msg.sender, "signer must own ClaimToken");

        vm.startBroadcast();
        vault = new Vault(IERC20(USDC), registry, oracle, claims, wrapper);
        wrapper.setVault(address(vault));
        claims.setAllowlisted(address(vault), true);
        if (seed > 0) {
            IERC20(USDC).approve(address(vault), seed);
            vault.deposit(seed, msg.sender);
        }
        vm.stopBroadcast();

        console.log("VAULT=%s", address(vault));
        console.log("VAULT_V1=%s", oldVault);
    }
}
