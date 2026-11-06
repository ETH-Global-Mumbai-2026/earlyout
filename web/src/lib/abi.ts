import { parseAbi } from "viem";

/// Exactly the surface the app and indexer use. Verified against
/// contracts/out after each build; see scripts/check-abi.ts.
export const quoteStruct =
  "struct Quote { uint8 verdict; string reason; uint256 nav; uint64 navUpdatedAt; uint16 baseBps; uint16 utilBps; uint16 timeBps; uint16 creditBps; uint256 payout; uint256 capacityLeft; }";

export const termsStruct =
  "struct Terms { bool listed; uint64 settlementDelay; uint64 window; uint64 maxAge; uint16 volBps; uint16 creditBps; uint16 recoveryBps; uint256 exposureCapUsdc; string symbol; }";

export const erc20Abi = parseAbi([
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function balanceOf(address) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
]);

export const fundTokenAbi = parseAbi([
  "function allowlisted(address) view returns (bool)",
  "function setAllowlisted(address account, bool allowed)",
  "function mint(address to, uint256 amount)",
]);

export const registryAbi = parseAbi([
  termsStruct,
  "function funds() view returns (address[])",
  "function getTerms(address fund) view returns (Terms)",
  "function baseBps() view returns (uint16)",
  "function utilSlopeBps() view returns (uint16)",
]);

export const oracleAbi = parseAbi([
  "function getNav(address fund) view returns (uint256 nav, uint64 updatedAt, uint8 status)",
  "function forwarder() view returns (address)",
  "function onReport(bytes metadata, bytes report)",
  "event NavUpdated(address indexed fund, uint256 nav, uint64 updatedAt, uint8 status)",
]);

export const issuerAbi = parseAbi([
  "function failed() view returns (bool)",
  "function setFailed(bool failed)",
]);

export const claimTokenAbi = parseAbi([
  "function claimId(address fund, uint64 settleAt) pure returns (uint256)",
  "function balanceOf(address account, uint256 id) view returns (uint256)",
  "function isApprovedForAll(address account, address operator) view returns (bool)",
  "function setApprovalForAll(address operator, bool approved)",
  "function setAllowlisted(address account, bool allowed)",
  "function allowlisted(address) view returns (bool)",
]);

export const wrapperAbi = parseAbi([
  "function deposit(address fund, uint256 amount) returns (uint256 claimId)",
  "function isCollected(uint256 claimId) view returns (bool)",
  "function depositAndSell(address fund, uint256 amount, uint256 minPayout) returns (uint256 claimId, uint256 payout)",
  "function claimFund(uint256 claimId) view returns (address)",
  "function claimSettleAt(uint256 claimId) view returns (uint64)",
  "event ClaimMinted(uint256 indexed claimId, address indexed fund, uint64 settleAt, address indexed owner, uint256 amount)",
]);

export const vaultAbi = parseAbi([
  quoteStruct,
  "function quote(uint256 claimId, uint256 amount) view returns (Quote)",
  "function quoteFund(address fund, uint256 amount) view returns (Quote)",
  "function sell(uint256 claimId, uint256 amount, uint256 minPayout, address receiver) returns (uint256)",
  "function buyPrice(uint256 claimId, uint256 amount) view returns (uint256)",
  "function sharePrice() view returns (uint256)",
  "function buy(uint256 claimId, uint256 amount, uint256 maxCost) returns (uint256)",
  "function settle(uint256 claimId) returns (uint256)",
  "function markImpaired(address fund)",
  "function impaired(address fund) view returns (bool)",
  "function fundCost(address fund) view returns (uint256)",
  "function deployedUsdc() view returns (uint256)",
  "function totalAssets() view returns (uint256)",
  "function totalSupply() view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function balanceOf(address) view returns (uint256)",
  "function convertToAssets(uint256 shares) view returns (uint256)",
  "function convertToShares(uint256 assets) view returns (uint256)",
  "function maxWithdraw(address owner) view returns (uint256)",
  "function maxDeposit(address receiver) view returns (uint256)",
  "function deposit(uint256 assets, address receiver) returns (uint256)",
  "function withdraw(uint256 assets, address receiver, address owner) returns (uint256)",
  "function asset() view returns (address)",
  "event ClaimSold(uint256 indexed claimId, address indexed receiver, uint256 amount, uint256 usdcPaid, uint256 nav, uint16 baseBps, uint16 utilBps, uint16 timeBps, uint16 creditBps)",
  "event ClaimBought(uint256 indexed claimId, address indexed buyer, uint256 amount, uint256 usdcCost)",
  "event ClaimSettled(uint256 indexed claimId, uint256 usdcCollected)",
  "event FundImpaired(address indexed fund)",
]);
