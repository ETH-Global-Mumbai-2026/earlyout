export const SITE_URL = "https://earlyout.vercel.app";
export const SITE_NAME = "Earlyout";
export const SITE_TAGLINE = "Your redemption, paid today.";
export const SITE_DESCRIPTION =
  "Sell a pending redemption in a tokenized fund for USDC today. The price is the fund's Chainlink NAV minus a spread that names its four reasons, settled on Arc in one transaction.";

/// Testnet preview: shows the site-wide strip and the test-token helpers.
/// Set NEXT_PUBLIC_TESTNET=false at mainnet.
export const TESTNET = process.env.NEXT_PUBLIC_TESTNET !== "false";

// PLACEHOLDER: owner to replace before launch.
export const PLATFORM_CONTACT_EMAIL = "platforms@example.com";

/// Circle's public faucet, which serves test USDC on Arc testnet.
export const ARC_USDC_FAUCET_URL = "https://faucet.circle.com";

export const PUBLIC_ROUTES = [
  "/",
  "/holders",
  "/liquidity",
  "/platforms",
  "/docs",
  "/security",
  "/company",
  "/legal",
  "/sell",
  "/sales",
  "/vault",
  "/positions",
  "/book",
  "/buy",
  "/status",
  "/api-access",
];
