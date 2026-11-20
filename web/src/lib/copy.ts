// Copy deck: every site heading, lede and call to action, and every app
// screen title and description. Pages import from here so the owner reviews
// one file. Rule: no em or en dashes in any string below.

/// The four parts of the discount, in plain words, in the contract's order.
export const TERM_LABELS = ["Service fee", "Pool usage", "Waiting time", "Fund risk"] as const;

export const COPY = {
  terms: {
    base: { label: TERM_LABELS[0], say: "A small fixed fee for the service." },
    util: { label: TERM_LABELS[1], say: "Goes up a little when the cash pool is busy." },
    time: { label: TERM_LABELS[2], say: "The longer until your fund pays, the bigger this part." },
    credit: { label: TERM_LABELS[3], say: "A fixed charge in case the fund pays late or short." },
    total: "Total discount",
    value: "Worth at fund price",
    why: "Why this price?",
  },
  verdicts: {
    BUY: "We can buy this now. You get paid the moment you confirm.",
    REFUSE: "We can't take this amount right now. Nothing is sent.",
    HALT: "Paused for safety. Nobody can sell this fund until it clears.",
  },
  strip: {
    text: "Testnet preview. Test USDC only. Fund tokens are stand-ins.",
    link: "Learn more",
  },

  nav: {
    holders: "Holders",
    liquidity: "Liquidity",
    platforms: "Platforms",
    docs: "Docs",
    security: "Security",
    company: "Company",
    openApp: "Open app",
    openMenu: "Open menu",
    closeMenu: "Close menu",
    testnet: "Testnet notice",
    appearance: "Appearance",
  },

  footer: {
    columns: {
      product: "Product",
      audiences: "Audiences",
      company: "Company",
      build: "Build",
    },
    legal: "Not investment advice. Earlyout runs on Arc testnet with test USDC and stand-in fund tokens.",
    affiliation: "Not affiliated with Apollo, Securitize, Circle, Chainlink or Arkiv.",
  },

  home: {
    meta: {
      title: "Your redemption, paid today.",
      description:
        "Waiting for your fund to pay out? Earlyout pays you today, in USDC, at a clear discount to the fund's price.",
    },
    hero: {
      kicker: "Liquidity for scheduled-redemption funds",
      title: "Your redemption,",
      titleItalic: "paid today.",
      lede:
        "Your fund pays you back next quarter. Earlyout pays you now, in USDC. You see exactly what you get and why before you confirm.",
      doorsLabel: "I am",
      doors: {
        holder: { label: "I hold a fund", cta: "Get a quote", href: "/sell" },
        lp: { label: "I provide USDC", cta: "Open the vault", href: "/vault" },
        platform: { label: "I run a platform", cta: "Read the API", href: "/platforms" },
      },
      secondary: "How a sale works",
      sheet: {
        holderHeader: "Quote · ACRED · 1 unit",
        receive: "You receive today",
        perUnitCaption: "A live price for one unit of ACRED.",
        lpHeader: "Vault · USDC",
        platformCaption: "Live answer for 0.001 ACRED. Amounts are whole numbers in the smallest unit, marked with n.",
      },
    },
    problem: {
      kicker: "The problem",
      title: "Your money is in the fund. You can't get it out yet.",
      lede:
        "Many funds pay investors back on a schedule, and limit how much can leave each time. If you need cash before then, you wait.",
      points: [
        { title: "Paid once a quarter", body: "Funds like ACRED only pay investors back a few times a year." },
        { title: "Nowhere else to sell", body: "You can't sell these fund tokens on an exchange. Only approved wallets can hold them." },
        { title: "Sometimes it takes longer", body: "When too many people ask at once, the fund pays only part and the rest waits another quarter." },
      ],
      gateCaption: "Each quarter only a small slice of the fund can be paid out. Everyone else waits for the next one.",
    },
    flow: {
      kicker: "How a sale works",
      title: "You sign once. USDC arrives in the same transaction.",
      lede: "You hand Earlyout your place in the fund's payout line. Earlyout pays you now and waits for the fund instead of you.",
    },
    pricing: {
      kicker: "Pricing",
      title: "One clear discount. No haggling.",
      lede: "The price is the fund's own price, minus a discount made of four parts. The longer you would have waited, the bigger the discount.",
      exampleTitle: "Selling ACRED 90 days before it pays",
      exampleNote: "You keep about 94% of the fund price. Move the slider: a short wait costs very little.",
      sliderLabel: "Days to payout",
    },
    funds: {
      kicker: "Funds",
      title: "Funds you can sell today.",
      lede:
        "Prices come straight from each fund's official price feed. Earlyout buys from funds that make you wait.",
      buyable: "Buys your redemption",
      alsoPriced: "Also priced",
      alsoPricedNote: "These funds already pay within a day, so you don't need us. Shown for comparison.",
      feedLink: "Chainlink feed",
    },
    controls: {
      kicker: "Controls",
      title: "Every price comes with a clear yes or no.",
      lede: "BUY means you can sell now. REFUSE means not this amount, and tells you why. HALT means selling is paused to keep everyone safe.",
    },
    oracle: {
      kicker: "Where the price comes from",
      title: "Chainlink sets the price. Arc settles it. Arkiv records it.",
      lede: "The NAV and the issuer's status arrive in one signed report. Every sale is written to a public book anyone can query.",
    },
    audiences: {
      kicker: "Who it is for",
      title: "One market, three ways in.",
      holders: { title: "Holders", body: "Sell a pending redemption for USDC today, at a price you can check.", cta: "For holders" },
      liquidity: { title: "Liquidity providers", body: "Deposit USDC. The vault buys claims at a discount and collects in full at payout.", cta: "For liquidity" },
      platforms: { title: "Platforms", body: "Offer your clients an exit between windows, through our API, on your allowlist.", cta: "For platforms" },
    },
    closing: {
      title: "Stop waiting for the window.",
      lede: "One transaction, with the price explained before you sign.",
      cta: "Get a quote",
    },
  },

  holders: {
    meta: { title: "For holders" },
    kicker: "For holders",
    title: "Sell the wait, keep the value.",
    lede: "Get cash today for a fund payout you are still waiting on. You see the price, the discount and the answer before you confirm.",
    flow: { title: "Three steps, one confirmation.", lede: "Pick your fund, enter an amount, confirm. The cash arrives straight away." },
    anatomy: {
      title: "What makes up the price.",
      lede: "The fund's price, minus four small parts. All shown before you confirm.",
      terms: {
        base: "A fixed fee per fund, set in the fund registry.",
        usage: "Rises as the vault puts more of its USDC to work, from 0 to 3%.",
        time: "Grows with the square root of the time to payout. The main cost of a long wait.",
        credit: "A fixed charge for the issuer's risk, per fund.",
      },
    },
    verdicts: {
      title: "Three answers, always with a reason.",
      buy: "You can sell. The USDC reaches your wallet the moment you confirm.",
      refuse: "Not this amount right now, usually because the pool is full for that fund. Try a smaller amount or come back later.",
      halt: "Selling is paused, for example if the fund's price is out of date or the fund reports a problem. It reopens once that clears.",
    },
    after: {
      title: "What happens after you sell.",
      now: { title: "Now", body: "USDC lands in your wallet. Your sale is written to the public book." },
      waiting: { title: "Until payout", body: "Earlyout waits for the fund. You have nothing to do." },
      payout: { title: "On payout day", body: "The fund pays Earlyout. Your sale shows as paid in My sales." },
    },
    cta: "Get a quote",
  },

  liquidity: {
    meta: { title: "For liquidity providers" },
    kicker: "For liquidity providers",
    title: "Earn a return on every early exit.",
    lede: "Put USDC in the pool. It buys fund payouts at a discount and collects the full amount when each fund pays.",
    buys: {
      title: "What your USDC buys.",
      lede: "Payouts that fund investors are waiting for, bought at a discount, with a limit per fund.",
      points: [
        "Payouts from ACRED, JAAA and USCC, each worth the full fund price on payout day.",
        "Bought only while the pool has spare cash and the fund is under its limit.",
        "Held until the fund pays the full amount.",
      ],
    },
    earns: {
      title: "Where your return comes from.",
      lede: "A payout bought at about 6% off is worth the full amount on payout day. That difference is your return.",
    },
    risks: {
      title: "What can go wrong, and what happens then.",
      issuer: { title: "A fund reports a problem", body: "Selling that fund stops straight away." },
      impairment: { title: "If a fund can't pay in full", body: "Its payouts are marked down to what is expected back, and everyone in the pool shares the loss at once, fairly." },
      withdrawals: { title: "Taking money out", body: "You can withdraw cash the pool is not using. Deposits and withdrawals pause briefly while a fund problem is being handled." },
    },
    live: { title: "The pool right now." },
    cta: "Open the vault",
  },

  platforms: {
    meta: { title: "For platforms" },
    kicker: "For platforms and distributors",
    title: "Give your clients an exit between windows.",
    lede: "Fund tokens move only between wallets you approve. You keep the eligibility rules. Earlyout brings the liquidity.",
    points: [
      { title: "No change to redemption terms", body: "The fund still redeems on its schedule. Earlyout buys the pending payout, so the gate stays in place." },
      { title: "Your allowlist, enforced on chain", body: "Fund tokens and claim tokens check the allowlist on every transfer." },
      { title: "A book you can audit", body: "Every open claim, its price and its Arc transaction sit on Arkiv, readable without our server." },
      { title: "Prices your clients can follow", body: "Each quote names its four terms. Same formula for every holder, no negotiation." },
    ],
    api: { title: "The API at a glance.", lede: "Quote, sell and read the book from your own product.", link: "See the API screen" },
    arkiv: { title: "Your clients' claims, from Arkiv.", lede: "Filter by fund or payout date with the Arkiv SDK. The writer address proves the entries are ours." },
    docsLink: "Read the docs",
    contact: { title: "Listing a fund takes one registry call.", lede: "Tell us the fund, its settlement delay and window, and its NAV feed. We agree the cap and credit term with you.", cta: "Request access" },
  },

  docs: {
    meta: { title: "Docs" },
    kicker: "Docs",
    title: "Contracts, APIs and the public book.",
    lede: "Everything runs on Arc testnet, chain 5042002. USDC has 6 decimals.",
    contracts: { title: "Contracts", lede: "Deployed from Arc Studio and owned by the ops wallet." },
    api: { title: "HTTP API", lede: "Served by the app. Request and response for each endpoint." },
    arkiv: { title: "The public book", lede: "Read every open claim straight from Arkiv. The writer address proves the entries are ours." },
    oracle: { title: "Oracle reports", lede: "One encoding for the CRE workflow and every other writer." },
    proofs: { title: "Check it yourself", lede: "Each link opens the contract, transaction, log or project behind a claim on this site." },
    terminal: { title: "Price a sale from the terminal.", lede: "The same quote, straight from the Vault contract." },
    run: { title: "Run it yourself." },
    glossary: { title: "Glossary" },
  },

  security: {
    meta: { title: "Security" },
    kicker: "Security",
    title: "Reviewed, tested, and plain about what is left.",
    lede: "The contracts went through Arc Studio's security review and Slither before deployment. This is testnet software and it has not been audited.",
    review: { title: "All six findings fixed: five medium and one high.", note: "81 Foundry tests pass. The full report is in docs/studio in the repository." },
    open: {
      title: "Settlement gains go to the LPs who funded them.",
      body: "Each claim the vault holds gains value a little every day, from the day it is bought to its payout date. Money deposited just before a settlement and withdrawn just after gets no share of that gain. The only change left at settlement is any move in NAV since the vault bought the claim.",
    },
    trust: { title: "What you are trusting today." },
    report: { title: "Found something? Tell us.", lede: "Open an issue in the repository. Never post private keys or seed phrases.", cta: "Report an issue" },
  },

  company: {
    meta: { title: "Company" },
    kicker: "Company",
    title: "We sell the wait.",
    lede: "Tokenized funds settle on chain in seconds, yet their investors still wait a quarter to get out. We are building the market that closes that gap.",
    story: {
      title: "Where we started.",
      body: "Earlyout began at ETHGlobal Mumbai in November 2026, where it won Arc's prize for the best onchain finance app. We are now building it into a company.",
    },
    mission: {
      title: "Make scheduled redemptions liquid without bending the fund's rules.",
      body: "Gated funds exist for good reasons. We leave the gate where it is and put a market in front of it: a vault that pays now and does the waiting, at a price anyone can check.",
    },
    team: {
      title: "Team",
      members: [
        { name: "Satyam Sharma", role: "Co-founder" },
        { name: "Shreyas Thakur", role: "Co-founder" },
        { name: "Dex", role: "Co-founder" },
      ],
    },
    open: { title: "Everything is in the open.", github: "GitHub", studio: "Arc Studio project" },
  },

  legal: {
    meta: { title: "Testnet notice" },
    kicker: "Testnet notice",
    title: "Read this before you click anything.",
    points: [
      { title: "Testnet only", body: "Every contract runs on Arc testnet and holds test USDC with no monetary value. Nothing here is a live financial product." },
      { title: "Not investment advice", body: "Nothing on this site is an offer to buy or sell a security, or advice about any fund." },
      { title: "Stand-ins", body: "The fund tokens, the issuer's redemption desk and the issuer status API are stand-ins. Fund names refer to real funds as examples; their NAV comes from Chainlink's public feeds." },
      { title: "No affiliation", body: "Earlyout is not affiliated with, endorsed by or sponsored by Apollo, Securitize, Circle, Chainlink or Arkiv." },
      { title: "Open source", body: "The code is MIT licensed and provided as is, without warranty of any kind." },
      { title: "Data", body: "Wallet addresses you connect are read from public chains. Sales are written to Arkiv, a public database, and expire on their payout date. We do not collect personal data." },
    ],
    realTitle: "What is real, and what stands in.",
    real: [
      { part: "ACRED NAV", status: "Real", note: "Chainlink feed on Ethereum mainnet" },
      { part: "USDC and every Earlyout contract", status: "Real", note: "Arc testnet" },
      { part: "CRE workflow and reports", status: "Real", note: "Simulated with broadcast on Arc" },
      { part: "Public book", status: "Real", note: "Arkiv Rabdi testnet" },
      { part: "Fund tokens", status: "Stand-in", note: "Real ones only move between issuer-approved wallets" },
      { part: "Issuer redemption desk", status: "Stand-in", note: "Same reason" },
      { part: "Issuer status API", status: "Stand-in", note: "In production, the issuer's attestation" },
    ],
  },

  app: {
    groups: { holders: "Holders", liquidity: "Liquidity", market: "Market", platforms: "Platforms" },
    network: { live: "Arc testnet", mock: "Demo data" },
    operator: "Operator",
    welcome: {
      sell: { title: "Connect a wallet to sell.", body: "You can look around first. Prices update live, and nothing is sent until you confirm." },
      vault: { title: "Connect a wallet to add USDC.", body: "See the pool first. Your money only moves when you confirm in your wallet." },
      buy: { title: "Connect a wallet to buy.", body: "Look through the claims first. Nothing is sent until you confirm in your wallet." },
    },
    sell: {
      title: "Sell a redemption",
      description: "Pick a fund, enter an amount, and see exactly what you get before you confirm.",
      ticket: "Your sale",
      receive: "You receive now",
      minimum: "Minimum received",
      payout: "Payout date",
      capacity: "Capacity left",
      settlementNote: "Settles in the same transaction.",
      daily: "Daily-liquidity funds",
      dailyNote: "These redeem daily, so selling early saves no time. Shown for comparison.",
      overHolding: "That is more than you hold.",
      receipt: { title: "Sold", received: "USDC received", done: "Done" },
    },
    sales: {
      title: "My sales",
      description: "Every redemption you have sold, and whether it has paid out.",
      waiting: "Waiting for payout",
      paid: "Paid",
      empty: "No sales yet.",
      emptyCta: "Sell a redemption",
      disconnected: "Connect a wallet to see your sales.",
    },
    vault: {
      title: "Vault",
      description: "Add USDC to the pool, earn from every early exit, take it out when you like.",
      worth: "Your shares are worth",
      withdrawable: "Withdrawable now",
      toEarn: "Still to be earned",
    },
    positions: {
      title: "Positions",
      description: "The payouts the pool has bought, what they cost and what they will pay.",
      expected: "Expected at settlement",
      deployed: "Capital deployed",
      profit: "Expected profit",
      empty: "The vault holds no claims right now.",
    },
    book: {
      title: "Open claims",
      description: "Every payout sold to Earlyout that is still waiting to be paid. Public, so anyone can check it.",
      empty: "No open claims.",
      buyLink: "Buy a claim",
    },
    buy: {
      title: "Buy a claim",
      description: "Buy a waiting payout yourself and collect the full amount on payout day.",
      ticket: "Buy",
      yours: "Your claims",
      redeem: "Redeem",
      empty: "Nothing to buy right now.",
      yoursEmpty: "You hold no claims yet. Buy one above and it shows here until payout day.",
      choose: "1. Choose a claim",
      whole: "You buy the whole claim. The price already takes off the discount for the time left, and on payout day you collect the full amount.",
      price: "You pay now",
      worth: "You collect on payout day",
      gain: "Your return",
      pays: "Payout day",
      bought: "Bought. The claim is in your wallet.",
      redeemNote: "Redeem opens on payout day, once the fund has paid.",
    },
    status: {
      title: "Oracle and risk",
      description: "Is each fund's price up to date, and is anything paused? All in one place.",
      demo: "Demo controls",
      demoNote: "Testnet only. These send real testnet transactions from the ops wallet.",
    },
    api: {
      title: "API and keys",
      description: "Quote, sell and read the book from your own product.",
      requestAccess: "Request access",
      keysNote: "Keys are issued by hand while we are on testnet. Ask and we will set you up.",
      endpoints: "Endpoints",
      endpointsNote: "Reads are open on testnet. Selling is a transaction the holder signs in their own wallet, so the API never holds funds.",
      example: "Example: a live quote",
      exampleNote: "The same 0.001 ACRED quote the home page shows, read from the Vault just now. Amounts are whole numbers with an n on the end: USDC has 6 decimals, fund tokens have 18.",
      fields: "What the fields mean",
      fieldNotes: [
        ["verdict", "BUY, REFUSE or HALT. Only a BUY can be sold."],
        ["reason", "Why the answer is REFUSE or HALT, in plain words. Empty on a BUY."],
        ["baseBps", "Service fee, in basis points (100 bps is 1%)."],
        ["utilBps", "Pool usage: rises as more of the pool is in use."],
        ["timeBps", "Waiting time: grows with the days until the fund pays."],
        ["creditBps", "Fund risk: a fixed charge in case the fund pays late or short."],
        ["payout", "USDC the seller receives now, after the discount."],
        ["settleAt", "When the fund pays the pool, in Unix seconds."],
      ] as const,
      accessTitle: "Get a key",
    },
    testTokens: {
      title: "Get test tokens",
      body: "Your wallet is not set up for testnet yet. We will send stand-in fund tokens, add you to the allowlist and cover gas.",
      faucet: "Need test USDC to buy or deposit? Get it from Circle's faucet.",
      cta: "Get test tokens",
    },
  },

  figures: {
    skip: (n: number, unit: "days" | "hours" | "minutes" | "day" | "hour" | "minute") => `You skip ${n} ${unit}`,
    annualised: (pct: string) => `About ${pct} a year`,
    withinWeek: "Pays within a week",
    expectedReturn: "Expected return",
  },

  notFound: {
    title: "This page is not here.",
    lede: "The link may be old. Everything we have is a click away.",
    home: "Go home",
    app: "Open app",
  },
  error: {
    title: "Something went wrong.",
    lede: "Nothing was sent. Try again, and if it keeps happening, tell us.",
    retry: "Try again",
  },
} as const;
