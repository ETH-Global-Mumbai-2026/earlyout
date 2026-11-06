Build the Earlyout web app inside this Studio workspace, connected to the contracts you deployed on Arc Testnet. Keep it small and working; do not change or redeploy any contract.

Addresses (Arc Testnet, from contracts/deployments/arc-testnet.json):
- Vault 0x7A40b36b012DC19b1f42dd68C13F4daE312e2319
- ClaimWrapper 0xfc7E6ECF94e88E050c73733aC3cf03f831115952
- NavOracle 0xCd55924a73771d508887905473d93B981ac4A08b
- FundRegistry 0x634697188F17eC1064f6e9A0aE000a504983dCe4
- ACRED (90-day) 0xCd5DE841b0f781A866cA6E978A19d6d5431683E2
- ACREDd (15-minute) 0x8d9FF934E08DA9f8AEbF2280dAD218e8d176d06F
- USDC 0x3600000000000000000000000000000000000000 (6 decimals)

One screen, in src/App.tsx with components under src/components/:
1. Fund picker for the two funds, showing NAV from NavOracle.getNav(fund) (18 decimals) and the payout delay from FundRegistry.getTerms(fund).
2. Amount input (fund units, 18 decimals).
3. Live quote from Vault.quoteFund(fund, amount): show the verdict first (0 BUY, 1 REFUSE, 2 HALT, with the reason string), then the payout in USDC, then the four spread terms (baseBps, utilBps, timeBps, creditBps) as a list and as one segmented bar.
4. Sell button: approve the fund token to ClaimWrapper if needed, then ClaimWrapper.depositAndSell(fund, amount, minPayout) with minPayout = 99.5% of the quoted payout. Show the transaction link on the Arc Testnet explorer.
5. Vault panel: totalAssets, idle USDC (USDC.balanceOf(vault)), deployedUsdc, and share price (convertToAssets(10 ** decimals())).

Use the existing wagmi/viem setup and ConnectKit. Dark theme. No em dashes in any UI text. Read-only parts must work without a connected wallet. Keep the preview running so judges can open it from the share URL. Report the files you created and confirm the preview loads and shows a BUY quote for 0.001 ACREDd.
