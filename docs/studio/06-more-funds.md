# 06: eight more fund stand-ins

Prompt sent to Arc Studio on 7 November 2026 (`arc-studio run`, same app and Circle developer-controlled wallet as the first deploy). The script Studio wrote is `docs/studio/deploy-earlyout-funds.ts`.

## Prompt

Deploy eight more fund stand-ins for Earlyout on Arc Testnet, from the same Circle developer-controlled wallet you used for the first deploy (state in contracts/deployments/.earlyout-state.json). Do not change any contract.

Why: each of these funds publishes its NAV through a Chainlink NAVLink feed on Ethereum mainnet. The real fund tokens only move between issuer-approved wallets, so Earlyout lists a FundToken stand-in for each and prices it from the real Chainlink NAV.

1. Write scripts/deploy-earlyout-funds.ts. Reuse the wallet, deployContract and call helpers from scripts/deploy-earlyout.ts, but keep progress in a separate file, contracts/deployments/.earlyout-funds-state.json, so a re-run resumes and the first deploy's state is untouched.

2. Deploy contracts/FundToken.sol eight times, constructor (name, symbol), in this order:
   JAAA      "Janus Henderson Anemoy AAA CLO Fund (stand-in)"
   JTRSY     "Janus Henderson Anemoy Treasury Fund (stand-in)"
   USTB      "Superstate Short Duration US Government Securities Fund (stand-in)"
   USCC      "Superstate Crypto Carry Fund (stand-in)"
   USTBL     "Spiko US T-Bills Money Market Fund (stand-in)"
   SAFO      "Spiko Amundi Overnight Swap Fund (stand-in)"
   CASH+     "Asseto CASH+ Money Market Fund (stand-in)"
   Treasury+ "EPOCH Treasury+ Fund (stand-in)"

3. For each token, in this order:
   setAllowlisted(true) for 0xbc832e4FC6a9CBd9c35884Bc744e6499cBFf537B (demo holder), 0xfc7E6ECF94e88E050c73733aC3cf03f831115952 (ClaimWrapper) and 0x2b492aD36D8BB7BA6341a06AF76f1614A9516Ebe (IssuerStub);
   mint(0xbc832e4FC6a9CBd9c35884Bc744e6499cBFf537B, 1000000000000000000);
   transferOwnership(0xbc832e4FC6a9CBd9c35884Bc744e6499cBFf537B).
   After the run the platform wallet must own nothing. Do not call FundRegistry or NavOracle; our ops wallet owns them and will list the funds.

4. Write contracts/deployments/arc-testnet-funds.json: { chainId, block, funds: [{ symbol, name, address, deployTx }] }.

5. Verify on chain and report a table: symbol, address (explorer link), deploy tx (explorer link), name(), owner() (must be 0xbc832e4FC6a9CBd9c35884Bc744e6499cBFf537B), balanceOf(demo holder) (must be 1e18), allowlisted for all three addresses (must be true). Also report the deployer wallet's remaining USDC.

Never print any private key, API key or entity secret.

## Result

All 48 transactions confirmed (8 deploys, then three allowlist calls, a mint and an ownership transfer per token). Studio verified owner, name, balance and allowlist for each token on chain; deployer balance afterwards 4.317871 USDC.

| Symbol | Address | Deploy tx |
|---|---|---|
| JAAA | [`0x7ED73c4653aCf10830f2c5811349bc1d6bF012e1`](https://explorer.testnet.arc.io/address/0x7ED73c4653aCf10830f2c5811349bc1d6bF012e1) | [`0x50ce5222…`](https://explorer.testnet.arc.io/tx/0x50ce522234e26b921cd7e8c42d48f682fced7e8ec2eefe750cda961ac919cd50) |
| JTRSY | [`0xAc28d2d4902a705f33C43816599BCaFD3bb194b3`](https://explorer.testnet.arc.io/address/0xAc28d2d4902a705f33C43816599BCaFD3bb194b3) | [`0x965c89c4…`](https://explorer.testnet.arc.io/tx/0x965c89c4013aebd2c6e57b8a7216e214e2ceb4684e9e54efeed8de71efab3d48) |
| USTB | [`0x09367DC8779b7462f41d21ff2782c15D73f7B7D5`](https://explorer.testnet.arc.io/address/0x09367DC8779b7462f41d21ff2782c15D73f7B7D5) | [`0xe966b7b1…`](https://explorer.testnet.arc.io/tx/0xe966b7b13c050af847ce457baa0925616974065e04fbff1eaf995577429220a3) |
| USCC | [`0x3ff6d44727Cddd81271ca00A1e590818a24Ea3c9`](https://explorer.testnet.arc.io/address/0x3ff6d44727Cddd81271ca00A1e590818a24Ea3c9) | [`0x2a40f29c…`](https://explorer.testnet.arc.io/tx/0x2a40f29c6e7e413e0d07ed4e217813fc509b0ecfd05ab2785a583d9ac4c73bac) |
| USTBL | [`0x577Ed63097665601609fC9381Ca229F15AeD30B6`](https://explorer.testnet.arc.io/address/0x577Ed63097665601609fC9381Ca229F15AeD30B6) | [`0x3c0967ad…`](https://explorer.testnet.arc.io/tx/0x3c0967adf8260b3d17f7818c86878a693b3fe116d1fff78ac2e5fc8515a9fc42) |
| SAFO | [`0x5F10C72fF50fB94348d0F16234551f6872a857a2`](https://explorer.testnet.arc.io/address/0x5F10C72fF50fB94348d0F16234551f6872a857a2) | [`0x8b9e5db0…`](https://explorer.testnet.arc.io/tx/0x8b9e5db0445fa33314da6a475762ba1cf55d9050a53593f7d7eb5686b075316c) |
| CASH+ | [`0x1869711fde2e7d089F3058228cF3AFF4C16a9658`](https://explorer.testnet.arc.io/address/0x1869711fde2e7d089F3058228cF3AFF4C16a9658) | [`0x29c87fc3…`](https://explorer.testnet.arc.io/tx/0x29c87fc3dbcef643db9de2e71335a07f60bf91be458d72610b88bd344605f92b) |
| Treasury+ | [`0xf767D26EE85e09389f410F28728f0Ddca37610e8`](https://explorer.testnet.arc.io/address/0xf767D26EE85e09389f410F28728f0Ddca37610e8) | [`0x01427122…`](https://explorer.testnet.arc.io/tx/0x014271228a9c6ddf2a3ed02148b84dfdcb01b6386b5ae616c3cd87471d97b88c) |

The ops wallet then called `FundRegistry.listFund` for each and reported its Chainlink NAV through `NavOracle.onReport`:

```
JAAA listFund 0xf2a12e5d056e8790fffa0bb6d041b0f136a80c93c4ea4c593b3775afa4949918 0x1
JAAA NAV 1055506/1e6 0x39d9ebab258c75ea854811059b33042d9cc7303ce88aef3635ba68c5a7b15876 0x1
JTRSY listFund 0x2381051fc125ff10905bf806486f28a8e9bcc8d7cd5065dfdf5048eb521a41b2 0x1
JTRSY NAV 1121860/1e6 0x59a8f39c15c97968ebc425b733cb2f7e32a0646681de48fabb682518843b6ee5 0x1
USTB listFund 0xe7e7d476d1539f689f51a9e2700d023cd531efd5f9c5689b8c3472dd999c8c66 0x1
USTB NAV 11269831/1e6 0x394914bd7ce887a54b444c11803cf2d404bdbc2a7793f3b9bd963609f5c90988 0x1
USCC listFund 0x639c0e91eefa27d7cf2d795604cc9661fd8870401517f6ee409a8c1aa23d2efe 0x1
USCC NAV 11820952/1e6 0x1700eeabcb189522fa7ca3c23740a4df02e2647f0c829969c1b9df0ad5bc7923 0x1
USTBL listFund 0x411f494c00d72dac316c1bc48b208d6c5df1a46b29ec0a1df0702df9606fc422 0x1
USTBL NAV 1102123/1e6 0x2cfcb0f3e41acb8b892ad1fc0bce941b9c6d06aa447ae2e5b4ab99cd20d66653 0x1
SAFO listFund 0x2db6482e515d460380f3c8cc7731ca77ace86e01ce1f73bea2f3e128e0979fe1 0x1
SAFO NAV 1027272/1e6 0x44176fac95fc4df1ee70cdd67e59301a73906497e4a4d40a2d955a56a16c05dd 0x1
CASH+ listFund 0x8bd228b7c36e280ac2bae841563bdec17c2cb84dea22adc1f7b1de4f868ed4bb 0x1
CASH+ NAV 110297000000000000000/1e18 0x7eabfe7908b89f961465e45ba79d456dcec5d85593c823403733dabb0a81b322 0x1
Treasury+ listFund 0x61ec5b142586754760e630a5f5f8d1e79452bac5755d434f5fdda63c6326b0d4 0x1
Treasury+ NAV 931284400000000000000/1e18 0x3a1454f8e6786cda141d0227dbef3ae8a91cd4bb9f63b91810e41d6f63e177c3 0x1
```
