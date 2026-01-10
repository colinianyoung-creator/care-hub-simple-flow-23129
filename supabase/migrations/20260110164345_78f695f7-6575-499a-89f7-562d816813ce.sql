-- Create family_settings table for family-level settings
CREATE TABLE public.family_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  enabled_sections JSONB DEFAULT '["scheduling","tasks","notes","diet","money","key-information","medications","appointments","ai-reports"]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(family_id)
);

-- Enable RLS
ALTER TABLE public.family_settings ENABLE ROW LEVEL SECURITY;

-- Family members can view settings
CREATE POLICY "Family members can view settings"
  ON public.family_settings FOR SELECT
  USING (family_id IN (SELECT family_id FROM user_memberships WHERE user_id = auth.uid()));

-- Family admins can insert settings
CREATE POLICY "Family admins can insert settings"
  ON public.family_settings FOR INSERT
  WITH CHECK (family_id IN (SELECT family_id FROM user_memberships WHERE user_id = auth.uid() AND role IN ('family_admin', 'disabled_person')));

-- Family admins can update settings
CREATE POLICY "Family admins can update settings"
  ON public.family_settings FOR UPDATE
  USING (family_id IN (SELECT family_id FROM user_memberships WHERE user_id = auth.uid() AND role IN ('family_admin', 'disabled_person')));

-- Add user preferences to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS theme TEXT DEFAULT 'light',
ADD COLUMN IF NOT EXISTS time_format TEXT DEFAULT '24h',
ADD COLUMN IF NOT EXISTS date_format TEXT DEFAULT 'DD/MM/YYYY';

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION update_family_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_family_settings_updated_at
  BEFORE UPDATE ON public.family_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_family_settings_updated_at();