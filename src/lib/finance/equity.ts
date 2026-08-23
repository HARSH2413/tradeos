import type { AppSupabase } from "@/lib/dashboard-data"
import { getNetContributions, getNetContributionsAtDate } from "./cash-flow"
import { getCumulativePnl, getCumulativePnlAtDate } from "./performance"

/**
 * Equity = Net Contributions + Cumulative Trading P&L
 * This represents the total value of the account.
 */
export async function getEquity(supabase: AppSupabase, userId: string): Promise<number> {
  const [netContributions, cumulativePnl] = await Promise.all([
    getNetContributions(supabase, userId),
    getCumulativePnl(supabase, userId)
  ])

  return netContributions + cumulativePnl
}

/**
 * Equity at Date = Net Contributions at Date + Cumulative Trading P&L at Date
 * Replaces the old `get_capital_at_date` RPC call.
 */
export async function getEquityAtDate(
  supabase: AppSupabase,
  userId: string,
  date: string
): Promise<number> {
  const [netContributions, cumulativePnl] = await Promise.all([
    getNetContributionsAtDate(supabase, userId, date),
    getCumulativePnlAtDate(supabase, userId, date)
  ])

  return netContributions + cumulativePnl
}
