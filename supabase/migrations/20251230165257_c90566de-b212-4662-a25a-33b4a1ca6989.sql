-- Phase 1: Create attendance_mode enum and add to relevant tables

-- 1.1 Create the attendance_mode enum type
CREATE TYPE attendance_mode AS ENUM (
  'none',          -- No clock-in required, pay from scheduled time
  'confirm_only',  -- Clock-in required for attendance, pay from scheduled time
  'actuals'        -- Clock-in required and used for pay calculation
);

-- 1.2 Add attendance_mode to shift_instances
ALTER TABLE public.shift_instances 
ADD COLUMN attendance_mode attendance_mode NOT NULL DEFAULT 'none';

-- 1.3 Add completion tracking to shift_instances (for 'none' mode manual completion)
ALTER TABLE public.shift_instances 
ADD COLUMN completed_at timestamptz,
ADD COLUMN completed_by uuid REFERENCES public.profiles(id);

-- 1.4 Add default_attendance_mode to shift_assignments (template default)
ALTER TABLE public.shift_assignments 
ADD COLUMN default_attendance_mode attendance_mode NOT NULL DEFAULT 'none';

-- 1.5 Add default_attendance_mode to families (family-wide default)
ALTER TABLE public.families 
ADD COLUMN default_attendance_mode attendance_mode NOT NULL DEFAULT 'none';

-- 1.6 Create attendance_exceptions table for logging discrepancies
CREATE TABLE public.attendance_exceptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_instance_id uuid REFERENCES public.shift_instances(id) ON DELETE CASCADE,
  family_id uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  exception_type text NOT NULL, -- 'missing_clock_in', 'late', 'early', 'extended', 'missing_clock_in_blocks_pay'
  scheduled_time timestamptz,
  actual_time timestamptz,
  difference_minutes int,
  resolved boolean DEFAULT false,
  resolved_by uuid REFERENCES public.profiles(id),
  resolved_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on attendance_exceptions
ALTER TABLE public.attendance_exceptions ENABLE ROW LEVEL SECURITY;

-- RLS policies for attendance_exceptions
CREATE POLICY "Family members can view attendance exceptions"
ON public.attendance_exceptions
FOR SELECT
USING (is_family_member(auth.uid(), family_id));

CREATE POLICY "Family admins can manage attendance exceptions"
ON public.attendance_exceptions
FOR ALL
USING (can_manage_family(auth.uid(), family_id));

-- Create index for performance
CREATE INDEX idx_attendance_exceptions_family_id ON public.attendance_exceptions(family_id);
CREATE INDEX idx_attendance_exceptions_shift_instance_id ON public.attendance_exceptions(shift_instance_id);
CREATE INDEX idx_shift_instances_attendance_mode ON public.shift_instances(attendance_mode);