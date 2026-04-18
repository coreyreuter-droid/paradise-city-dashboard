-- Migration 016: Amended budget support, engagement tracking, citizen feedback

-- ============================================================================
-- 1. AMENDED BUDGET SUPPORT
-- budget_type: 'adopted' (default) or 'amended'
-- Existing rows become 'adopted'. Amended uploads overwrite prior amendments.
-- ============================================================================

ALTER TABLE public.budgets
  ADD COLUMN IF NOT EXISTS budget_type TEXT NOT NULL DEFAULT 'adopted';

CREATE INDEX IF NOT EXISTS idx_budgets_budget_type
  ON public.budgets (budget_type);

CREATE INDEX IF NOT EXISTS idx_budgets_year_type
  ON public.budgets (fiscal_year, budget_type);

-- View: which budget types exist per year
CREATE OR REPLACE VIEW public.v_budget_types_by_year AS
SELECT
  fiscal_year,
  budget_type,
  COUNT(*)::integer AS row_count,
  SUM(amount)::numeric AS total_amount
FROM public.budgets
GROUP BY fiscal_year, budget_type
ORDER BY fiscal_year DESC, budget_type;

GRANT SELECT ON public.v_budget_types_by_year TO anon, authenticated;

-- View: adopted vs amended at department level
CREATE OR REPLACE VIEW public.v_budget_adopted_vs_amended AS
SELECT
  COALESCE(a.fiscal_year, m.fiscal_year) AS fiscal_year,
  COALESCE(a.department_name, m.department_name) AS department_name,
  COALESCE(a.adopted_amount, 0) AS adopted_amount,
  COALESCE(m.amended_amount, 0) AS amended_amount,
  COALESCE(m.amended_amount, 0) - COALESCE(a.adopted_amount, 0) AS change_amount
FROM (
  SELECT fiscal_year, department_name, SUM(amount)::numeric AS adopted_amount
  FROM public.budgets WHERE budget_type = 'adopted'
  GROUP BY fiscal_year, department_name
) a
FULL OUTER JOIN (
  SELECT fiscal_year, department_name, SUM(amount)::numeric AS amended_amount
  FROM public.budgets WHERE budget_type = 'amended'
  GROUP BY fiscal_year, department_name
) m ON a.fiscal_year = m.fiscal_year AND a.department_name = m.department_name
ORDER BY fiscal_year DESC, COALESCE(a.adopted_amount, 0) DESC;

GRANT SELECT ON public.v_budget_adopted_vs_amended TO anon, authenticated;

-- ============================================================================
-- 2. ENGAGEMENT TRACKING
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.page_views (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  page_path TEXT NOT NULL,
  page_title TEXT,
  referrer TEXT,
  session_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT page_views_pkey PRIMARY KEY (id)
);

ALTER TABLE public.page_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can log a page view"
  ON public.page_views FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can read page views"
  ON public.page_views FOR SELECT TO authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS idx_page_views_created ON public.page_views (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_page_views_path ON public.page_views (page_path, created_at DESC);

-- ============================================================================
-- 3. CITIZEN FEEDBACK
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.citizen_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  page_path TEXT,
  name TEXT,
  email TEXT,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new',
  admin_response TEXT,
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT citizen_feedback_pkey PRIMARY KEY (id)
);

ALTER TABLE public.citizen_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit feedback"
  ON public.citizen_feedback FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can read feedback"
  ON public.citizen_feedback FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can update feedback"
  ON public.citizen_feedback FOR UPDATE TO authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS idx_citizen_feedback_status
  ON public.citizen_feedback (status, created_at DESC);
