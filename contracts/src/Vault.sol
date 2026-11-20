// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC4626} from "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ERC1155Holder} from "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
import {FundRegistry} from "./FundRegistry.sol";
import {NavOracle} from "./NavOracle.sol";
import {ClaimToken} from "./ClaimToken.sol";
import {ClaimWrapper} from "./ClaimWrapper.sol";
import {UsycSleeve} from "./UsycSleeve.sol";

/// @notice USDC vault that buys redemption claims at NAV minus a spread that
///         names its four reasons, and collects the full amount at payout.
contract Vault is ERC4626, ERC1155Holder, Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    enum Verdict {
        BUY,
        REFUSE,
        HALT
    }

    struct Quote {
        Verdict verdict;
        string reason;
        uint256 nav;
        uint64 navUpdatedAt;
        uint16 baseBps;
        uint16 utilBps;
        uint16 timeBps;
        uint16 creditBps;
        uint256 payout;
        uint256 capacityLeft;
    }

    /// @dev Carried value runs on a straight line from (t0, value0) at `rate`
    ///      until settleAt, then holds at target. Each fund keeps the sum of its
    ///      unmatured lines as two running totals, so totalAssets never loops
    ///      over open claims.
    struct Position {
        uint256 amount; // claim units held (18dp)
        uint256 cost; // USDC paid for them (6dp)
        uint256 value0; // carried value at t0 (6dp)
        uint256 target; // USDC expected at payout, at the purchase NAV (6dp)
        uint256 rate; // (target - value0) * 1e18 / (settleAt - t0)
        uint64 t0; // last checkpoint
        uint64 settleAt; // payout date, cached from ClaimToken
        bool folded; // matured and moved into maturedValue
    }

    uint256 private constant BPS = 10_000;
    uint256 private constant YEAR = 365 days;
    uint256 private constant WAD = 1e18;
    /// @dev Matured queue entries folded automatically per fund on each sale,
    ///      buy, settlement, deposit or withdrawal. fold() clears any backlog.
    uint256 private constant AUTO_FOLD = 32;

    IERC20 public immutable usdc;
    FundRegistry public immutable registry;
    NavOracle public immutable oracle;
    ClaimToken public immutable claims;
    ClaimWrapper public immutable wrapper;

    mapping(uint256 => Position) public positions;
    mapping(address => uint256) public fundCost; // USDC deployed per fund, at cost
    mapping(address => bool) public impaired;
    /// @dev Per fund: unmatured value at time t is (accBase + accRate * t) / 1e18.
    mapping(address => int256) public accBase;
    mapping(address => uint256) public accRate;
    /// @notice Per fund: targets of positions that reached their payout date and were folded.
    mapping(address => uint256) public maturedValue;
    /// @dev Per fund: claim ids in payout-date order; entries before queueHead are folded.
    mapping(address => uint256[]) private _queue;
    mapping(address => uint256) public queueHead;
    mapping(uint256 => bool) private _queued;
    mapping(uint256 => uint64) private _due;
    uint256 public deployedUsdc;
    /// @notice Where idle USDC earns Treasury yield as USYC. Zero when unused.
    UsycSleeve public sleeve;

    event ClaimSold(
        uint256 indexed claimId,
        address indexed receiver,
        uint256 amount,
        uint256 usdcPaid,
        uint256 nav,
        uint16 baseBps,
        uint16 utilBps,
        uint16 timeBps,
        uint16 creditBps
    );
    event ClaimBought(uint256 indexed claimId, address indexed buyer, uint256 amount, uint256 usdcCost);
    event ClaimSettled(uint256 indexed claimId, uint256 usdcCollected);
    event FundImpaired(address indexed fund);
    event FundRecovered(address indexed fund);
    event SleeveSet(address indexed sleeve);

    error NotBuyable(Verdict verdict, string reason);
    error BelowMinPayout(uint256 payout, uint256 minPayout);
    error AboveMaxCost(uint256 cost, uint256 maxCost);
    error ZeroAmount();
    error UnknownClaim(uint256 claimId);
    error NotHeld(uint256 claimId, uint256 held);
    error NotDue(uint64 settleAt);
    error AlreadyDue(uint64 settleAt);
    error IssuerNotFailed(address fund);
    error IssuerStillFailed(address fund);
    error NotImpaired(address fund);
    error FundNotListed(address fund);
    error SleeveNotEmpty();
    error SleeveShort();

    constructor(
        IERC20 usdc_,
        FundRegistry registry_,
        NavOracle oracle_,
        ClaimToken claims_,
        ClaimWrapper wrapper_
    ) ERC20("Earlyout USDC Vault", "eoUSDC") ERC4626(usdc_) Ownable(msg.sender) {
        usdc = usdc_;
        registry = registry_;
        oracle = oracle_;
        claims = claims_;
        wrapper = wrapper_;
    }

    // ---------------------------------------------------------------- pricing

    function quote(uint256 claimId, uint256 amount) public view returns (Quote memory q) {
        (address fund, uint64 settleAt) = claims.meta(claimId);
        if (fund == address(0)) revert UnknownClaim(claimId);
        return _quote(fund, settleAt, amount);
    }

    /// @notice Price a claim before it exists: the payout date is derived the
    ///         way IssuerStub derives it, so the Sell screen can show the
    ///         verdict before anything moves.
    function quoteFund(address fund, uint256 amount) external view returns (Quote memory) {
        FundRegistry.Terms memory t = registry.getTerms(fund);
        if (!t.listed) revert FundNotListed(fund);
        uint256 raw = block.timestamp + t.settlementDelay;
        uint64 settleAt = uint64(t.window == 0 ? raw : ((raw + t.window - 1) / t.window) * t.window);
        return _quote(fund, settleAt, amount);
    }

    function _quote(address fund, uint64 settleAt, uint256 amount) internal view returns (Quote memory q) {
        FundRegistry.Terms memory t = registry.getTerms(fund);
        (uint256 nav, uint64 updatedAt, uint8 status) = oracle.getNav(fund);

        q.nav = nav;
        q.navUpdatedAt = updatedAt;
        q.baseBps = registry.baseBps();
        q.creditBps = t.creditBps;

        uint256 assets = totalAssets();
        q.utilBps = _toBps(assets == 0 ? 0 : uint256(registry.utilSlopeBps()) * deployedUsdc / assets);

        uint256 secs = settleAt > block.timestamp ? settleAt - block.timestamp : 0;
        q.timeBps = _toBps(uint256(t.volBps) * Math.sqrt(secs * 1e18 / YEAR) / 1e9);

        uint256 spread = uint256(q.baseBps) + q.utilBps + q.timeBps + q.creditBps;
        uint256 value = amount * nav / 1e30;
        q.payout = spread >= BPS ? 0 : value * (BPS - spread) / BPS;
        q.capacityLeft = t.exposureCapUsdc > fundCost[fund] ? t.exposureCapUsdc - fundCost[fund] : 0;

        if (status == oracle.STATUS_FAILED()) return _verdict(q, Verdict.HALT, "Issuer reports failure");
        // updatedAt may sit slightly ahead of block.timestamp (oracle clock-skew allowance), so never subtract blindly
        if (nav == 0 || (block.timestamp > updatedAt && block.timestamp - updatedAt > t.maxAge)) {
            return _verdict(q, Verdict.HALT, "NAV is stale");
        }
        if (impaired[fund]) return _verdict(q, Verdict.HALT, "Fund is impaired");
        if (!t.listed) return _verdict(q, Verdict.REFUSE, "Fund not listed");
        if (amount == 0) return _verdict(q, Verdict.REFUSE, "Amount is zero");
        if (q.payout == 0 && spread < BPS) return _verdict(q, Verdict.REFUSE, "Amount too small");
        if (secs == 0) return _verdict(q, Verdict.REFUSE, "Claim is already due");
        if (spread >= BPS) return _verdict(q, Verdict.REFUSE, "Spread too wide");
        if (fundCost[fund] + q.payout > t.exposureCapUsdc) return _verdict(q, Verdict.REFUSE, "Over the fund cap");
        if (idleUsdc() + sleeveValue() < q.payout) return _verdict(q, Verdict.REFUSE, "Vault short of USDC");
        return _verdict(q, Verdict.BUY, "");
    }

    /// @notice Price a buyer pays the vault for a claim it holds: NAV minus the
    ///         time and credit terms for the time left.
    function buyPrice(uint256 claimId, uint256 amount) public view returns (uint256 cost) {
        (address fund, uint64 settleAt) = claims.meta(claimId);
        if (fund == address(0)) revert UnknownClaim(claimId);
        FundRegistry.Terms memory t = registry.getTerms(fund);
        (uint256 nav,,) = oracle.getNav(fund);
        uint256 secs = settleAt > block.timestamp ? settleAt - block.timestamp : 0;
        uint256 timeBps = uint256(t.volBps) * Math.sqrt(secs * 1e18 / YEAR) / 1e9;
        uint256 spread = timeBps + t.creditBps;
        if (spread >= BPS) spread = BPS;
        cost = amount * nav / 1e30 * (BPS - spread) / BPS;
    }

    // ---------------------------------------------------------------- trading

    /// @notice Sell `amount` of a claim to the vault. The claim moves first,
    ///         then USDC goes to `receiver`.
    function sell(uint256 claimId, uint256 amount, uint256 minPayout, address receiver)
        external
        nonReentrant
        returns (uint256 payout)
    {
        Quote memory q = quote(claimId, amount);
        if (q.verdict != Verdict.BUY) revert NotBuyable(q.verdict, q.reason);
        if (q.payout < minPayout) revert BelowMinPayout(q.payout, minPayout);
        payout = q.payout;

        (address fund, uint64 settleAt) = claims.meta(claimId);
        claims.safeTransferFrom(msg.sender, address(this), claimId, amount, "");

        _fold(fund, AUTO_FOLD);
        Position storage p = positions[claimId];
        uint256 v;
        if (p.amount == 0) {
            p.settleAt = settleAt;
            if (!_queued[claimId]) _enqueue(fund, claimId, settleAt);
        } else {
            v = positionValue(claimId);
            _removeAccrual(fund, p);
        }
        p.amount += amount;
        p.cost += payout;
        p.value0 = v + payout;
        p.target += amount * q.nav / 1e30;
        p.t0 = uint64(block.timestamp);
        _addAccrual(fund, p);
        fundCost[fund] += payout;
        deployedUsdc += payout;

        _ensureIdle(payout);
        usdc.safeTransfer(receiver, payout);
        emit ClaimSold(claimId, receiver, amount, payout, q.nav, q.baseBps, q.utilBps, q.timeBps, q.creditBps);
    }

    /// @notice Buy `amount` of a claim the vault holds. Buyer must be allowlisted on ClaimToken.
    function buy(uint256 claimId, uint256 amount, uint256 maxCost) external nonReentrant returns (uint256 cost) {
        if (amount == 0) revert ZeroAmount();
        Position storage p = positions[claimId];
        if (p.amount < amount) revert NotHeld(claimId, p.amount);
        (address fund, uint64 settleAt) = claims.meta(claimId);
        if (block.timestamp >= settleAt) revert AlreadyDue(settleAt);
        Quote memory q = quote(claimId, amount);
        if (q.verdict == Verdict.HALT) revert NotBuyable(q.verdict, q.reason);

        cost = buyPrice(claimId, amount);
        if (cost > maxCost) revert AboveMaxCost(cost, maxCost);

        _fold(fund, AUTO_FOLD);
        uint256 v = positionValue(claimId);
        _removeAccrual(fund, p);
        uint256 costShare = p.cost * amount / p.amount;
        p.value0 = v - v * amount / p.amount;
        p.target -= p.target * amount / p.amount;
        p.amount -= amount;
        p.cost -= costShare;
        p.t0 = uint64(block.timestamp);
        if (p.amount == 0) delete positions[claimId]; // the queue entry stays; fold skips it
        else _addAccrual(fund, p);
        fundCost[fund] -= costShare;
        deployedUsdc -= costShare;

        usdc.safeTransferFrom(msg.sender, address(this), cost);
        claims.safeTransferFrom(address(this), msg.sender, claimId, amount, "");
        emit ClaimBought(claimId, msg.sender, amount, cost);
    }

    /// @notice After the payout date, collect from the issuer and redeem the vault's claims.
    function settle(uint256 claimId) external nonReentrant returns (uint256 received) {
        Position memory p = positions[claimId];
        if (p.amount == 0) revert NotHeld(claimId, 0);
        (address fund, uint64 settleAt) = claims.meta(claimId);
        if (block.timestamp < settleAt) revert NotDue(settleAt);

        if (!wrapper.isCollected(claimId)) wrapper.collect(claimId);
        received = wrapper.redeem(claimId, p.amount);

        _fold(fund, AUTO_FOLD);
        Position storage s = positions[claimId];
        if (s.folded) maturedValue[fund] -= s.target;
        else _removeAccrual(fund, s);
        fundCost[fund] -= p.cost;
        deployedUsdc -= p.cost;
        delete positions[claimId];
        emit ClaimSettled(claimId, received);
    }

    /// @notice Once the oracle reports the issuer failed, write the fund's
    ///         claims down to recoveryBps of cost. One transaction, every LP.
    function markImpaired(address fund) external {
        (,, uint8 status) = oracle.getNav(fund);
        if (status != oracle.STATUS_FAILED()) revert IssuerNotFailed(fund);
        impaired[fund] = true;
        emit FundImpaired(fund);
    }

    /// @notice Owner may lift a writedown once the oracle reports the issuer is back.
    function clearImpaired(address fund) external onlyOwner {
        if (!impaired[fund]) revert NotImpaired(fund);
        (,, uint8 status) = oracle.getNav(fund);
        if (status == oracle.STATUS_FAILED()) revert IssuerStillFailed(fund);
        impaired[fund] = false;
        emit FundRecovered(fund);
    }

    // ---------------------------------------------------------------- accounting

    /// @notice The vault's carried value of a claim: linear from purchase to
    ///      payout date toward its value at the purchase NAV, flat after.
    function positionValue(uint256 claimId) public view returns (uint256) {
        Position storage p = positions[claimId];
        if (p.amount == 0) return 0;
        if (p.folded || block.timestamp >= p.settleAt) return p.target;
        return p.value0 + p.rate * (block.timestamp - p.t0) / WAD;
    }

    /// @notice Move up to `maxSteps` claims that reached their payout date out
    ///         of the fund's running totals. Anyone may call it; it never
    ///         changes totalAssets, only the gas totalAssets costs.
    function fold(address fund, uint256 maxSteps) external {
        _fold(fund, maxSteps);
    }

    function _fold(address fund, uint256 maxSteps) private {
        uint256[] storage q = _queue[fund];
        uint256 h = queueHead[fund];
        uint256 end = h + maxSteps < q.length ? h + maxSteps : q.length;
        while (h < end && _due[q[h]] <= block.timestamp) {
            uint256 id = q[h];
            Position storage p = positions[id];
            if (p.amount != 0 && !p.folded) {
                _removeAccrual(fund, p);
                maturedValue[fund] += p.target;
                p.folded = true;
            }
            _queued[id] = false;
            ++h;
        }
        queueHead[fund] = h;
    }

    function _foldAll() private {
        uint256 n = registry.fundCount();
        for (uint256 i; i < n; ++i) {
            _fold(registry.fundAt(i), AUTO_FOLD);
        }
    }

    /// @dev Appends the id and moves it back past any later payout date, so
    ///      the queue stays ordered if a fund's terms change.
    function _enqueue(address fund, uint256 claimId, uint64 settleAt) private {
        uint256[] storage q = _queue[fund];
        _due[claimId] = settleAt;
        _queued[claimId] = true;
        q.push(claimId);
        uint256 head = queueHead[fund];
        for (uint256 i = q.length - 1; i > head && _due[q[i - 1]] > settleAt; --i) {
            (q[i - 1], q[i]) = (q[i], q[i - 1]);
        }
    }

    /// @dev Sets the position's rate from value0 to target, then adds its line to the totals.
    function _addAccrual(address fund, Position storage p) private {
        if (p.target < p.value0) p.value0 = p.target; // never carry above what payout is worth
        p.rate = (p.target - p.value0) * WAD / (p.settleAt - p.t0);
        accBase[fund] += int256(p.value0 * WAD) - int256(p.rate * p.t0);
        accRate[fund] += p.rate;
    }

    function _removeAccrual(address fund, Position storage p) private {
        accBase[fund] -= int256(p.value0 * WAD) - int256(p.rate * p.t0);
        accRate[fund] -= p.rate;
    }

    // ---------------------------------------------------------------- USYC sleeve

    /// @notice Point the vault at a USYC sleeve (or zero to stop). The old
    ///         sleeve must be empty, so no value is left behind.
    function setSleeve(address sleeve_) external onlyOwner {
        if (address(sleeve) != address(0)) {
            if (sleeve.value() > 0) revert SleeveNotEmpty();
            usdc.forceApprove(address(sleeve), 0);
        }
        sleeve = UsycSleeve(sleeve_);
        if (sleeve_ != address(0)) usdc.forceApprove(sleeve_, type(uint256).max);
        emit SleeveSet(sleeve_);
    }

    /// @notice Move idle USDC into USYC.
    function sweepToSleeve(uint256 amount) external onlyOwner {
        sleeve.subscribe(amount);
    }

    /// @notice Bring at least `amount` USDC back from USYC.
    function pullFromSleeve(uint256 amount) external onlyOwner {
        sleeve.withdrawUsdc(amount);
    }

    /// @notice USYC value the vault can draw on: zero unless the sleeve also
    ///         points back at this vault, so a repointed sleeve is never
    ///         counted by two vaults.
    function sleeveValue() public view returns (uint256) {
        return _sleeveLive() ? sleeve.value() : 0;
    }

    function _sleeveLive() private view returns (bool) {
        return address(sleeve) != address(0) && sleeve.vault() == address(this);
    }

    /// @dev Tops idle USDC up from the sleeve when a payment needs more than is
    ///      idle. Repeat pulls cover a redemption fee the first one missed; each
    ///      shortfall is the fee on the last, so it shrinks to dust fast.
    function _ensureIdle(uint256 need) private {
        if (idleUsdc() >= need || !_sleeveLive()) return;
        for (uint256 i; i < 4 && idleUsdc() < need; ++i) {
            sleeve.withdrawUsdc(need - idleUsdc() + 2); // 2 units of margin for rounding on dust redemptions
        }
        if (idleUsdc() < need) revert SleeveShort();
    }

    function idleUsdc() public view returns (uint256) {
        return usdc.balanceOf(address(this));
    }

    /// @dev Idle USDC plus each open claim's carried value, or cost times
    ///      recoveryBps where the fund is impaired. Gains accrue over time, so
    ///      settlement leaves only NAV drift to realise.
    function totalAssets() public view override returns (uint256 total) {
        total = idleUsdc() + sleeveValue();
        uint256 n = registry.fundCount();
        for (uint256 i; i < n; ++i) {
            address fund = registry.fundAt(i);
            uint256 cost = fundCost[fund];
            if (cost == 0) continue;
            if (impaired[fund]) {
                total += cost * registry.getTerms(fund).recoveryBps / BPS;
                continue;
            }
            total += _fundValue(fund);
        }
    }

    /// @dev maturedValue plus the running line, with queue entries that matured
    ///      but are not folded yet swapped from their line to their target.
    function _fundValue(address fund) private view returns (uint256) {
        int256 running = accBase[fund] + int256(accRate[fund] * block.timestamp);
        uint256 matured = maturedValue[fund];
        uint256[] storage q = _queue[fund];
        for (uint256 h = queueHead[fund]; h < q.length && _due[q[h]] <= block.timestamp; ++h) {
            Position storage p = positions[q[h]];
            if (p.amount == 0 || p.folded) continue;
            running -= int256(p.value0 * WAD) + int256(p.rate * (block.timestamp - p.t0));
            matured += p.target;
        }
        return matured + (running > 0 ? uint256(running) / WAD : 0);
    }

    /// @dev Deposits and withdrawals fold matured claims first. Folding never
    ///      changes totalAssets; it only keeps the view loop short.
    function _deposit(address caller, address receiver, uint256 assets, uint256 shares) internal override {
        _foldAll();
        super._deposit(caller, receiver, assets, shares);
    }

    function _withdraw(address caller, address receiver, address owner_, uint256 assets, uint256 shares)
        internal
        override
    {
        _foldAll();
        _ensureIdle(assets);
        super._withdraw(caller, receiver, owner_, assets, shares);
    }

    /// @dev LP flows are paused while the vault's impairment flags disagree with the
    ///      oracle for a fund the vault has money in, so nobody can trade against a
    ///      share price that is about to move.
    ///      0 = open. 1 = oracle says the issuer recovered but the writedown is not
    ///      cleared yet: entries paused (a deposit now would buy the writedown cheap).
    ///      2 = oracle says the issuer failed but markImpaired has not run: entries and
    ///      exits paused (an exit now would leave the loss with the remaining LPs).
    ///      markImpaired is permissionless, so state 2 ends with one call.
    function _lpLock() internal view returns (uint8 lock) {
        uint256 n = registry.fundCount();
        uint8 failedStatus = oracle.STATUS_FAILED();
        for (uint256 i; i < n; ++i) {
            address fund = registry.fundAt(i);
            if (fundCost[fund] == 0) continue;
            (,, uint8 status) = oracle.getNav(fund);
            bool failed = status == failedStatus;
            if (failed && !impaired[fund]) return 2;
            if (!failed && impaired[fund]) lock = 1;
        }
    }

    function maxDeposit(address receiver) public view override returns (uint256) {
        return _lpLock() == 0 ? super.maxDeposit(receiver) : 0;
    }

    function maxMint(address receiver) public view override returns (uint256) {
        return _lpLock() == 0 ? super.maxMint(receiver) : 0;
    }

    function maxWithdraw(address owner_) public view override returns (uint256) {
        if (_lpLock() == 2) return 0;
        return Math.min(super.maxWithdraw(owner_), idleUsdc() + sleeveValue());
    }

    function maxRedeem(address owner_) public view override returns (uint256) {
        if (_lpLock() == 2) return 0;
        return Math.min(super.maxRedeem(owner_), _convertToShares(idleUsdc() + sleeveValue(), Math.Rounding.Floor));
    }

    /// @notice USDC per one whole share, for display.
    function sharePrice() external view returns (uint256) {
        return convertToAssets(10 ** decimals());
    }

    function _decimalsOffset() internal pure override returns (uint8) {
        return 6;
    }

    // ---------------------------------------------------------------- helpers

    function _verdict(Quote memory q, Verdict v, string memory reason) private pure returns (Quote memory) {
        q.verdict = v;
        q.reason = reason;
        return q;
    }

    function _toBps(uint256 x) private pure returns (uint16) {
        return x > type(uint16).max ? type(uint16).max : uint16(x);
    }
}
