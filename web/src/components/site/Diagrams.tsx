import { Activity, Ban, BookOpen, Building2, Check, CircleDollarSign, Cpu, HeartPulse, Landmark, Layers, Link2, OctagonX, Radio, Scale, User } from "lucide-react";
import { Diagram } from "@/components/viz/Diagram";

/// How a sale works: tokens in, claim to the vault, USDC back at once; the issuer pays the vault later.
export function SaleFlowDiagram() {
  return (
    <Diagram
      id="sale"
      label="How a sale works: you send fund tokens, Earlyout turns them into a claim, the vault buys it and pays you USDC in the same transaction, and the issuer pays the vault on the payout date."
      width={960}
      height={300}
      nodes={[
        { id: "you", x: 20, y: 30, w: 220, title: "You", sub: "waiting to redeem", tone: "blue", icon: User },
        { id: "eo", x: 370, y: 30, w: 220, title: "Earlyout", sub: "turns it into a claim", tone: "purple", icon: Layers },
        { id: "vault", x: 720, y: 30, w: 220, title: "USDC vault", sub: "buys the claim", tone: "green", icon: Landmark },
        { id: "issuer", x: 720, y: 210, w: 220, title: "Fund issuer", sub: "pays later, at NAV", tone: "gray", icon: Building2 },
      ]}
      edges={[
        { pts: [[240, 66], [368, 66]], label: "fund tokens", at: [304, 42] },
        { pts: [[590, 66], [718, 66]], label: "claim", at: [654, 42] },
        { pts: [[790, 102], [790, 160], [130, 160], [130, 104]], label: "USDC to you, same transaction", at: [460, 160], tone: "green" },
        { pts: [[900, 210], [900, 104]], label: "later", at: [900, 168], dashed: true, tone: "gray" },
      ]}
      steps={[
        { icon: User, tone: "blue", title: "You send fund tokens", text: "Your pending redemption, in one transaction." },
        { icon: Layers, tone: "purple", title: "Earlyout makes a claim", text: "The redemption is filed with the issuer and becomes a claim." },
        { icon: Landmark, tone: "green", title: "The vault buys it", text: "USDC reaches you in the same transaction." },
        { icon: Building2, tone: "gray", title: "The issuer pays the vault", text: "On the payout date, at the fund's NAV." },
      ]}
    />
  );
}

/// The contract's decision: two checks, three verdicts.
export function VerdictDiagram() {
  return (
    <Diagram
      id="verdict"
      label="How the contract decides: if the issuer has failed or the price is stale it halts; if the sale would pass the fund's cap, the vault lacks USDC or the claim is due it refuses; otherwise it buys."
      width={960}
      height={290}
      nodes={[
        { id: "q", x: 20, y: 30, w: 170, title: "Your quote", sub: "fund and amount", tone: "blue", icon: CircleDollarSign },
        { id: "c1", x: 240, y: 30, w: 250, title: "Issuer OK, price fresh?", sub: "carried by Chainlink CRE", tone: "gray", icon: HeartPulse },
        { id: "c2", x: 540, y: 30, w: 272, title: "Under cap, USDC on hand?", sub: "claim not yet due", tone: "gray", icon: Scale },
        { id: "buy", x: 852, y: 30, w: 98, title: "BUY", tone: "green", icon: Check },
        { id: "halt", x: 240, y: 200, w: 250, title: "HALT", sub: "trading stops", tone: "red", icon: OctagonX },
        { id: "refuse", x: 540, y: 200, w: 272, title: "REFUSE", sub: "nothing moves, try less", tone: "orange", icon: Ban },
      ]}
      edges={[
        { pts: [[190, 66], [238, 66]] },
        { pts: [[490, 66], [538, 66]], label: "yes", at: [514, 42], tone: "green" },
        { pts: [[812, 66], [850, 66]], label: "yes", at: [831, 42], tone: "green" },
        { pts: [[365, 102], [365, 198]], label: "no", at: [365, 150], tone: "red" },
        { pts: [[676, 102], [676, 198]], label: "no", at: [676, 150], tone: "orange" },
      ]}
      steps={[
        { icon: CircleDollarSign, tone: "blue", title: "You ask for a quote", text: "Pick a fund and an amount." },
        { icon: OctagonX, tone: "red", title: "HALT", text: "If the issuer has failed or the price is stale, nobody can trade the fund." },
        { icon: Ban, tone: "orange", title: "REFUSE", text: "If the sale would pass the fund's cap, the vault lacks USDC, or the claim is already due." },
        { icon: Check, tone: "green", title: "BUY", text: "Otherwise the vault buys, at the price on screen." },
      ]}
    />
  );
}

/// Where the price comes from, and where each sale is recorded.
export function OracleDiagram() {
  return (
    <Diagram
      id="oracle"
      label="Where the price comes from: a Chainlink NAV feed on Ethereum and the issuer status reach a Chainlink CRE workflow, which signs a report to NavOracle on Arc; the vault prices from it and records each sale on Arkiv."
      width={960}
      height={300}
      nodes={[
        { id: "feed", x: 20, y: 30, w: 230, title: "Chainlink NAV feed", sub: "Ethereum mainnet", tone: "chainlink", icon: Link2 },
        { id: "api", x: 20, y: 200, w: 230, title: "Issuer status", sub: "OK or FAILED", tone: "gray", icon: Activity },
        { id: "cre", x: 320, y: 115, w: 200, title: "Chainlink CRE", sub: "nodes sign a report", tone: "chainlink", icon: Cpu },
        { id: "oracle", x: 580, y: 115, w: 170, title: "NavOracle", sub: "on Arc", tone: "blue", icon: Radio },
        { id: "vault", x: 790, y: 115, w: 160, title: "Vault", sub: "prices sales", tone: "green", icon: Landmark },
        { id: "arkiv", x: 790, y: 228, w: 160, h: 60, title: "Arkiv book", tone: "purple", icon: BookOpen },
      ]}
      edges={[
        { pts: [[250, 66], [285, 66], [285, 140], [318, 140]], label: "NAV", at: [285, 100], tone: "chainlink" },
        { pts: [[250, 236], [285, 236], [285, 166], [318, 166]], label: "status", at: [285, 204] },
        { pts: [[520, 151], [578, 151]], label: "report", at: [549, 127], tone: "chainlink" },
        { pts: [[750, 151], [788, 151]] },
        { pts: [[870, 187], [870, 226]], label: "each sale", at: [870, 207], tone: "purple" },
      ]}
      steps={[
        { icon: Link2, tone: "chainlink", title: "Chainlink NAV feed", text: "The fund's net asset value, on Ethereum mainnet." },
        { icon: Activity, tone: "gray", title: "Issuer status", text: "Whether the issuer is paying: OK or FAILED." },
        { icon: Cpu, tone: "chainlink", title: "Chainlink CRE", text: "Nodes read both, agree, and sign one report." },
        { icon: Radio, tone: "blue", title: "NavOracle on Arc", text: "Accepts only signed reports from the forwarder." },
        { icon: Landmark, tone: "green", title: "Vault", text: "Prices every sale from it, and halts on bad news." },
        { icon: BookOpen, tone: "purple", title: "Arkiv book", text: "Each sale is written to a public database." },
      ]}
    />
  );
}
