-- 1) Extend time_entries for external carers
ALTER TABLE public.time_entries
  ADD COLUMN IF NOT EXISTS is_external boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS worked_by_name text;

-- 2) Create shift_schedules for recurring shifts
CREATE TABLE IF NOT EXISTS public.shift_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL,
  created_by uuid NOT NULL,
  title text NOT NULL,
  start_time time without time zone NOT NULL,
  end_time time without time zone NOT NULL,
  days_of_week integer[] NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.shift_schedules ENABLE ROW LEVEL SECURITY;

-- Policies for shift_schedules
CREATE POLICY "Family members can view shift schedules"
ON public.shift_schedules
FOR SELECT
USING (is_member(auth.uid(), family_id));

CREATE POLICY "Family admins can insert shift schedules"
ON public.shift_schedules
FOR INSERT
WITH CHECK (
  (has_family_role(auth.uid(), family_id, 'family_admin'::app_role)
   OR has_family_role(auth.uid(), family_id, 'disabled_person'::app_role))
  AND created_by = auth.uid()
);

CREATE POLICY "Family admins can update shift schedules"
ON public.shift_schedules
FOR UPDATE
USING (
  has_family_role(auth.uid(), family_id, 'family_admin'::app_role)
  OR has_family_role(auth.uid(), family_id, 'disabled_person'::app_role)
);

CREATE POLICY "Family admins can delete shift schedules"
ON public.shift_schedules
FOR DELETE
USING (
  has_family_role(auth.uid(), family_id, 'family_admin'::app_role)
  OR has_family_role(auth.uid(), family_id, 'disabled_person'::app_role)
);

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_shift_schedules_family ON public.shift_schedules (family_id);
CREATE INDEX IF NOT EXISTS idx_shift_schedules_active ON public.shift_schedules (family_id, active);