Deploy Earlyout to Arc Testnet from this workspace. The contracts and tests are the ones you reviewed and fixed in the previous turn; do not change any contract.

I am sending an updated contracts/script/Deploy.s.sol (round-trip). It differs from the workspace copy only in that the initial NAV report takes its timestamp from INITIAL_NAV_UPDATED_AT, so later real Chainlink reports are not rejected as older.

About the deployer wallet: you said Studio deploys from a shared platform wallet that cannot make owner calls afterwards. That is fine here, because the script hands everything over at the end of the same run: it sets NavOracle's forwarder to NEW_OWNER and calls transferOwnership(NEW_OWNER) on all eight Ownable contracts. After the run the platform wallet owns nothing.

Steps:
1. forge build and forge test. All 63 tests must still pass.
2. Run contracts/script/Deploy.s.sol on Arc Testnet with these environment values:
   NEW_OWNER=0xbc832e4FC6a9CBd9c35884Bc744e6499cBFf537B
   DEMO_HOLDER=0xbc832e4FC6a9CBd9c35884Bc744e6499cBFf537B
   EXPOSURE_CAP_USDC=20
   VAULT_SEED_USDC=0
   ISSUER_FUND_USDC=0
   INITIAL_NAV_8DP=111377320000
   INITIAL_NAV_UPDATED_AT=1793916047
   Keep VAULT_SEED_USDC and ISSUER_FUND_USDC at 0: Arc's USDC calls a blocklist precompile that Foundry's local simulation cannot execute, and we will fund those two from our own wallet afterwards.
3. After the run, verify on chain and report: owner() of every contract equals 0xbc832e4FC6a9CBd9c35884Bc744e6499cBFf537B; NavOracle.forwarder() equals the same address; FundRegistry.funds() returns the two fund tokens; Vault.quoteFund(<ACREDd>, 1000000000000000) returns verdict 0 (BUY).
4. Report every deployed address with its explorer link and deploy transaction, and the contents of contracts/deployments/arc-testnet.json.

Never print any private key.
