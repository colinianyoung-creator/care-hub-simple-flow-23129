-- Create table to track timesheet exports
CREATE TABLE public.timesheet_exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  carer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  placeholder_carer_id UUID REFERENCES public.placeholder_carers(id) ON DELETE SET NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  exported_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  exported_by UUID NOT NULL REFERENCES public.profiles(id),
  format TEXT NOT NULL DEFAULT 'pdf'
);

-- Enable RLS
ALTER TABLE public.timesheet_exports ENABLE ROW LEVEL SECURITY;

-- Family members can view exports for their family
CREATE POLICY "Family members can view timesheet exports"
ON public.timesheet_exports
FOR SELECT
USING (is_family_member(auth.uid(), family_id));

-- Family members can create exports
CREATE POLICY "Family members can create timesheet exports"
ON public.timesheet_exports
FOR INSERT
WITH CHECK (is_family_member(auth.uid(), family_id) AND exported_by = auth.uid());

-- Family admins can delete exports
CREATE POLICY "Family admins can delete timesheet exports"
ON public.timesheet_exports
FOR DELETE
USING (can_manage_family(auth.uid(), family_id));

-- Add index for efficient querying
CREATE INDEX idx_timesheet_exports_family_carer ON public.timesheet_exports(family_id, carer_id);
CREATE INDEX idx_timesheet_exports_dates ON public.timesheet_exports(family_id, start_date, end_date);