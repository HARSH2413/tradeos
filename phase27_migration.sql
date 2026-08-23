-- =================================================================================
-- PHASE 27: SAFE DATA MIGRATION
-- Run this script in your Supabase SQL Editor.
-- This script safely copies data from deprecated legacy columns into the new 
-- streamlined columns. It DOES NOT drop any columns.
-- =================================================================================

-- 1. Migrate `reflection` -> `biggest_learning`
-- Only copies if the new field is empty and the old field has data.
UPDATE public.trading_days
SET biggest_learning = reflection
WHERE (biggest_learning IS NULL OR biggest_learning = '')
  AND (reflection IS NOT NULL AND reflection != '');

-- 2. Migrate `plan_goal` -> `plan_setup` (Fallback only)
-- Only copies if the new field is empty, to preserve information.
UPDATE public.trading_days
SET plan_setup = plan_goal
WHERE (plan_setup IS NULL OR plan_setup = '')
  AND (plan_goal IS NOT NULL AND plan_goal != '');

-- 3. Safely Parse `important_levels` -> `pdh`, `pdl`, `support`, `resistance`
-- Only parses if it's a JSON object and contains the exact expected keys.
UPDATE public.trading_days
SET 
  pdh = COALESCE(pdh, (important_levels->>'pdh')::NUMERIC),
  pdl = COALESCE(pdl, (important_levels->>'pdl')::NUMERIC),
  support = COALESCE(support, (important_levels->>'support')::NUMERIC),
  resistance = COALESCE(resistance, (important_levels->>'resistance')::NUMERIC)
WHERE jsonb_typeof(important_levels) = 'object'
  AND (
    important_levels ? 'pdh' OR 
    important_levels ? 'pdl' OR 
    important_levels ? 'support' OR 
    important_levels ? 'resistance'
  );

-- =================================================================================
-- VERIFICATION QUERIES
-- Run these queries after migration to verify the data was preserved successfully.
-- =================================================================================

/*
-- Total trading days
SELECT COUNT(*) FROM public.trading_days;

-- Days where legacy 'reflection' is populated
SELECT COUNT(*) FROM public.trading_days WHERE reflection IS NOT NULL AND reflection != '';

-- Days where new 'biggest_learning' is populated
SELECT COUNT(*) FROM public.trading_days WHERE biggest_learning IS NOT NULL AND biggest_learning != '';

-- Days where legacy 'plan_goal' is populated
SELECT COUNT(*) FROM public.trading_days WHERE plan_goal IS NOT NULL AND plan_goal != '';

-- Days where new 'plan_setup' is populated
SELECT COUNT(*) FROM public.trading_days WHERE plan_setup IS NOT NULL AND plan_setup != '';
*/
