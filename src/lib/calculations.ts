import type { Database } from "@/lib/supabase/types"

export type TradeResult = "WIN" | "LOSS" | "BREAKEVEN"
export type TradeType = "buy" | "sell"

export type TradeLike = Pick<
  Database["public"]["Tables"]["trades"]["Row"],
  "net_pnl" | "gross_pnl" | "trade_return_percent"
>

export function toNumber(value: FormDataEntryValue | number | string | null | undefined) {
  const parsed = Number(value ?? 0)
  return Number.isFinite(parsed) ? parsed : 0
}

export function calculateGrossPnl(
  tradeType: TradeType,
  entryPrice: number,
  exitPrice: number,
  quantity: number
) {
  const priceDiff = tradeType === "buy" ? exitPrice - entryPrice : entryPrice - exitPrice
  return priceDiff * quantity
}

export function calculateNetPnl(grossPnl: number, brokerage: number, taxes: number) {
  return grossPnl - brokerage - taxes
}

export function calculateNotionalValue(entryPrice: number, quantity: number) {
  return entryPrice * quantity
}

export function calculateCapitalUsed(entryPrice: number, quantity: number) {
  return entryPrice * quantity
}

/**
 * Capital Used % = capital_used / equity × 100
 * See: src/lib/financial-model.ts for definition of Equity.
 */
export function calculateCapitalUsedPercent(capitalUsed: number, equity: number) {
  if (!equity) {
    return 0
  }

  return (capitalUsed / equity) * 100
}

export function calculateTradeReturnPercent(netPnl: number, capitalUsed: number) {
  if (!capitalUsed) {
    return 0
  }

  return (netPnl / capitalUsed) * 100
}

/**
 * Daily P&L % = today's net P&L / equity × 100
 * See: src/lib/financial-model.ts for definition of Equity.
 */
export function calculateDailyPnlPercent(dayNetPnl: number, equity: number) {
  if (!equity) {
    return 0
  }

  return (dayNetPnl / equity) * 100
}

export function calculateWinRate(trades: Pick<TradeLike, "net_pnl">[]) {
  if (!trades.length) {
    return 0
  }

  const winningTrades = trades.filter((trade) => trade.net_pnl > 0).length
  return (winningTrades / trades.length) * 100
}

export function calculateProfitFactor(trades: TradeLike[]) {
  const grossProfit = trades
    .filter((trade) => trade.net_pnl > 0)
    .reduce((sum, trade) => sum + trade.net_pnl, 0)
  const grossLoss = Math.abs(
    trades
      .filter((trade) => trade.net_pnl < 0)
      .reduce((sum, trade) => sum + trade.net_pnl, 0)
  )

  if (grossLoss === 0) {
    return grossProfit > 0 ? Infinity : 0
  }

  return grossProfit / grossLoss
}

export function formatProfitFactor(factor: number) {
  if (factor === Infinity) return "999.00"
  return factor.toFixed(2)
}

export function getTradeResult(netPnl: number): TradeResult {
  if (netPnl > 0) {
    return "WIN"
  }

  if (netPnl < 0) {
    return "LOSS"
  }

  return "BREAKEVEN"
}

/**
 * Compute all derived fields for a trade.
 * `equity` is the account equity at the trade date (Net Contributions + P&L up to that date).
 * See: src/lib/financial-model.ts
 */
export function calculateTradeFields({
  tradeType,
  entryPrice,
  exitPrice,
  quantity,
  brokerage,
  taxes,
  equity,
  capitalUsedOverride,
}: {
  tradeType: TradeType
  entryPrice: number
  exitPrice: number
  quantity: number
  brokerage: number
  taxes: number
  /** Account equity at the trade date — see financial-model.ts */
  equity: number
  capitalUsedOverride?: number
}) {
  const notionalValue = calculateNotionalValue(entryPrice, quantity)
  const capitalUsed = capitalUsedOverride !== undefined ? capitalUsedOverride : notionalValue
  const grossPnl = calculateGrossPnl(tradeType, entryPrice, exitPrice, quantity)
  const netPnl = calculateNetPnl(grossPnl, brokerage, taxes)

  return {
    notionalValue,
    capitalUsed,
    capitalUsedPercent: calculateCapitalUsedPercent(capitalUsed, equity),
    grossPnl,
    netPnl,
    tradeReturnPercent: calculateTradeReturnPercent(netPnl, capitalUsed),
    result: getTradeResult(netPnl),
  }
}

export type DailyPerformanceRecord = {
  date: string
  beginning_equity: number
  deposits: number
  withdrawals: number
  net_pnl: number
  ending_equity: number
  return_percent: number
}

export function generateDailyPerformanceRecords(
  trades: { date: string; net_pnl: number }[],
  capitalTxs: { date: string; transaction_type: string; amount: number }[],
  startingEquity = 0
): DailyPerformanceRecord[] {
  const allDates = new Set<string>()
  const tradesByDay = new Map<string, number>()
  
  for (const t of trades) {
    const d = t.date.slice(0, 10)
    allDates.add(d)
    tradesByDay.set(d, (tradesByDay.get(d) ?? 0) + Number(t.net_pnl))
  }
  
  const depositsByDay = new Map<string, number>()
  const withdrawalsByDay = new Map<string, number>()
  
  for (const tx of capitalTxs) {
    const d = tx.date.slice(0, 10)
    allDates.add(d)
    if (tx.transaction_type === "deposit") {
      depositsByDay.set(d, (depositsByDay.get(d) ?? 0) + Number(tx.amount))
    } else if (tx.transaction_type === "withdrawal") {
      withdrawalsByDay.set(d, (withdrawalsByDay.get(d) ?? 0) + Number(tx.amount))
    }
  }

  const sortedDates = Array.from(allDates).sort()
  const records: DailyPerformanceRecord[] = []
  
  let runningEquity = startingEquity
  
  for (const date of sortedDates) {
    const dayPnl = tradesByDay.get(date) ?? 0
    const dayDeposits = depositsByDay.get(date) ?? 0
    const dayWithdrawals = withdrawalsByDay.get(date) ?? 0
    
    // If running equity is <= 0 (e.g. first day), deposits act as the beginning equity
    const beginningEquity = runningEquity > 0 ? runningEquity : (dayDeposits - dayWithdrawals)
    
    let returnPercent = 0
    if (beginningEquity > 0) {
      returnPercent = (dayPnl / beginningEquity) * 100
    }
    
    runningEquity = runningEquity + dayPnl + dayDeposits - dayWithdrawals
    
    records.push({
      date,
      beginning_equity: beginningEquity,
      deposits: dayDeposits,
      withdrawals: dayWithdrawals,
      net_pnl: dayPnl,
      ending_equity: runningEquity,
      return_percent: returnPercent
    })
  }
  
  return records
}

export function calculatePerformanceReturn(
  trades: { date: string; net_pnl: number }[],
  capitalTxs: { date: string; transaction_type: string; amount: number }[]
) {
  const records = generateDailyPerformanceRecords(trades, capitalTxs)
  
  let twrMultiplier = 1
  for (const record of records) {
    twrMultiplier *= (1 + record.return_percent / 100)
  }
  
  return (twrMultiplier - 1) * 100
}

export function calculateMaxDrawdown(records: DailyPerformanceRecord[]): number {
  let peak = 0
  let maxDrawdown = 0

  for (const record of records) {
    if (record.ending_equity > peak) {
      peak = record.ending_equity
    }
    
    if (peak > 0) {
      const drawdown = ((record.ending_equity - peak) / peak) * 100
      if (drawdown < maxDrawdown) {
        maxDrawdown = drawdown
      }
    }
  }

  return maxDrawdown
}

export function calculateCurrentDrawdown(records: DailyPerformanceRecord[]): { amount: number, percent: number } {
  let peak = 0
  
  for (const record of records) {
    if (record.ending_equity > peak) {
      peak = record.ending_equity
    }
  }

  if (records.length === 0 || peak === 0) {
    return { amount: 0, percent: 0 }
  }

  const currentEquity = records[records.length - 1].ending_equity
  const amount = currentEquity - peak
  const percent = (amount / peak) * 100

  return { amount, percent }
}


