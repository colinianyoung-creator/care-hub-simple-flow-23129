-- Add recurring task columns to tasks table
ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS is_recurring boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS recurrence_type text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS parent_task_id uuid REFERENCES public.tasks(id) ON DELETE SET NULL;

-- Add index for parent_task_id lookups
CREATE INDEX IF NOT EXISTS idx_tasks_parent_task_id ON public.tasks(parent_task_id);

-- Add index for recurring tasks queries
CREATE INDEX IF NOT EXISTS idx_tasks_is_recurring ON public.tasks(is_recurring) WHERE is_recurring = true;