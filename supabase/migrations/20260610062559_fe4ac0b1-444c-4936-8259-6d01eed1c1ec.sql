ALTER TABLE public.approvals ADD COLUMN IF NOT EXISTS subcategory text;
CREATE INDEX IF NOT EXISTS idx_approvals_subcategory ON public.approvals(subcategory);