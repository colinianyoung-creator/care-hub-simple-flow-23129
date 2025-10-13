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

-- Add carer_ids array columns for multiple carer support
ALTER TABLE public.shift_assignments 
ADD COLUMN carer_ids uuid[];

-- Update existing records to populate carer_ids with existing carer_id
UPDATE public.shift_assignments 
SET carer_ids = ARRAY[carer_id] 
WHERE carer_ids IS NULL AND carer_id IS NOT NULL;

-- Add carer_ids to shift_instances
ALTER TABLE public.shift_instances 
ADD COLUMN carer_ids uuid[];

-- Update existing shift_instances records
UPDATE public.shift_instances 
SET carer_ids = ARRAY[carer_id] 
WHERE carer_ids IS NULL AND carer_id IS NOT NULL;

-- Add recurring flag to shift assignments
ALTER TABLE public.shift_assignments 
ADD COLUMN is_recurring boolean DEFAULT true;