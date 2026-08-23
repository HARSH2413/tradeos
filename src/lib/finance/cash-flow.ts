import type { AppSupabase } from "@/lib/dashboard-data"

/**
 * Net Contributions = Total Deposits - Total Withdrawals
 * This fetches the latest running balance from capital_transactions.
 */
export async function getNetContributions(supabase: AppSupabase, userId: string): Promise<number> {
  const { data } = await supabase
    .from("capital_transactions")
    .select("balance_after")
    .eq("user_id", userId)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  const row = data as { balance_after: number } | null
  return Number(row?.balance_after ?? 0)
}

/**
 * Fetches the Net Contributions (balance_after) at or before a specific date.
 */
export async function getNetContributionsAtDate(
  supabase: AppSupabase,
  userId: string,
  date: string
): Promise<number> {
  const { data } = await supabase
    .from("capital_transactions")
    .select("balance_after")
    .eq("user_id", userId)
    .lte("date", date)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  const row = data as { balance_after: number } | null
  return Number(row?.balance_after ?? 0)
}
