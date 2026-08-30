## 9. End-to-End Workflows

### 9.1 Adding a Trade

```
1. User clicks "Add Trade" button on /trades
   → TradeForm dialog opens (open=true)

2. User fills: date=2026-08-21, symbol=NIFTY, buy, entry=24000, exit=24100, qty=50
   → useMemo runs calculateTradeFields() on every keystroke
   → Live preview shows: Gross P&L=₹5000, Capital Used=₹12,00,000, etc.

3. User checks "FOMO" mistake, sets "Entry rule" as "followed", adds notes

4. User clicks "Save Trade"
   → form action calls createTrade(formData)
   
5. Server Action (createTrade):
   → getSupabaseSession() → validate user
   → supabase.rpc("get_capital_at_date", { user_id, date: "2026-08-21" })
   → calculateTradeFields({ ..., availableCapital })
   → Check: supabase.from("trading_days").select("id")
             .eq(user_id).eq(date).eq(symbol).maybeSingle()
   
   IF no journal exists:
     → return { needsJournal: true }
     → Client shows window.confirm("No journal exists. Create one?")
     → If YES: calls upsertTradingDay(), then retries createTrade()
   
   IF journal exists:
     → supabase.rpc("insert_trade_atomic", { trade_data, mistake_ids, rule_adherences })
       → DB inserts trade row
       → DB inserts trade_mistakes rows for each checked mistake
       → DB inserts trade_rule_adherence rows for each "followed"/"broken" rule
       → Returns new trade UUID
     → supabase.from("trades").update({ trading_day_id: dayId }).eq("id", tradeId)
     → revalidatePath("/dashboard", "/trades", "/calendar")
   
6. Client receives result:
   → setOpen(false) → dialog closes
   → Page revalidates → table refreshes with new trade
```

### 9.2 Daily Journal Workflow

```
1. User navigates to /journal → defaults to today's date
   
2. No journal exists → "No Journal Selected" empty state
   → User types "NIFTY" in symbol input and clicks "+" button
   → Server Action: upsertTradingDay({ date, symbol: "NIFTY", formType: "create" })
   → DB: INSERT trading_days (user_id, date, symbol="NIFTY")
   → Page reloads with NIFTY tab active, status="planning"

3. Pre-Market Plan section is open by default
   → User fills: market_bias=bullish, expected_market=trend, adds levels, checks factors
   → Clicks "Complete Pre-Market Plan"
   → Server Action: upsertTradingDay({ ..., formType: "pre_market", fields: {...} })
   → DB: UPSERT sets all fields + pre_market_completed=true
   → Status changes to "trading"

4. Trade Execution section
   → User clicks "Log Trade" → TradeForm opens with date=today, symbol=NIFTY pre-filled
   → Normal trade creation flow (see 9.1)
   → Status changes to "reviewing" (pre_market done + trades exist)

5. Post-Market Review section unlocks (was disabled: "Log at least one trade")
   → User fills: market_behaviour=yes, plan_followed=mostly, biggest mistake, rating=7/10
   → Clicks "Complete Post-Market Review"
   → Server Action: upsertTradingDay({ ..., formType: "post_market", fields: {...} })
   → DB: UPSERT sets all fields + post_market_completed=true
   → Background Task: `generateDailyAISummary()` sends day's data to Groq (`openai/gpt-oss-120b`). Returns JSON (regex-parsed to strip markdown) which is inserted into `daily_ai_summary`.
   → Status changes to "completed"
```

### 9.3 Capital Management

```
1. User clicks "Manage Funding" on dashboard
   → CapitalLedgerPanel sheet slides open
   
2. User clicks "Add / Withdraw" → dialog opens
   → Fills: type=deposit, date=2026-08-01, amount=100000, notes="Monthly addition"
   → Clicks "Save Transaction"

3. handleAddTransaction():
   → If withdrawal > currentCapital: window.confirm() warning
   → Server Action: addCapitalTransaction(formData)
     → INSERT capital_transactions with balance_after=0 (placeholder)
     → recomputeCapitalBalances():
       → Fetch ALL transactions ORDER BY date ASC
       → Running total: deposit +, withdrawal -
       → UPDATE each row where balance_after differs
     → revalidatePath("/dashboard")

4. Dashboard refreshes:
   → get_dashboard_stats RPC reads latest balance_after → net_funding
   → current_capital = net_funding + total_net_pnl
   → All KPIs recalculate
```

### 9.4 AI Analysis

```
1. User navigates to /analysis
   → Server fetches: trades, strategies, rules, mistakes, settings, last analysis
   → Passes all to <AiAnalyst> client component

2. If <5 trades: shows "Not enough data" message
   If no GROQ key: shows "API key missing" warning

3. User clicks "Regenerate Analysis" (if not locked for the week)
   → runAnalysis():
   → computeWeeklyStats() calculates this week vs last week stats
   → buildPrompts() computes:
     - Summary stats (win rate, profit factor, avg win/loss, etc.)
     - All trades formatted as text table (up to 100)
     - Strategy breakdown with win rates (no markdown tables allowed)
     - Rules organized by category
     - Week-over-week comparison data
   → fetch("https://api.groq.com/openai/v1/chat/completions", {
       model: "openai/gpt-oss-120b",
       messages: [system, user],
       temperature: 0.4, max_tokens: 4096
     })
   → Parse response into 7 markdown sections (including "Progress since last week")
   → Save to Supabase: supabase.from("ai_analysis").insert({ user_id, content, trade_count })
   → Render Week-over-Week stat cards and color-coded section cards

4. On next visit, last analysis is loaded from DB and displayed immediately
   → "Regenerate Analysis" button is disabled and reads "Next Analysis Available Sunday" if an analysis was already generated in the current week.
```

### 9.5 Account Reset

```
1. User navigates to /settings → sees Danger Zone card

2. Step 1: Click "Download Backup"
   → exportAccountData() server action → returns JSON with all data
   → Client converts trades to CSV, triggers browser download
   → `downloaded` state set to true, unlock Step 2

3. Step 2: Type "RESET" in confirmation field → click "Wipe Data"
   → Additional window.confirm() safety check
   → resetAccountData() server action:
     → DELETE FROM trades WHERE user_id
     → DELETE FROM strategies WHERE user_id
     → DELETE FROM rules WHERE user_id
     → DELETE FROM capital_transactions WHERE user_id
     → UPDATE settings SET default_brokerage=0, default_tax=0 WHERE user_id
   → revalidatePath("/settings", "/dashboard")
   → alert("Account successfully reset.")
```

---



## 10. Validation & Edge Cases

### 10.1 Input Validation

| Location | Validation | Details |
|---|---|---|
| Login (client) | Email format | `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` regex |
| Login (client) | Password strength (signup only) | Min 8 chars, 1 lowercase, 1 uppercase, 1 digit |
| `createTrade` / `updateTrade` (server) | Price/quantity > 0 | `if (entryPrice <= 0 \|\| exitPrice <= 0 \|\| quantity <= 0) throw Error` |
| `addCapitalTransaction` (server) | Amount > 0 | `if (amount <= 0) throw Error` |
| `toNumber()` | NaN/Infinity guard | Returns 0 for any non-finite number |
| Trade form (HTML) | Required fields | `required` attribute on date, symbol, entry_price, exit_price, quantity |
| Trade form (HTML) | Min values | `min="0"` on numeric inputs |
| Database | Trade type | CHECK constraint: `trade_type IN ('buy', 'sell')` |
| Database | Rule category | CHECK constraint: `category IN ('entry', 'exit', 'risk_management', 'psychology')` |
| Database | Review score | CHECK constraint: `trade_review_score >= 1 AND trade_review_score <= 10` |
| Database | Capital amount | CHECK constraint: `amount > 0` |
| Database | Transaction type | CHECK constraint: `transaction_type IN ('deposit', 'withdrawal')` |
| Database | Day rating | CHECK constraint: `overall_day_rating BETWEEN 1 AND 10` |

### 10.2 Authorization

- **Every server action** calls `getSupabaseSession()` and checks `if (!user) redirect("/login")` or `throw Error("Not authorized")`
- **Every page component** checks user existence and redirects if null
- **Middleware** protects all dashboard routes before the page even loads
- **RLS policies** provide database-level defense — even if a server action bug bypasses the user check, the DB won't return/modify other users' data
- **Trade deletion** uses double-check: `.eq("id", id).eq("user_id", user.id)` — can only delete your own

### 10.3 Missing Data Handling

| Scenario | Handling |
|---|---|
| No settings row | Defaults: `starting_capital=10000, default_brokerage=0, default_tax=0` |
| No trades | Empty tables/charts, "No trades recorded" messages |
| No strategies | "No strategy" shown as default option |
| No capital transactions | `net_funding = 0`, everything calculated from 0 |
| No journal for today | Dashboard shows "Start Today's Journal" CTA with symbol input |
| No journal for trade's date/symbol | Trade save returns `needsJournal: true`, prompts user to create one |
| Groq API key missing | Warning banner with setup instructions |
| < 5 trades for AI | "Not enough data" message |
| Month with no trades | "No trades found for [Month]" message |
| Division by zero | All calculation functions guard with `if (!divisor) return 0` |
| No profile `full_name` | Falls back to `user.user_metadata.full_name`, then shows "Trader" |
| `null` strategy on trade | Displayed as "No strategy" or "-" |

### 10.4 Error Handling

| Error Type | Handling |
|---|---|
| Server action throws | Client catches in `try/catch` and shows `alert()` or error state |
| Supabase query error | `if (error) throw new Error(error.message)` |
| Groq API error | Parsed from response body → shown in error banner |
| AI analysis save failure | `console.error()` — non-blocking, analysis still shown |
| Settings update failure | Returns `{ success: false, error: message }` → shown inline |
| Auth error | Error message shown in login form |
| Network error | Standard browser error handling |

### 10.5 Stale Data / Caching

Each page sets `revalidate` for ISR (Incremental Static Regeneration):
- Dashboard: 60s, TodayTradingStatus: 0 (always fresh)
- Trades: 60s
- Calendar: 30s
- Strategies: 30s
- Rules: 60s
- Journal: 0 (always fresh)
- Analytics: 60s
- Reports: 60s
- Settings: 30s

Server actions call `revalidatePath()` to bust the cache after mutations.

---

