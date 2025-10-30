-- Add portion_left and photo_url columns to diet_entries table
ALTER TABLE diet_entries 
ADD COLUMN IF NOT EXISTS portion_left text,
ADD COLUMN IF NOT EXISTS photo_url text;