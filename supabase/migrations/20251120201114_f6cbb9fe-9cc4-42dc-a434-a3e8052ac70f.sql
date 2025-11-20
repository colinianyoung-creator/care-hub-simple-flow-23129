-- Add new structured fields to care_notes table
ALTER TABLE care_notes 
  ADD COLUMN IF NOT EXISTS activity_support TEXT,
  ADD COLUMN IF NOT EXISTS activity_tags TEXT[],
  ADD COLUMN IF NOT EXISTS observations TEXT,
  ADD COLUMN IF NOT EXISTS outcome_response TEXT,
  ADD COLUMN IF NOT EXISTS next_steps TEXT,
  ADD COLUMN IF NOT EXISTS mood TEXT,
  ADD COLUMN IF NOT EXISTS eating_drinking TEXT,
  ADD COLUMN IF NOT EXISTS eating_drinking_notes TEXT,
  ADD COLUMN IF NOT EXISTS bathroom_usage TEXT,
  ADD COLUMN IF NOT EXISTS incidents TEXT,
  ADD COLUMN IF NOT EXISTS is_incident BOOLEAN DEFAULT FALSE;

-- Migrate existing data from old schema to new fields
UPDATE care_notes 
SET activity_support = title,
    observations = content
WHERE activity_support IS NULL;

-- Make old columns nullable for backwards compatibility
ALTER TABLE care_notes 
  ALTER COLUMN title DROP NOT NULL,
  ALTER COLUMN content DROP NOT NULL;