-- ============================================================
-- TradeOS V1 — Supabase Migration
-- Run this entire script in the Supabase SQL Editor
-- ============================================================

-- ============================================================
-- 1. USERS TABLE
-- ============================================================
-- Mirrors auth.users with profile data
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============================================================
-- 2. SETTINGS TABLE
-- ============================================================
-- Per-user application settings (starting capital, defaults)
CREATE TABLE IF NOT EXISTS public.settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  starting_capital NUMERIC NOT NULL DEFAULT 10000,
  default_brokerage NUMERIC NOT NULL DEFAULT 0,
  default_tax NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT settings_user_id_unique UNIQUE (user_id)
);

-- ============================================================
-- 3. STRATEGIES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.strategies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  market TEXT DEFAULT '',
  conditions TEXT DEFAULT '',
  entry_rules TEXT DEFAULT '',
  stop_loss_rules TEXT DEFAULT '',
  target_rules TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============================================================
-- 4. TRADES TABLE
-- ============================================================
-- Core trade record with all manual + auto-calculated fields
CREATE TABLE IF NOT EXISTS public.trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  strategy_id UUID REFERENCES public.strategies(id) ON DELETE SET NULL,
  date DATE NOT NULL,
  symbol TEXT NOT NULL,
  trade_type TEXT NOT NULL CHECK (trade_type IN ('buy', 'sell')),
  entry_price NUMERIC NOT NULL,
  exit_price NUMERIC NOT NULL,
  quantity NUMERIC NOT NULL,
  notional_value NUMERIC NOT NULL DEFAULT 0,

  -- Manual entry (pre-filled from settings)
  brokerage NUMERIC NOT NULL DEFAULT 0,
  taxes NUMERIC NOT NULL DEFAULT 0,

  -- Auto-calculated: Capital
  capital_used NUMERIC NOT NULL DEFAULT 0,
  capital_used_percent NUMERIC NOT NULL DEFAULT 0,

  -- Auto-calculated: P&L
  gross_pnl NUMERIC NOT NULL DEFAULT 0,
  net_pnl NUMERIC NOT NULL DEFAULT 0,
  trade_return_percent NUMERIC NOT NULL DEFAULT 0,

  -- Review
  trade_review_score INTEGER CHECK (trade_review_score >= 1 AND trade_review_score <= 10),
  notes TEXT DEFAULT '',

  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Index for common queries: user trades by date
CREATE INDEX IF NOT EXISTS idx_trades_user_date ON public.trades(user_id, date DESC);
-- Index for calendar page: lookup by date
CREATE INDEX IF NOT EXISTS idx_trades_date ON public.trades(date);
-- Index for strategy analytics
CREATE INDEX IF NOT EXISTS idx_trades_strategy ON public.trades(strategy_id);

-- ============================================================
-- 5. RULES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('entry', 'exit', 'risk_management', 'psychology')),
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============================================================
-- 6. MISTAKES TABLE (Global, pre-populated)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.mistakes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE
);

-- Pre-populate mistakes
INSERT INTO public.mistakes (name) VALUES
  ('FOMO'),
  ('Overtrading'),
  ('Revenge Trading'),
  ('Early Exit'),
  ('Late Entry'),
  ('Ignored Stop Loss'),
  ('Emotional Trading')
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- 7. TRADE_MISTAKES JUNCTION TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.trade_mistakes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_id UUID NOT NULL REFERENCES public.trades(id) ON DELETE CASCADE,
  mistake_id UUID NOT NULL REFERENCES public.mistakes(id) ON DELETE CASCADE,
  CONSTRAINT trade_mistakes_unique UNIQUE (trade_id, mistake_id)
);

CREATE INDEX IF NOT EXISTS idx_trade_mistakes_trade ON public.trade_mistakes(trade_id);
CREATE INDEX IF NOT EXISTS idx_trade_mistakes_mistake ON public.trade_mistakes(mistake_id);

-- ============================================================
-- 7b. TRADE_RULE_ADHERENCE JUNCTION TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.trade_rule_adherence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_id UUID NOT NULL REFERENCES public.trades(id) ON DELETE CASCADE,
  rule_id UUID NOT NULL REFERENCES public.rules(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('followed', 'broken')),
  CONSTRAINT trade_rule_adherence_unique UNIQUE (trade_id, rule_id)
);

CREATE INDEX IF NOT EXISTS idx_trade_rule_adherence_trade ON public.trade_rule_adherence(trade_id);
CREATE INDEX IF NOT EXISTS idx_trade_rule_adherence_rule ON public.trade_rule_adherence(rule_id);



-- ============================================================
-- 8. ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Enable RLS on all user-owned tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.strategies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mistakes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trade_mistakes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trade_rule_adherence ENABLE ROW LEVEL SECURITY;

-- ---- USERS ----
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
CREATE POLICY "Users can view own profile"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ---- SETTINGS ----
CREATE POLICY "Users can view own settings"
  ON public.settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own settings"
  ON public.settings FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings"
  ON public.settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ---- STRATEGIES ----
CREATE POLICY "Users can view own strategies"
  ON public.strategies FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own strategies"
  ON public.strategies FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own strategies"
  ON public.strategies FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own strategies"
  ON public.strategies FOR DELETE
  USING (auth.uid() = user_id);

-- ---- TRADES ----
CREATE POLICY "Users can view own trades"
  ON public.trades FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own trades"
  ON public.trades FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own trades"
  ON public.trades FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own trades"
  ON public.trades FOR DELETE
  USING (auth.uid() = user_id);

-- ---- RULES ----
CREATE POLICY "Users can view own rules"
  ON public.rules FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own rules"
  ON public.rules FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own rules"
  ON public.rules FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own rules"
  ON public.rules FOR DELETE
  USING (auth.uid() = user_id);

-- ---- MISTAKES (read-only for all authenticated users) ----
CREATE POLICY "Authenticated users can view mistakes"
  ON public.mistakes FOR SELECT
  USING (auth.role() = 'authenticated');

-- ---- TRADE_MISTAKES ----
-- Users can manage trade_mistakes through their own trades
CREATE POLICY "Users can view own trade_mistakes"
  ON public.trade_mistakes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.trades
      WHERE trades.id = trade_mistakes.trade_id
      AND trades.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create own trade_mistakes"
  ON public.trade_mistakes FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.trades
      WHERE trades.id = trade_mistakes.trade_id
      AND trades.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own trade_mistakes"
  ON public.trade_mistakes FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.trades
      WHERE trades.id = trade_mistakes.trade_id
      AND trades.user_id = auth.uid()
    )
  );

-- ---- TRADE_RULE_ADHERENCE ----
CREATE POLICY "Users can view own trade_rule_adherence"
  ON public.trade_rule_adherence FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.trades
      WHERE trades.id = trade_rule_adherence.trade_id
      AND trades.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create own trade_rule_adherence"
  ON public.trade_rule_adherence FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.trades
      WHERE trades.id = trade_rule_adherence.trade_id
      AND trades.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own trade_rule_adherence"
  ON public.trade_rule_adherence FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.trades
      WHERE trades.id = trade_rule_adherence.trade_id
      AND trades.user_id = auth.uid()
    )
  );


-- ============================================================
-- 9. TRIGGERS: Auto-create user profile + default settings
-- ============================================================

-- Function: Create a public.users row when a new auth.users row is created
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Create user profile
  INSERT INTO public.users (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', '')
  );

  -- Create default settings (₹10,000 starting capital)
  INSERT INTO public.settings (user_id, starting_capital, default_brokerage, default_tax)
  VALUES (NEW.id, 10000, 0, 0);

  RETURN NEW;
END;
$$;

-- Trigger: Fire on new auth.users insert
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();


-- ============================================================
-- 10. HELPER FUNCTION: Auto-update updated_at on settings
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER settings_updated_at
  BEFORE UPDATE ON public.settings
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();


-- ============================================================
-- DONE! Your TradeOS database is ready.
-- ============================================================
-- ============================================================
-- TradeOS — Performance Indexes
-- Run this in the Supabase SQL Editor to speed up queries
-- ============================================================

-- User trades by date (dashboard, calendar, reports)
CREATE INDEX IF NOT EXISTS idx_trades_user_date
  ON public.trades(user_id, date DESC);

-- Trades by date (calendar lookups)
CREATE INDEX IF NOT EXISTS idx_trades_date
  ON public.trades(date);

-- Strategy analytics
CREATE INDEX IF NOT EXISTS idx_trades_strategy
  ON public.trades(strategy_id);

-- User trades by user_id (analytics, general queries)
CREATE INDEX IF NOT EXISTS idx_trades_user_id
  ON public.trades(user_id);

-- User trades by user_id, date, symbol (for rapid hasTrades journal checks)
CREATE INDEX IF NOT EXISTS idx_trades_user_date_symbol
  ON public.trades(user_id, date, symbol);

-- Trade mistakes junction lookups
CREATE INDEX IF NOT EXISTS idx_trade_mistakes_trade_id
  ON public.trade_mistakes(trade_id);

CREATE INDEX IF NOT EXISTS idx_trade_mistakes_mistake_id
  ON public.trade_mistakes(mistake_id);

-- Settings fast lookup
CREATE INDEX IF NOT EXISTS idx_settings_user_id
  ON public.settings(user_id);

-- Strategies fast lookup by user
CREATE INDEX IF NOT EXISTS idx_strategies_user_id
  ON public.strategies(user_id);

-- Rules fast lookup by user
CREATE INDEX IF NOT EXISTS idx_rules_user_id
  ON public.rules(user_id);
-- ============================================================
-- TradeOS V2 — Database-Level Aggregations (RPC)
-- Run this script in your Supabase SQL Editor
-- ============================================================

-- Function to get Dashboard Statistics instantly at the database level
CREATE OR REPLACE FUNCTION get_dashboard_stats(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  v_stats JSON;
  v_net_funding NUMERIC := 0;
BEGIN
  -- Get latest net funding
  SELECT balance_after INTO v_net_funding
  FROM public.capital_transactions
  WHERE user_id = p_user_id
  ORDER BY date DESC, created_at DESC
  LIMIT 1;

  v_net_funding := COALESCE(v_net_funding, 0);

  WITH trade_stats AS (
    SELECT 
      COALESCE(SUM(net_pnl), 0) AS total_net_pnl,
      COALESCE(SUM(net_pnl) FILTER (WHERE date::date = CURRENT_DATE), 0) AS today_net_pnl,
      COALESCE(SUM(net_pnl) FILTER (WHERE date::date < CURRENT_DATE), 0) AS pnl_before_today,
      COUNT(*) AS total_trades,
      COUNT(*) FILTER (WHERE net_pnl > 0) AS winning_trades,
      COUNT(*) FILTER (WHERE net_pnl < 0) AS losing_trades,
      COALESCE(SUM(gross_pnl) FILTER (WHERE gross_pnl > 0), 0) AS gross_profit,
      COALESCE(SUM(gross_pnl) FILTER (WHERE gross_pnl < 0), 0) AS gross_loss
    FROM public.trades
    WHERE user_id = p_user_id
  )
  SELECT json_build_object(
    'total_net_pnl', total_net_pnl,
    'today_net_pnl', today_net_pnl,
    'pnl_before_today', pnl_before_today,
    'total_trades', total_trades,
    'winning_trades', winning_trades,
    'losing_trades', losing_trades,
    'gross_profit', gross_profit,
    'gross_loss', gross_loss,
    -- Financial model: Net Contributions = Total Deposits − Total Withdrawals
    'net_contributions', v_net_funding,
    -- Financial model: Equity = Net Contributions + Trading P&L
    'equity', v_net_funding + total_net_pnl,
    -- Financial model: Overall Return = Trading P&L / Net Contributions
    'overall_return', CASE WHEN v_net_funding > 0 THEN (total_net_pnl / v_net_funding) ELSE 0 END
  ) INTO v_stats
  FROM trade_stats;

  RETURN v_stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Function to get the Equity Curve pre-aggregated per day
CREATE OR REPLACE FUNCTION get_equity_curve(p_user_id UUID)
RETURNS TABLE (
  trade_date DATE,
  daily_net_pnl NUMERIC,
  daily_gross_pnl NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    date::date AS trade_date,
    SUM(net_pnl)::NUMERIC AS daily_net_pnl,
    SUM(gross_pnl)::NUMERIC AS daily_gross_pnl
  FROM public.trades
  WHERE user_id = p_user_id
  GROUP BY date::date
  ORDER BY date::date ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Function for Atomic Trade Insert (Trade + Mistakes + Rules)
CREATE OR REPLACE FUNCTION insert_trade_atomic(
  p_trade_data JSONB,
  p_mistake_ids UUID[],
  p_rule_adherences JSONB
)
RETURNS UUID AS $$
DECLARE
  v_trade_id UUID;
  v_mistake_id UUID;
  v_rule JSONB;
BEGIN
  -- Insert trade
  INSERT INTO public.trades (
    user_id, strategy_id, date, symbol, trade_type, entry_price, exit_price,
    quantity, brokerage, taxes, capital_used, capital_used_percent,
    gross_pnl, net_pnl, trade_return_percent, trade_review_score, notes
  )
  VALUES (
    (p_trade_data->>'user_id')::UUID,
    NULLIF(p_trade_data->>'strategy_id', '')::UUID,
    (p_trade_data->>'date')::DATE,
    (p_trade_data->>'symbol')::TEXT,
    (p_trade_data->>'trade_type')::TEXT,
    (p_trade_data->>'entry_price')::NUMERIC,
    (p_trade_data->>'exit_price')::NUMERIC,
    (p_trade_data->>'quantity')::NUMERIC,
    (p_trade_data->>'brokerage')::NUMERIC,
    (p_trade_data->>'taxes')::NUMERIC,
    (p_trade_data->>'capital_used')::NUMERIC,
    (p_trade_data->>'capital_used_percent')::NUMERIC,
    (p_trade_data->>'gross_pnl')::NUMERIC,
    (p_trade_data->>'net_pnl')::NUMERIC,
    (p_trade_data->>'trade_return_percent')::NUMERIC,
    (p_trade_data->>'trade_review_score')::NUMERIC,
    (p_trade_data->>'notes')::TEXT
  )
  RETURNING id INTO v_trade_id;

  -- Insert mistakes
  IF array_length(p_mistake_ids, 1) > 0 THEN
    FOREACH v_mistake_id IN ARRAY p_mistake_ids LOOP
      INSERT INTO public.trade_mistakes (trade_id, mistake_id)
      VALUES (v_trade_id, v_mistake_id);
    END LOOP;
  END IF;

  -- Insert rule adherences
  IF jsonb_array_length(p_rule_adherences) > 0 THEN
    FOR v_rule IN SELECT * FROM jsonb_array_elements(p_rule_adherences) LOOP
      INSERT INTO public.trade_rule_adherence (trade_id, rule_id, status)
      VALUES (v_trade_id, (v_rule->>'rule_id')::UUID, v_rule->>'status');
    END LOOP;
  END IF;

  RETURN v_trade_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Function for Atomic Trade Update (Trade + Mistakes + Rules)
CREATE OR REPLACE FUNCTION update_trade_atomic(
  p_trade_id UUID,
  p_trade_data JSONB,
  p_mistake_ids UUID[],
  p_rule_adherences JSONB
)
RETURNS VOID AS $$
DECLARE
  v_mistake_id UUID;
  v_rule JSONB;
BEGIN
  -- Update trade
  UPDATE public.trades
  SET
    strategy_id = NULLIF(p_trade_data->>'strategy_id', '')::UUID,
    date = (p_trade_data->>'date')::DATE,
    symbol = (p_trade_data->>'symbol')::TEXT,
    trade_type = (p_trade_data->>'trade_type')::TEXT,
    entry_price = (p_trade_data->>'entry_price')::NUMERIC,
    exit_price = (p_trade_data->>'exit_price')::NUMERIC,
    quantity = (p_trade_data->>'quantity')::NUMERIC,
    notional_value = (p_trade_data->>'notional_value')::NUMERIC,
    brokerage = (p_trade_data->>'brokerage')::NUMERIC,
    taxes = (p_trade_data->>'taxes')::NUMERIC,
    capital_used = (p_trade_data->>'capital_used')::NUMERIC,
    capital_used_percent = (p_trade_data->>'capital_used_percent')::NUMERIC,
    gross_pnl = (p_trade_data->>'gross_pnl')::NUMERIC,
    net_pnl = (p_trade_data->>'net_pnl')::NUMERIC,
    trade_return_percent = (p_trade_data->>'trade_return_percent')::NUMERIC,
    trade_review_score = (p_trade_data->>'trade_review_score')::NUMERIC,
    notes = (p_trade_data->>'notes')::TEXT
  WHERE id = p_trade_id AND user_id = (p_trade_data->>'user_id')::UUID;

  -- Delete old mistakes and rules
  DELETE FROM public.trade_mistakes WHERE trade_id = p_trade_id;
  DELETE FROM public.trade_rule_adherence WHERE trade_id = p_trade_id;

  -- Insert mistakes
  IF array_length(p_mistake_ids, 1) > 0 THEN
    FOREACH v_mistake_id IN ARRAY p_mistake_ids LOOP
      INSERT INTO public.trade_mistakes (trade_id, mistake_id)
      VALUES (p_trade_id, v_mistake_id);
    END LOOP;
  END IF;

  -- Insert rule adherences
  IF jsonb_array_length(p_rule_adherences) > 0 THEN
    FOR v_rule IN SELECT * FROM jsonb_array_elements(p_rule_adherences) LOOP
      INSERT INTO public.trade_rule_adherence (trade_id, rule_id, status)
      VALUES (p_trade_id, (v_rule->>'rule_id')::UUID, v_rule->>'status');
    END LOOP;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- AI ANALYSIS TABLE (Feature: AI Trade Analyst)
-- Run this block in your Supabase SQL Editor to enable the
-- AI Analyst page. It stores analysis results per user.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ai_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  trade_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.ai_analysis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own analysis"
  ON public.ai_analysis
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Index for fast latest-analysis lookup
CREATE INDEX IF NOT EXISTS idx_ai_analysis_user_created
  ON public.ai_analysis (user_id, created_at DESC);

-- ============================================================
-- TRADING DAYS TABLE (Feature: Trading Day Journal)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.trading_days (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date                  DATE NOT NULL,

  -- Status & Progress (status is now computed, not stored)
  pre_market_completed  BOOLEAN NOT NULL DEFAULT FALSE,
  post_market_completed BOOLEAN NOT NULL DEFAULT FALSE,

  -- ── PRE-MARKET FIELDS ─────────────────────────────────────────────────────
  market_bias           TEXT CHECK (market_bias IN ('bullish','bearish','neutral')),
  expected_market       TEXT CHECK (expected_market IN ('trend','range','volatile')),
  watchlist             TEXT[],

  -- Important levels: [{type:"Support", price:24320}, {type:"Liquidity", price:24380}] (Legacy)
  important_levels      JSONB DEFAULT '[]'::jsonb,

  -- New Simple Key Levels
  pdh                   NUMERIC,
  pdl                   NUMERIC,
  support               NUMERIC,
  resistance            NUMERIC,

  -- Market factors + open-ended note
  market_factors        TEXT[],
  factors_notes         TEXT,           -- "RBI tomorrow, stay light"

  -- Structured trading plan (AI-friendly)
  plan_goal             TEXT,           -- "Maximum 2 trades"
  plan_setup            TEXT,           -- "Only ORB breakout"
  plan_avoid            TEXT,           -- "Counter trend, revenge trading"

  rules_for_today       TEXT,

  -- ── POST-MARKET FIELDS ────────────────────────────────────────────────────
  market_behaviour      TEXT CHECK (market_behaviour IN ('yes','partially','no')),
  plan_followed         TEXT CHECK (plan_followed IN ('yes','partially','no')),
  biggest_mistake       TEXT,
  biggest_achievement   TEXT,
  biggest_learning      TEXT,
  tomorrow_focus        TEXT,
  overall_day_rating    INTEGER CHECK (overall_day_rating BETWEEN 1 AND 10),
  reflection            TEXT,

  -- ── FUTURE-PROOF SCORES (NULL now, used in Phase 3+) ─────────────────────
  daily_score           NUMERIC(4,1),
  planning_score        NUMERIC(4,1),
  execution_score       NUMERIC(4,1),
  discipline_score      NUMERIC(4,1),

  -- Timestamps
  created_at            TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at            TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  CONSTRAINT trading_days_user_date_unique UNIQUE (user_id, date)
);

ALTER TABLE public.trading_days ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own trading days"
  ON public.trading_days FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- DAILY AI SUMMARY TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.daily_ai_summary (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trading_day_id UUID NOT NULL REFERENCES public.trading_days(id) ON DELETE CASCADE,
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  summary        TEXT,
  strength       TEXT,
  weakness       TEXT,
  generated_at   TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.daily_ai_summary ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own daily AI summary"
  ON public.daily_ai_summary FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- TRADES TABLE MIGRATION (Link to trading_days)
-- ============================================================
ALTER TABLE public.trades
  ADD COLUMN IF NOT EXISTS trading_day_id UUID
  REFERENCES public.trading_days(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_trades_trading_day
  ON public.trades(trading_day_id);

-- ============================================================
-- CAPITAL TRANSACTIONS (DYNAMIC FUNDING)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.capital_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('deposit', 'withdrawal')),
  amount NUMERIC NOT NULL CHECK (amount > 0),
  balance_after NUMERIC NOT NULL,
  date TIMESTAMPTZ NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_capital_transactions_user_date
  ON public.capital_transactions (user_id, date DESC);

ALTER TABLE public.capital_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own capital transactions"
  ON public.capital_transactions FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- @deprecated: Use getEquityAtDate() from src/lib/finance/equity.ts instead.
-- This combined RPC is kept for backwards compatibility.
-- Conceptually, it returns Equity at Date = Net Contributions at Date + Cumulative Trading P&L at Date.
CREATE OR REPLACE FUNCTION get_capital_at_date(p_user_id UUID, p_date DATE)
RETURNS NUMERIC AS $$
DECLARE
  v_net_funding NUMERIC := 0;
  v_accumulated_pnl NUMERIC := 0;
BEGIN
  -- Get the most recent balance_after at or before the given date
  SELECT balance_after INTO v_net_funding
  FROM public.capital_transactions
  WHERE user_id = p_user_id AND date::DATE <= p_date
  ORDER BY date DESC, created_at DESC
  LIMIT 1;

  v_net_funding := COALESCE(v_net_funding, 0);

  -- Get total net PnL at or before the given date
  SELECT COALESCE(SUM(net_pnl), 0) INTO v_accumulated_pnl
  FROM public.trades
  WHERE user_id = p_user_id AND date::DATE <= p_date;

  RETURN v_net_funding + v_accumulated_pnl;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
 
 - -   = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = =  
 - -   D A I L Y   R U L E   A D H E R E N C E   T A B L E   ( P h a s e   1   F i x e s )  
 - -   = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = =  
 C R E A T E   T A B L E   I F   N O T   E X I S T S   p u b l i c . d a i l y _ r u l e _ a d h e r e n c e   (  
     i d   U U I D   P R I M A R Y   K E Y   D E F A U L T   g e n _ r a n d o m _ u u i d ( ) ,  
     u s e r _ i d   U U I D   N O T   N U L L   R E F E R E N C E S   a u t h . u s e r s ( i d )   O N   D E L E T E   C A S C A D E ,  
     d a t e   D A T E   N O T   N U L L ,  
     r u l e _ i d   U U I D   N O T   N U L L   R E F E R E N C E S   p u b l i c . r u l e s ( i d )   O N   D E L E T E   C A S C A D E ,  
     c h e c k e d   B O O L E A N   N O T   N U L L   D E F A U L T   F A L S E ,  
     c r e a t e d _ a t   T I M E S T A M P T Z   D E F A U L T   N O W ( )   N O T   N U L L ,  
     C O N S T R A I N T   d a i l y _ r u l e _ a d h e r e n c e _ u n i q u e   U N I Q U E ( u s e r _ i d ,   d a t e ,   r u l e _ i d )  
 ) ;  
  
 A L T E R   T A B L E   p u b l i c . d a i l y _ r u l e _ a d h e r e n c e   E N A B L E   R O W   L E V E L   S E C U R I T Y ;  
 C R E A T E   P O L I C Y   " U s e r s   m a n a g e   o w n   d a i l y   r u l e   a d h e r e n c e "  
     O N   p u b l i c . d a i l y _ r u l e _ a d h e r e n c e   F O R   A L L  
     U S I N G   ( a u t h . u i d ( )   =   u s e r _ i d )   W I T H   C H E C K   ( a u t h . u i d ( )   =   u s e r _ i d ) ;  
 