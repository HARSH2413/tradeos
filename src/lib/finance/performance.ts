import type { AppSupabase } from "@/lib/dashboard-data"

/**
 * Cumulative P&L = SUM(net_pnl) for all closed trades.
 */
export async function getCumulativePnl(supabase: AppSupabase, userId: string): Promise<number> {
  const { data } = await supabase
    .from("trades")
    .select("net_pnl")
    .eq("user_id", userId)

  const trades = (data as { net_pnl: number }[] | null) || []
  return trades.reduce((sum, trade) => sum + Number(trade.net_pnl), 0)
}

/**
 * Fetches the Cumulative P&L up to a specific date (inclusive).
 */
export async function getCumulativePnlAtDate(
  supabase: AppSupabase,
  userId: string,
  date: string
): Promise<number> {
  const { data } = await supabase
    .from("trades")
    .select("net_pnl")
    .eq("user_id", userId)
    .lte("date", date)

  const trades = (data as { net_pnl: number }[] | null) || []
  return trades.reduce((sum, trade) => sum + Number(trade.net_pnl), 0)
}
