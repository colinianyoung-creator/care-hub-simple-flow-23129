-- Make shift assignment title optional
ALTER TABLE public.shift_assignments 
ALTER COLUMN title DROP NOT NULL;

-- Add status column to tasks for better workflow management
ALTER TABLE public.tasks 
ADD COLUMN status text DEFAULT 'active'::text;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_shift_instances_family_date ON public.shift_instances(family_id, scheduled_date);
CREATE INDEX IF NOT EXISTS idx_shift_assignments_family_active ON public.shift_assignments(family_id, active);
CREATE INDEX IF NOT EXISTS idx_tasks_family_status ON public.tasks(family_id, status);

-- Update shift_assignments to support multiple carers (store as array)
ALTER TABLE public.shift_assignments 
ADD COLUMN carer_ids uuid[] DEFAULT ARRAY[carer_id];

-- Update shift_instances to support multiple carers
ALTER TABLE public.shift_instances 
ADD COLUMN carer_ids uuid[] DEFAULT ARRAY[carer_id];

-- Add recurring flag to shift assignments
ALTER TABLE public.shift_assignments 
ADD COLUMN is_recurring boolean DEFAULT true;