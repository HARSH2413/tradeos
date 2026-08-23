
-- ============================================================
-- DAILY RULE ADHERENCE TABLE (Phase 1 Fixes)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.daily_rule_adherence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  rule_id UUID NOT NULL REFERENCES public.rules(id) ON DELETE CASCADE,
  checked BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT daily_rule_adherence_unique UNIQUE(user_id, date, rule_id)
);

ALTER TABLE public.daily_rule_adherence ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own daily rule adherence"
  ON public.daily_rule_adherence FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
