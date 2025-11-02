-- Add shift_type column to time_entries
ALTER TABLE public.time_entries 
ADD COLUMN IF NOT EXISTS shift_type TEXT DEFAULT 'basic';

-- Add comment for documentation
COMMENT ON COLUMN public.time_entries.shift_type IS 
'Type of shift: basic, cover, sickness, annual_leave, public_holiday, training, other';

-- Update existing entries to extract type from notes if present
UPDATE public.time_entries
SET shift_type = 
  CASE 
    WHEN notes ILIKE '%cover%' THEN 'cover'
    WHEN notes ILIKE '%sickness%' THEN 'sickness'
    WHEN notes ILIKE '%annual%' THEN 'annual_leave'
    WHEN notes ILIKE '%holiday%' THEN 'public_holiday'
    WHEN notes ILIKE '%training%' THEN 'training'
    ELSE 'basic'
  END
WHERE shift_type = 'basic' AND notes IS NOT NULL;