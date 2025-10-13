-- Add shift_category to time_entries table
ALTER TABLE public.time_entries 
ADD COLUMN shift_category text DEFAULT 'basic';

-- Create leave_requests table
CREATE TABLE public.leave_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  carer_id uuid NOT NULL,
  family_id uuid NOT NULL,
  date date NOT NULL,
  type text NOT NULL CHECK (type IN ('annual_leave', 'sickness', 'public_holiday')),
  hours numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  notes text,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on leave_requests
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;

-- RLS policies for leave_requests
CREATE POLICY "Family members can view leave requests"
ON public.leave_requests
FOR SELECT
USING (is_member(auth.uid(), family_id));

CREATE POLICY "Carers can create their own leave requests"
ON public.leave_requests
FOR INSERT
WITH CHECK (
  is_member(auth.uid(), family_id) 
  AND carer_id = auth.uid() 
  AND created_by = auth.uid()
);

CREATE POLICY "Carers and admins can update leave requests"
ON public.leave_requests
FOR UPDATE
USING (
  is_member(auth.uid(), family_id) 
  AND (
    carer_id = auth.uid() 
    OR has_family_role(auth.uid(), family_id, 'family_admin'::app_role)
    OR has_family_role(auth.uid(), family_id, 'disabled_person'::app_role)
  )
);

CREATE POLICY "Admins can delete leave requests"
ON public.leave_requests
FOR DELETE
USING (
  has_family_role(auth.uid(), family_id, 'family_admin'::app_role)
  OR has_family_role(auth.uid(), family_id, 'disabled_person'::app_role)
);

-- Add update trigger for leave_requests
CREATE TRIGGER update_leave_requests_updated_at
BEFORE UPDATE ON public.leave_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Drop timesheet template related tables and storage policies
DROP TABLE IF EXISTS public.timesheet_template_mappings;
DROP TABLE IF EXISTS public.timesheet_templates;

-- Remove storage bucket (this might fail if bucket doesn't exist, that's OK)
DELETE FROM storage.buckets WHERE id = 'timesheet-templates';