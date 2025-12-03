-- Add notes column to money_records table
ALTER TABLE public.money_records ADD COLUMN IF NOT EXISTS notes text;