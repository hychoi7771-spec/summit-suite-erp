
-- Approval type enum
CREATE TYPE public.approval_type AS ENUM ('document', 'expense', 'project', 'leave');

-- Approval status enum
CREATE TYPE public.approval_status AS ENUM ('pending', 'approved', 'rejected');

-- Main approvals table
CREATE TABLE public.approvals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  type public.approval_type NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  status public.approval_status NOT NULL DEFAULT 'pending',
  requester_id UUID NOT NULL REFERENCES public.profiles(id),
  current_approver_id UUID REFERENCES public.profiles(id),
  attachment_urls TEXT[] DEFAULT '{}',
  rejected_reason TEXT,
  approved_at TIMESTAMP WITH TIME ZONE,
  rejected_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Approval steps table (for tracking each approver in the chain)
CREATE TABLE public.approval_steps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  approval_id UUID NOT NULL REFERENCES public.approvals(id) ON DELETE CASCADE,
  approver_id UUID NOT NULL REFERENCES public.profiles(id),
  step_order INTEGER NOT NULL DEFAULT 0,
  status public.approval_status NOT NULL DEFAULT 'pending',
  comment TEXT,
  acted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_steps ENABLE ROW LEVEL SECURITY;

-- RLS policies for approvals
CREATE POLICY "Approvals viewable by authenticated" ON public.approvals FOR SELECT TO authenticated USING (true);
CREATE POLICY "Approvals insertable by authenticated" ON public.approvals FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Approvals updatable by approver or admin" ON public.approvals FOR UPDATE TO authenticated USING (
  current_approver_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  OR requester_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  OR has_role(auth.uid(), 'ceo')
  OR has_role(auth.uid(), 'general_director')
);

-- RLS policies for approval_steps
CREATE POLICY "Steps viewable by authenticated" ON public.approval_steps FOR SELECT TO authenticated USING (true);
CREATE POLICY "Steps insertable by authenticated" ON public.approval_steps FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Steps updatable by approver or admin" ON public.approval_steps FOR UPDATE TO authenticated USING (
  approver_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  OR has_role(auth.uid(), 'ceo')
  OR has_role(auth.uid(), 'general_director')
);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.approvals;
