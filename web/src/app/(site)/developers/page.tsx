import type { Metadata } from "next";
import { ARC_EXPLORER, CTA, Code, PageHeader, Section, contracts } from "@/components/site/blocks";
import { REPO, STUDIO } from "@/components/site/links";

export const metadata: Metadata = { title: "Developers" };

export default function Developers() {
  return (
    <>
      <PageHeader
        eyebrow="Developers"
        title="Contracts, APIs and the public book."
        lede="Everything runs on Arc testnet (chain 5042002). USDC is 0x3600000000000000000000000000000000000000, 6 decimals."
      />
      <Section eyebrow="Contracts" title="Deployed from Arc Studio, owned by the ops wallet.">
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[640px] font-mono text-[13px]">
            <thead>
              <tr className="text-left text-muted">
                <th className="px-5 py-3 font-normal">Contract</th>
                <th className="px-5 py-3 font-normal">Address</th>
                <th className="px-5 py-3 font-normal">Role</th>
              </tr>
            </thead>
            <tbody>
              {contracts.map(([name, addr, role]) => (
                <tr key={addr} className="border-t border-hairline">
                  <td className="px-5 py-3">{name}</td>
                  <td className="px-5 py-3">
                    <a className="link-underline text-accent" href={`${ARC_EXPLORER}/address/${addr}`} target="_blank" rel="noreferrer">
                      {addr.slice(0, 10)}…{addr.slice(-6)}
                    </a>
                  </td>
                  <td className="px-5 py-3 text-muted">{role}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
      <Section eyebrow="Quote" title="Price a sale before it exists.">
        <Code>{`cast call 0x7A40b36b012DC19b1f42dd68C13F4daE312e2319 \\
  "quoteFund(address,uint256)((uint8,string,uint256,uint64,uint16,uint16,uint16,uint16,uint256,uint256))" \\
  0x8d9FF934E08DA9f8AEbF2280dAD218e8d176d06F 1000000000000000 \\
  --rpc-url https://rpc.testnet.arc.io
# (verdict, reason, nav, navUpdatedAt, baseBps, utilBps, timeBps, creditBps, payout, capacityLeft)`}</Code>
      </Section>
      <Section eyebrow="HTTP API" title="Served by the app.">
        <Code>{`GET  /api/issuer-status?fund=0x...   {"status":"OK"} or {"status":"FAILED"}; the API CRE reads
GET  /api/book                       open claims and the fund directory, read from Arkiv
POST /api/nav/push                   carry the Chainlink NAV and issuer status to the oracle
POST /api/arkiv/sync                 index new Arc events into Arkiv`}</Code>
      </Section>
      <Section eyebrow="Oracle reports" title="One encoding for CRE and every other writer.">
        <Code>{`report = abi.encode(address fund, uint256 nav, uint8 navDecimals, uint64 updatedAt, uint8 status)
// status 0 = OK, 1 = FAILED. Equal updatedAt accepted, older rejected, more than 5 minutes ahead rejected.
// The CRE workflow is in cre/nav-bridge: cron, mainnet feed read, issuer API, writeReport to arc-testnet.`}</Code>
      </Section>
      <Section eyebrow="Run it" title="Clone, test, query.">
        <Code>{`git clone ${REPO}
cd earlyout/contracts && forge install foundry-rs/forge-std OpenZeppelin/openzeppelin-contracts@v5.7.0 --no-git && forge test
cd ../web && pnpm install && pnpm arkiv:query
cd ../cre && cre workflow simulate ./nav-bridge --target staging-settings`}</Code>
        <div className="mt-8 flex flex-wrap gap-3">
          <CTA href={REPO}>GitHub</CTA>
          <CTA href={STUDIO} variant="secondary">
            Arc Studio project
          </CTA>
        </div>
      </Section>
    </>
  );
}
