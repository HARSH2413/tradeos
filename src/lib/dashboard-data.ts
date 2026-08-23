type QueryResult = {
  data: unknown
  count?: number | null
  error: { message: string } | null
}

type AppQuery = PromiseLike<QueryResult> & {
  select(columns?: string, options?: { count?: "exact" | "planned" | "estimated" }): AppQuery
  insert(values: unknown): AppQuery
  update(values: Record<string, unknown>): AppQuery
  delete(): AppQuery
  eq(column: string, value: unknown): AppQuery
  gte(column: string, value: unknown): AppQuery
  lte(column: string, value: unknown): AppQuery
  order(column: string, options?: { ascending?: boolean }): AppQuery
  upsert(values: unknown, options?: { onConflict?: string }): AppQuery
  range(from: number, to: number): AppQuery
  limit(count: number): AppQuery
  maybeSingle(): PromiseLike<QueryResult>
  single(): PromiseLike<QueryResult>
}

export type AppSupabase = {
  auth: {
    getUser(): Promise<{
      data: {
        user: {
          id: string
          email?: string
          user_metadata: Record<string, unknown>
        } | null
      }
    }>
    getSession(): Promise<{
      data: {
        session: {
          user: {
            id: string
            email?: string
          }
        } | null
      }
    }>
    signOut(): Promise<unknown>
  }
  from(table: string): AppQuery
  rpc(fn: string, args?: unknown): PromiseLike<QueryResult>
}

export type AppTrade = {
  id: string
  user_id: string
  trading_day_id: string | null
  strategy_id: string | null
  date: string
  symbol: string
  trade_type: "buy" | "sell"
  entry_price: number
  exit_price: number
  quantity: number
  notional_value: number
  brokerage: number
  taxes: number
  capital_used: number
  capital_used_percent: number
  gross_pnl: number
  net_pnl: number
  trade_return_percent: number
  trade_review_score: number | null
  notes: string | null
  created_at: string
  strategies?: { name: string } | null
}

export type AppSettings = {
  id: string
  user_id: string
  default_brokerage: number
  default_tax: number
}

export type AppStrategy = {
  id: string
  user_id: string
  name: string
  market: string | null
  conditions: string | null
  entry_rules: string | null
  stop_loss_rules: string | null
  target_rules: string | null
  notes: string | null
}

export type AppRule = {
  id: string
  user_id: string
  category: "entry" | "exit" | "risk_management" | "psychology"
  title: string
  description: string | null
  created_at: string
}

export type AppProfile = {
  id: string
  email: string
  full_name: string | null
}

export type AppTradingDay = {
  id: string
  user_id: string
  date: string
  pre_market_completed: boolean
  post_market_completed: boolean
  
  market_bias: "bullish" | "bearish" | "neutral" | null
  expected_market: "trend" | "range" | "volatile" | null
  watchlist: string[] | null
  important_levels: { type: string; price: number }[] | null
  pdh: number | null
  pdl: number | null
  support: number | null
  resistance: number | null
  market_factors: string[] | null
  factors_notes: string | null
  plan_goal: string | null
  plan_setup: string | null
  plan_avoid: string | null
  rules_for_today: string | null
  
  market_behaviour: "yes" | "partially" | "no" | null
  plan_followed: "yes" | "partially" | "no" | null
  biggest_mistake: string | null
  biggest_achievement: string | null
  biggest_learning: string | null
  tomorrow_focus: string | null
  overall_day_rating: number | null
  reflection: string | null
  
  daily_score: number | null
  planning_score: number | null
  execution_score: number | null
  discipline_score: number | null
  
  created_at: string
  updated_at: string
}

export type AppCapitalTransaction = {
  id: string
  user_id: string
  transaction_type: "deposit" | "withdrawal"
  amount: number
  balance_after: number
  date: string
  notes: string | null
  created_at: string
}

export type AppDailyAiSummary = {
  id: string
  trading_day_id: string
  user_id: string
  summary: string | null
  strength: string | null
  weakness: string | null
  generated_at: string
}

export type AppDailyRuleAdherence = {
  id: string
  user_id: string
  date: string
  rule_id: string
  checked: boolean
  created_at: string
}

export function asAppSupabase(client: unknown) {
  return client as AppSupabase
}
