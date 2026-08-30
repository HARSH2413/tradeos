## 8. Calculations & Business Logic

All trade calculations are in [calculations.ts](file:///c:/Games/New%20folder/src/lib/calculations.ts).

### 8.1 Core Trade Formulas

#### Gross P&L
```typescript
function calculateGrossPnl(tradeType, entryPrice, exitPrice, quantity) {
  const priceDiff = tradeType === "buy" 
    ? exitPrice - entryPrice    // Long: profit when price goes up
    : entryPrice - exitPrice    // Short: profit when price goes down
  return priceDiff * quantity
}
```
**Example**: BUY NIFTY, entry=24000, exit=24100, qty=50 → `(24100-24000)*50 = ₹5,000`

#### Net P&L
```typescript
function calculateNetPnl(grossPnl, brokerage, taxes) {
  return grossPnl - brokerage - taxes
}
```
**Example**: gross=₹5000, brokerage=₹40, taxes=₹20 → `5000-40-20 = ₹4,940`

#### Capital Used
```typescript
function calculateCapitalUsed(entryPrice, quantity) {
  return entryPrice * quantity
}
```
If `capitalUsedOverride` is provided (manual input), that value is used instead.

#### Capital Used %
```typescript
function calculateCapitalUsedPercent(capitalUsed, availableCapital) {
  if (!availableCapital) return 0
  return (capitalUsed / availableCapital) * 100
}
```

#### Trade Return %
```typescript
function calculateTradeReturnPercent(netPnl, capitalUsed) {
  if (!capitalUsed) return 0
  return (netPnl / capitalUsed) * 100
}
```
**Example**: netPnl=₹4940, capitalUsed=₹1,200,000 → `(4940/1200000)*100 = 0.41%`

#### Daily P&L %
```typescript
function calculateDailyPnlPercent(dayNetPnl, availableCapital) {
  if (!availableCapital) return 0
  return (dayNetPnl / availableCapital) * 100
}
```

#### Win Rate
```typescript
function calculateWinRate(trades) {
  if (!trades.length) return 0
  const winningTrades = trades.filter(t => t.net_pnl > 0).length
  return (winningTrades / trades.length) * 100
}
```

#### Profit Factor
```typescript
function calculateProfitFactor(trades) {
  const grossProfit = sum(trades where net_pnl > 0)
  const grossLoss = |sum(trades where net_pnl < 0)|
  if (!grossLoss) return grossProfit > 0 ? grossProfit : 0
  return grossProfit / grossLoss
}
```

> [!WARNING]
> When `grossLoss === 0`, profit factor returns `grossProfit` directly (not Infinity). On the dashboard, this edge case is handled differently: `grossLoss === 0 ? (grossProfit > 0 ? 999 : 0)`.

#### Trade Result
```typescript
function getTradeResult(netPnl): "WIN" | "LOSS" | "BREAKEVEN" {
  if (netPnl > 0) return "WIN"
  if (netPnl < 0) return "LOSS"
  return "BREAKEVEN"
}
```

#### `calculateTradeFields()` — Master Function
Orchestrates all of the above into one call. Used by both the live preview in `TradeForm` (client) and the server action:
```typescript
function calculateTradeFields({ tradeType, entryPrice, exitPrice, quantity, 
                                 brokerage, taxes, availableCapital, capitalUsedOverride }) {
  const capitalUsed = capitalUsedOverride ?? calculateCapitalUsed(entryPrice, quantity)
  const grossPnl = calculateGrossPnl(tradeType, entryPrice, exitPrice, quantity)
  const netPnl = calculateNetPnl(grossPnl, brokerage, taxes)
  return {
    capitalUsed,
    capitalUsedPercent: calculateCapitalUsedPercent(capitalUsed, availableCapital),
    grossPnl,
    netPnl,
    tradeReturnPercent: calculateTradeReturnPercent(netPnl, capitalUsed),
    result: getTradeResult(netPnl),
  }
}
```

### 8.2 `toNumber()` — Safe Parser
```typescript
function toNumber(value) {
  const parsed = Number(value ?? 0)
  return Number.isFinite(parsed) ? parsed : 0
}
```
Returns 0 for `null`, `undefined`, `NaN`, `Infinity`.

### 8.3 Financial Model

This section defines the centralized engine rules used across TradeOS to calculate performance. 

**CORE BUSINESS RULE**: Deposits and withdrawals are *external cash flows*. They alter equity, but they *never* count as trading performance. Only closed trades affect performance metrics.

#### 1. Net Contributions
Total external capital put into the account.
`Net Contributions = Total Deposited - Total Withdrawn`

#### 2. Trading P&L
Total profit or loss generated exclusively from trading activity.
`Trading P&L = SUM(all closed trade net P&L)`
*Withdrawals and deposits do not affect this number.*

#### 3. Equity
The current total value of the trading account.
`Equity = Net Contributions + Trading P&L`

#### 4. Cash Flows
Capital transactions (deposits and withdrawals) are applied to the running equity on the day they occur, adjusting the capital base for future return calculations.

#### 5. Daily Return
Cash-flow adjusted return for a single day.
`Beginning Equity = Yesterday's Ending Equity (or today's deposit if first day)`
`Daily Return = (Today's Net P&L / Beginning Equity) * 100`

#### 6. Monthly & Overall Return (TWR)
TradeOS uses Time-Weighted Return (TWR) to link daily returns together, neutralizing the distorting effects of external cash flows (deposits/withdrawals) when measuring performance over time.
`Overall Return = [(1 + Day1_Return) * (1 + Day2_Return) * ... * (1 + DayN_Return) - 1] * 100`

#### 7. Drawdown
Measures the account's decline from its historical peak equity.
`Drawdown Amount = Current Equity - Peak Equity`
`Drawdown % = (Drawdown Amount / Peak Equity) * 100`
*If Current Equity >= Peak Equity, Drawdown is 0.*

#### 8. Trade Return
Return on capital for a specific individual trade.
`Trade Return = (Net P&L / Capital Used) * 100`

### 8.4 Formatting Functions

| Function | Input | Output | Example |
|---|---|---|---|
| `formatCurrency(value)` | number | `₹1,00,000.00` (en-IN INR) | `formatCurrency(100000)` → `"₹1,00,000.00"` |
| `formatCompactCurrency(value)` | number | `₹1L` (compact) | `formatCompactCurrency(100000)` → `"₹1L"` |
| `formatPercentage(value)` | number | `+12.34%` or `-5.67%` | `formatPercentage(12.34)` → `"+12.34%"` |
| `formatDate(date)` | string/Date | `21 Aug 2026` (en-IN) | |

---

