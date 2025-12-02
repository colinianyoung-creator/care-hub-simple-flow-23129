-- Create reports table for AI-generated care reports
CREATE TABLE public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  care_recipient_name text NOT NULL,
  report_text text NOT NULL,
  date_range_start date NOT NULL,
  date_range_end date NOT NULL,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  report_type text DEFAULT 'care_summary'
);

-- Enable RLS
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Family members can view reports"
  ON public.reports FOR SELECT
  USING (is_family_member(auth.uid(), family_id));

CREATE POLICY "Family members can create reports"
  ON public.reports FOR INSERT
  WITH CHECK (is_family_member(auth.uid(), family_id) AND created_by = auth.uid());

CREATE POLICY "Admins can delete reports"
  ON public.reports FOR DELETE
  USING (can_manage_family(auth.uid(), family_id));

-- Indexes for performance
CREATE INDEX idx_reports_family_id ON public.reports(family_id);
CREATE INDEX idx_reports_created_at ON public.reports(created_at DESC);