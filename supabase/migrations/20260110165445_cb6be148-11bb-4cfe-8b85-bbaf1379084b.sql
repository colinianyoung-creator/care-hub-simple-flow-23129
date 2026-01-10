-- Add accessibility and language columns to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS reduced_motion BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS high_contrast BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS font_size TEXT DEFAULT 'medium',
ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'en-GB';

-- Add check constraint for font_size
ALTER TABLE public.profiles
ADD CONSTRAINT profiles_font_size_check CHECK (font_size IN ('small', 'medium', 'large', 'extra-large'));