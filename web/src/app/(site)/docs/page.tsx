import { ArrowUpRight } from "lucide-react";
import type { Metadata } from "next";
import { ARC_EXPLORER, Code, PageHeader, Section, contracts } from "@/components/site/blocks";
import { EndpointList } from "@/components/site/EndpointList";
import { REPO, STUDIO } from "@/components/site/links";
import { OracleFlow } from "@/components/diagrams/OracleFlow";
import { COPY } from "@/lib/copy";
import { GLOSSARY } from "@/lib/glossary";

const C = COPY.docs;

export const metadata: Metadata = { title: C.meta.title };

const proofs: [string, string, string][] = [
  ["Arc Studio project", "Contracts, security review and the deploy transactions.", STUDIO],
  ["Vault on Arc", "The deployed Vault, owned by the ops wallet.", `${ARC_EXPLORER}/address/0x7A40b36b012DC19b1f42dd68C13F4daE312e2319`],
  ["A real sale", "Fund tokens in, claim to the vault, USDC to the seller, one transaction.", `${ARC_EXPLORER}/tx/0x12aefa9df1553daadc4c026566387f0fdde7cf9af6a0153a5eac5e141973a5ee`],
  ["CRE workflow logs", "Broadcast runs: issuer OK, issuer failed and the halt, then restored.", `${REPO}/blob/main/cre/README.md`],
  ["Source code", "63 contract tests, end-to-end checks, MIT licence.", REPO],
];

export default function Docs() {
  return (
    <>
      <PageHeader
        eyebrow={C.kicker}
        title={C.title}
        lede={
          <>
            {C.lede} USDC is <span className="t-mono break-all text-[0.9em]">0x3600000000000000000000000000000000000000</span>.
          </>
        }
      />

      <Section layout="bleed" title={C.contracts.title} lede={C.contracts.lede}>
        <div className="overflow-x-auto border-y border-ink">
          <table className="tbl min-w-[640px]" aria-label="Contracts">
            <thead>
              <tr>
                <th>Contract</th>
                <th>Address</th>
                <th>Role</th>
              </tr>
            </thead>
            <tbody>
              {contracts.map(([name, addr, role]) => (
                <tr key={addr}>
                  <td className="text-ink">{name}</td>
                  <td>
                    <a className="t-mono text-[13px] text-brand hover:underline" href={`${ARC_EXPLORER}/address/${addr}`} target="_blank" rel="noreferrer">
                      {addr.slice(0, 10)}…{addr.slice(-6)}
                    </a>
                  </td>
                  <td className="!whitespace-normal text-ink-2">{role}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section tint layout="split" title={C.api.title} lede={C.api.lede}>
        <EndpointList />
        <div className="mt-6">
          <Code>{`curl "https://earlyout.vercel.app/api/quote?fund=0x8d9FF934E08DA9f8AEbF2280dAD218e8d176d06F&amount=1000000000000000"
# {"verdict":"BUY","reason":"","nav":"…n","baseBps":50,"utilBps":…,"timeBps":…,"creditBps":150,"payout":"…n","settleAt":…}
# Amounts are base units with an n suffix: USDC has 6 decimals, NAV and fund tokens 18.`}</Code>
        </div>
      </Section>

      <Section layout="split" title={C.terminal.title} lede={C.terminal.lede}>
        <Code>{`cast call 0x7A40b36b012DC19b1f42dd68C13F4daE312e2319 \\
  "quoteFund(address,uint256)((uint8,string,uint256,uint64,uint16,uint16,uint16,uint16,uint256,uint256))" \\
  0x8d9FF934E08DA9f8AEbF2280dAD218e8d176d06F 1000000000000000 \\
  --rpc-url https://rpc.testnet.arc.io`}</Code>
      </Section>

      <Section tint layout="split" title={C.arkiv.title} lede={C.arkiv.lede}>
        <Code>{`const page = await client
  .select()
  .from(Claims)                       // schema "earlyout.claims"
  .where(eq("status", "open"))
  .ownedBy("0x343F684dAFFf216CDf38a40888662148eBa07Fd7")
  .orderBy(asc("settleAt"))
  .fetch()`}</Code>
      </Section>

      <Section title={C.oracle.title} lede={C.oracle.lede}>
        <div className="sheet p-4 sm:p-6">
          <OracleFlow />
        </div>
        <div className="mt-6">
          <Code>{`report = abi.encode(address fund, uint256 nav, uint8 navDecimals, uint64 updatedAt, uint8 status)
// status 0 = OK, 1 = FAILED. Equal updatedAt accepted, older rejected, more than 5 minutes ahead rejected.
// The CRE workflow is in cre/nav-bridge: cron, mainnet feed read, issuer API, writeReport to arc-testnet.`}</Code>
        </div>
      </Section>

      <Section tint layout="split" title={C.proofs.title} lede={C.proofs.lede}>
        <ul className="border-y border-ink">
          {proofs.map(([t, d, href]) => (
            <li key={t} className="border-b border-hairline last:border-b-0">
              <a href={href} target="_blank" rel="noreferrer" className="group flex items-start justify-between gap-4 py-4 hover:bg-surface">
                <span>
                  <span className="block text-[15px] font-medium text-ink">{t}</span>
                  <span className="block text-[14px] text-ink-2">{d}</span>
                </span>
                <ArrowUpRight size={16} aria-hidden className="mt-1 shrink-0 text-muted group-hover:text-ink" />
              </a>
            </li>
          ))}
        </ul>
      </Section>

      <Section layout="split" title={C.run.title}>
        <Code>{`git clone ${REPO}
cd earlyout/contracts && forge install foundry-rs/forge-std OpenZeppelin/openzeppelin-contracts@v5.7.0 --no-git && forge test
cd ../web && pnpm install && NEXT_PUBLIC_MODE=mock pnpm dev
cd ../cre && cre workflow simulate ./nav-bridge --target staging-settings`}</Code>
      </Section>

      <Section tint title={C.glossary.title}>
        <dl className="grid gap-x-10 gap-y-5 sm:grid-cols-2">
          {Object.entries(GLOSSARY).map(([abbr, g]) => (
            <div key={abbr} className="border-t border-hairline pt-3">
              <dt className="font-mono text-[13px] text-ink">
                {abbr} <span className="font-sans text-muted">{g.full}</span>
              </dt>
              <dd className="mt-1 text-[14px] text-ink-2">{g.say}</dd>
            </div>
          ))}
        </dl>
      </Section>
    </>
  );
}
