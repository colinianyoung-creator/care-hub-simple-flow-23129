-- First, drop the default constraint
ALTER TABLE public.profiles ALTER COLUMN default_role DROP DEFAULT;

-- Update app_role enum to match new roles
ALTER TYPE app_role RENAME TO app_role_old;
CREATE TYPE app_role AS ENUM ('disabled_person', 'family_admin', 'family_viewer', 'carer', 'manager');

-- Update profiles table with new enum
ALTER TABLE public.profiles 
ALTER COLUMN default_role TYPE app_role USING 
  CASE 
    WHEN default_role::text = 'family_admin' THEN 'family_admin'::app_role
    WHEN default_role::text = 'carer' THEN 'carer'::app_role
    ELSE 'carer'::app_role
  END;

-- Set new default
ALTER TABLE public.profiles ALTER COLUMN default_role SET DEFAULT 'carer'::app_role;

-- Add care_recipient_name column
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS care_recipient_name text NULL;

-- Drop old enum
DROP TYPE app_role_old;