/**
 * ═══════════════════════════════════════════════════════════════
 * TradeOS Financial Model — Single Source of Truth
 * ═══════════════════════════════════════════════════════════════
 *
 * Every financial number in TradeOS maps to exactly one of these concepts.
 * If you are adding a new metric, it MUST derive from one of these.
 *
 * ───────────────────────────────────────────────────────────────
 * 1. NET CONTRIBUTIONS
 *    = Total Deposits − Total Withdrawals
 *    "How much net external money have I put into TradeOS?"
 *
 *    Example:
 *      Deposit      ₹20,000
 *      Deposit      ₹20,000
 *      Withdrawal    ₹5,000
 *      ─────────────────────
 *      Net          ₹35,000
 *
 *    This is NOT performance. A ₹20,000 deposit ≠ ₹20,000 profit.
 *
 * ───────────────────────────────────────────────────────────────
 * 2. TRADING P&L (cumulative)
 *    = SUM(all closed trades' net_pnl)
 *    "How much money has my trading generated or lost?"
 *
 *    Example:
 *      Trade 1       +₹1,000
 *      Trade 2       −₹500
 *      Trade 3       +₹2,000
 *      ─────────────────────
 *      Trading P&L   +₹2,500
 *
 *    Generated entirely by trading activity.
 *
 * ───────────────────────────────────────────────────────────────
 * 3. EQUITY
 *    = Net Contributions + Trading P&L
 *    "How much is my trading account worth right now?"
 *
 *    Example:
 *      Net Contributions   ₹40,000
 *      Trading P&L         ₹20,000
 *      ──────────────────────────
 *      Equity              ₹60,000
 *
 *    A deposit increases Equity but does NOT increase Trading P&L.
 *    ₹60,000 equity ≠ ₹60,000 profit.
 *
 * ───────────────────────────────────────────────────────────────
 * 4. CAPITAL USED (per trade)
 *    = entry_price × quantity
 *    "How much notional exposure did this trade consume?"
 *
 * 5. CAPITAL USED % (per trade)
 *    = capital_used / equity_at_trade_date × 100
 *    "What fraction of my account did this trade risk?"
 *
 * 6. TRADE RETURN % (per trade)
 *    = net_pnl / capital_used × 100
 *    "What was the return on the capital deployed in this trade?"
 *
 * ═══════════════════════════════════════════════════════════════
 */

// ---------------------------------------------------------------------------
// Branded types — these carry no runtime cost but enforce semantic clarity
// in function signatures. You cannot accidentally pass TradingPnL where
// NetContributions is expected without an explicit cast.
// ---------------------------------------------------------------------------

/** Net Contributions = Total Deposits − Total Withdrawals */
export type NetContributions = number

/** Cumulative Trading P&L = SUM(all closed trades' net_pnl) */
export type TradingPnL = number

/** Equity = Net Contributions + Trading P&L */
export type Equity = number

// ---------------------------------------------------------------------------
// Core derivations
// ---------------------------------------------------------------------------

/**
 * Calculate Equity from its two components.
 *
 * Equity = Net Contributions + Trading P&L
 *
 * @param netContributions — Total Deposits minus Total Withdrawals
 * @param tradingPnl       — SUM of all closed trades' net_pnl
 */
export function calculateEquity(
  netContributions: NetContributions,
  tradingPnl: TradingPnL,
): Equity {
  return netContributions + tradingPnl
}
