-- Add column to preserve original carer name when carer is deleted
-- This allows past shifts to retain the deleted carer's name until timesheet export
ALTER TABLE public.shift_assignments 
ADD COLUMN IF NOT EXISTS original_carer_name text DEFAULT NULL;

-- Add column to mark shifts as pending timesheet export (for deleted carers)
ALTER TABLE public.shift_assignments 
ADD COLUMN IF NOT EXISTS pending_export boolean DEFAULT false;