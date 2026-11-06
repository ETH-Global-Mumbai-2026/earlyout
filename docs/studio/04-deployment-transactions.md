# Earlyout deployment, Arc Testnet (chain 5042002)

Deployer wallet: [0xC9007Afa7c9eCd6b0D9da62e3B820f69F730aFf3](https://explorer.testnet.arc.io/address/0xC9007Afa7c9eCd6b0D9da62e3B820f69F730aFf3) (Circle developer-controlled, yours). Owner and oracle forwarder: [0xbc83...537B](https://explorer.testnet.arc.io/address/0xbc832e4FC6a9CBd9c35884Bc744e6499cBFf537B).

## Contracts

| Contract | Address | Deploy transaction |
|---|---|---|
| FundRegistry | [0x634697188F17eC1064f6e9A0aE000a504983dCe4](https://explorer.testnet.arc.io/address/0x634697188F17eC1064f6e9A0aE000a504983dCe4) | [0xaee277c5d705aa62343818e0d7e3a1e8d41736d17cfc072e3f854620c2f5a1aa](https://explorer.testnet.arc.io/tx/0xaee277c5d705aa62343818e0d7e3a1e8d41736d17cfc072e3f854620c2f5a1aa) |
| NavOracle | [0xCd55924a73771d508887905473d93B981ac4A08b](https://explorer.testnet.arc.io/address/0xCd55924a73771d508887905473d93B981ac4A08b) | [0xcc7769d2822f2d444b89343b316ff495795fab69f70e28aaa7c5379d450e19da](https://explorer.testnet.arc.io/tx/0xcc7769d2822f2d444b89343b316ff495795fab69f70e28aaa7c5379d450e19da) |
| IssuerStub | [0x2b492aD36D8BB7BA6341a06AF76f1614A9516Ebe](https://explorer.testnet.arc.io/address/0x2b492aD36D8BB7BA6341a06AF76f1614A9516Ebe) | [0x9745e2f019c26e9c39dc815e3806fc09ebb5e9f245dfc0acea8bbb436d6828c1](https://explorer.testnet.arc.io/tx/0x9745e2f019c26e9c39dc815e3806fc09ebb5e9f245dfc0acea8bbb436d6828c1) |
| ClaimToken | [0x39006ed8b5a1f7c7cd7c6C33f522fF8C8e61B090](https://explorer.testnet.arc.io/address/0x39006ed8b5a1f7c7cd7c6C33f522fF8C8e61B090) | [0x7ab19789779a9daddf0d4f89dd6e023989129cad20972d324be5e297dee223fb](https://explorer.testnet.arc.io/tx/0x7ab19789779a9daddf0d4f89dd6e023989129cad20972d324be5e297dee223fb) |
| ClaimWrapper | [0xfc7E6ECF94e88E050c73733aC3cf03f831115952](https://explorer.testnet.arc.io/address/0xfc7E6ECF94e88E050c73733aC3cf03f831115952) | [0x6ed36d9064f9f4241a631a5b02f42216d316fc3a3d7c532382ab41294ad62f34](https://explorer.testnet.arc.io/tx/0x6ed36d9064f9f4241a631a5b02f42216d316fc3a3d7c532382ab41294ad62f34) |
| Vault | [0x7A40b36b012DC19b1f42dd68C13F4daE312e2319](https://explorer.testnet.arc.io/address/0x7A40b36b012DC19b1f42dd68C13F4daE312e2319) | [0x2f0c1644e500c888c87ba4936b40efa6cf68fedc675faeaba292dbf18f0487f6](https://explorer.testnet.arc.io/tx/0x2f0c1644e500c888c87ba4936b40efa6cf68fedc675faeaba292dbf18f0487f6) |
| FundA_ACRED | [0xCd5DE841b0f781A866cA6E978A19d6d5431683E2](https://explorer.testnet.arc.io/address/0xCd5DE841b0f781A866cA6E978A19d6d5431683E2) | [0xb253bd1033ed6ed2be2ab7b70717dcb2ca6285220b1c02eaf5f77850b0d132ca](https://explorer.testnet.arc.io/tx/0xb253bd1033ed6ed2be2ab7b70717dcb2ca6285220b1c02eaf5f77850b0d132ca) |
| FundB_ACREDd | [0x8d9FF934E08DA9f8AEbF2280dAD218e8d176d06F](https://explorer.testnet.arc.io/address/0x8d9FF934E08DA9f8AEbF2280dAD218e8d176d06F) | [0xbfcda4c87b08942acd878b9a642b677752da5b2681dd553927c7a449c7595de5](https://explorer.testnet.arc.io/tx/0xbfcda4c87b08942acd878b9a642b677752da5b2681dd553927c7a449c7595de5) |

## Configuration and hand-over transactions

| Step | Transaction |
|---|---|
| claims.setWrapper | [0x495d71b5d28471c2a875dcc734e5ad3ff6c8e919b3a7c9f6a373d2d4ff75c48d](https://explorer.testnet.arc.io/tx/0x495d71b5d28471c2a875dcc734e5ad3ff6c8e919b3a7c9f6a373d2d4ff75c48d) |
| wrapper.setVault | [0xe5151dfd47a1c1d397cf200decdfd9ab98f290f26a98b19ed3415102bc937614](https://explorer.testnet.arc.io/tx/0xe5151dfd47a1c1d397cf200decdfd9ab98f290f26a98b19ed3415102bc937614) |
| registry.listFund(A) | [0x7424efd0bc56a984812401d205230c757ea1057c23d98563d879ab22658c70f0](https://explorer.testnet.arc.io/tx/0x7424efd0bc56a984812401d205230c757ea1057c23d98563d879ab22658c70f0) |
| registry.listFund(B) | [0x46b3ee1104722dc465a64ec8d4db62d5723a143f991705da26be1c3c420b2d12](https://explorer.testnet.arc.io/tx/0x46b3ee1104722dc465a64ec8d4db62d5723a143f991705da26be1c3c420b2d12) |
| fundA.setAllowlisted(0xbc832e4FC6a9CBd9c35884Bc744e6499cBFf537B) | [0xcaec913c8bbb509fd4b5e0ce7c32ed7bce36b006e95d7b2352eba06a4aaa2c3b](https://explorer.testnet.arc.io/tx/0xcaec913c8bbb509fd4b5e0ce7c32ed7bce36b006e95d7b2352eba06a4aaa2c3b) |
| fundB.setAllowlisted(0xbc832e4FC6a9CBd9c35884Bc744e6499cBFf537B) | [0xb8e71e8ca36d286117425038961809c3198c5e36604ea9e89e406fcc9ca4b90e](https://explorer.testnet.arc.io/tx/0xb8e71e8ca36d286117425038961809c3198c5e36604ea9e89e406fcc9ca4b90e) |
| fundA.setAllowlisted(0xfc7E6ECF94e88E050c73733aC3cf03f831115952) | [0x21dddc88666595235257016456a946bb41648705c3d911d32b51e16de4ede76a](https://explorer.testnet.arc.io/tx/0x21dddc88666595235257016456a946bb41648705c3d911d32b51e16de4ede76a) |
| fundB.setAllowlisted(0xfc7E6ECF94e88E050c73733aC3cf03f831115952) | [0x396458ad63c89328cfa8c2688b66e17309aa63ad4805ebdb0f9572f362e881a9](https://explorer.testnet.arc.io/tx/0x396458ad63c89328cfa8c2688b66e17309aa63ad4805ebdb0f9572f362e881a9) |
| fundA.setAllowlisted(0x2b492aD36D8BB7BA6341a06AF76f1614A9516Ebe) | [0x763582a734444f5217059c853f6328b5cc2e1f66f73ef006129632fdb92958cb](https://explorer.testnet.arc.io/tx/0x763582a734444f5217059c853f6328b5cc2e1f66f73ef006129632fdb92958cb) |
| fundB.setAllowlisted(0x2b492aD36D8BB7BA6341a06AF76f1614A9516Ebe) | [0xef3c936470ce2c94c14db75312fbf5df430dcde7233390b0a5572eb21742bd1d](https://explorer.testnet.arc.io/tx/0xef3c936470ce2c94c14db75312fbf5df430dcde7233390b0a5572eb21742bd1d) |
| claims.setAllowlisted(0xbc832e4FC6a9CBd9c35884Bc744e6499cBFf537B) | [0xd1dc8b746c053a9802a0a6a0bf02bf19343e46c239fc760bf870589b53552cc4](https://explorer.testnet.arc.io/tx/0xd1dc8b746c053a9802a0a6a0bf02bf19343e46c239fc760bf870589b53552cc4) |
| claims.setAllowlisted(0xfc7E6ECF94e88E050c73733aC3cf03f831115952) | [0xe3c4681b418baf9a84c805514ec021f4c41595233490c31de466af0ba3fb2284](https://explorer.testnet.arc.io/tx/0xe3c4681b418baf9a84c805514ec021f4c41595233490c31de466af0ba3fb2284) |
| claims.setAllowlisted(0x7A40b36b012DC19b1f42dd68C13F4daE312e2319) | [0x0fd42820361092677c3a6cd1a1ac1cd20269b708d3a387a615e77a27a584636e](https://explorer.testnet.arc.io/tx/0x0fd42820361092677c3a6cd1a1ac1cd20269b708d3a387a615e77a27a584636e) |
| fundA.mint | [0x0a55cb18954a8a5d5554ef9b3cbed77957edd168bc384310581dd7a5e100ade6](https://explorer.testnet.arc.io/tx/0x0a55cb18954a8a5d5554ef9b3cbed77957edd168bc384310581dd7a5e100ade6) |
| fundB.mint | [0x3c4b467c7b35c648193be77385cef31481f33efc8c10f4640925c608203c464f](https://explorer.testnet.arc.io/tx/0x3c4b467c7b35c648193be77385cef31481f33efc8c10f4640925c608203c464f) |
| oracle.onReport(A) | [0xee2fa42c269892e328ac585023741addcef0b82954a64108adf3b7b89aef7b83](https://explorer.testnet.arc.io/tx/0xee2fa42c269892e328ac585023741addcef0b82954a64108adf3b7b89aef7b83) |
| oracle.onReport(B) | [0x62bac84422afb6c7e4aa11527c00620cec496cad0c0d7ca940092ecdb10bcb41](https://explorer.testnet.arc.io/tx/0x62bac84422afb6c7e4aa11527c00620cec496cad0c0d7ca940092ecdb10bcb41) |
| oracle.setForwarder | [0xe373df3ad5b1fa83296ca2af2f12c62e9057376b1373f13a23467eaa426d5ebc](https://explorer.testnet.arc.io/tx/0xe373df3ad5b1fa83296ca2af2f12c62e9057376b1373f13a23467eaa426d5ebc) |
| registry.transferOwnership | [0xba54a3b331e335171d695dd2f4bbc80ec1036743b6bf5be88e8a5ea5453c3ffe](https://explorer.testnet.arc.io/tx/0xba54a3b331e335171d695dd2f4bbc80ec1036743b6bf5be88e8a5ea5453c3ffe) |
| oracle.transferOwnership | [0xc8effcd145500fad6d61ba89c2729929d29686f530303dcfcaa16f89273deb68](https://explorer.testnet.arc.io/tx/0xc8effcd145500fad6d61ba89c2729929d29686f530303dcfcaa16f89273deb68) |
| issuer.transferOwnership | [0xd657d59b8bb5c6aff8c8dd5d804c93a6fa848f72ab3edeead3a86ae77bcbc134](https://explorer.testnet.arc.io/tx/0xd657d59b8bb5c6aff8c8dd5d804c93a6fa848f72ab3edeead3a86ae77bcbc134) |
| claims.transferOwnership | [0x99f6c01677504354f2f366afaaed9a814ed86f987ecd791b60de6bf07040481b](https://explorer.testnet.arc.io/tx/0x99f6c01677504354f2f366afaaed9a814ed86f987ecd791b60de6bf07040481b) |
| wrapper.transferOwnership | [0x002b063f022c7b022fd3e33aa6f0a907d1bf51c3440571a2054858e877784fc5](https://explorer.testnet.arc.io/tx/0x002b063f022c7b022fd3e33aa6f0a907d1bf51c3440571a2054858e877784fc5) |
| vault.transferOwnership | [0x15a1bde44aef7265f81c8d0e8cbca28388da39a6d2430de0617050f44c877235](https://explorer.testnet.arc.io/tx/0x15a1bde44aef7265f81c8d0e8cbca28388da39a6d2430de0617050f44c877235) |
| fundA.transferOwnership | [0xed03800ffcbab8ceaffcdeba45eeeb209923cee6e4b3dc62f6694261f3d4d768](https://explorer.testnet.arc.io/tx/0xed03800ffcbab8ceaffcdeba45eeeb209923cee6e4b3dc62f6694261f3d4d768) |
| fundB.transferOwnership | [0x2e3ca95a9ff9986c069c13106ae631637e472b4b0ba1dafcb99da749cb2744b8](https://explorer.testnet.arc.io/tx/0x2e3ca95a9ff9986c069c13106ae631637e472b4b0ba1dafcb99da749cb2744b8) |
