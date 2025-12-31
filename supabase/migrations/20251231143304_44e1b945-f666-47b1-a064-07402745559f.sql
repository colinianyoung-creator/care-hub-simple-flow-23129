-- Add approval workflow columns to time_entries
ALTER TABLE public.time_entries 
ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'auto_approved',
ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS approved_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS is_unscheduled boolean NOT NULL DEFAULT false;

-- Add constraint for valid approval_status values
ALTER TABLE public.time_entries 
ADD CONSTRAINT time_entries_approval_status_check 
CHECK (approval_status IN ('auto_approved', 'pending', 'approved', 'denied'));

-- Create index for efficient querying of pending approvals
CREATE INDEX IF NOT EXISTS idx_time_entries_approval_status 
ON public.time_entries(approval_status) 
WHERE approval_status = 'pending';

-- Create index for unscheduled entries
CREATE INDEX IF NOT EXISTS idx_time_entries_unscheduled 
ON public.time_entries(is_unscheduled) 
WHERE is_unscheduled = true;

-- Add RLS policy for admins to update approval_status on any time entries
CREATE POLICY "Family admins can update approval status" 
ON public.time_entries 
FOR UPDATE 
USING (is_family_admin(auth.uid(), family_id))
WITH CHECK (is_family_admin(auth.uid(), family_id));