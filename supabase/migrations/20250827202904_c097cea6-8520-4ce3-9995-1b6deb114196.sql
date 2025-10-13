-- Drop ALL RLS policies that depend on the functions
DROP POLICY IF EXISTS "Families: members can select" ON public.families;
DROP POLICY IF EXISTS "Memberships: members can select" ON public.user_memberships;
DROP POLICY IF EXISTS "Care recipients: members can select" ON public.care_recipients;
DROP POLICY IF EXISTS "Time entries: members can select" ON public.time_entries;
DROP POLICY IF EXISTS "Time entries: carers insert own rows" ON public.time_entries;
DROP POLICY IF EXISTS "Tasks: members can select" ON public.tasks;
DROP POLICY IF EXISTS "Tasks: members can insert" ON public.tasks;
DROP POLICY IF EXISTS "Tasks: members can update" ON public.tasks;
DROP POLICY IF EXISTS "Tasks: members can delete" ON public.tasks;
DROP POLICY IF EXISTS "Notes: members can select" ON public.care_notes;
DROP POLICY IF EXISTS "Notes: members can insert" ON public.care_notes;
DROP POLICY IF EXISTS "Care plans: members can select" ON public.care_plans;
DROP POLICY IF EXISTS "Time entries: owners can update pending entries" ON public.time_entries;

-- Now drop the functions
DROP FUNCTION IF EXISTS public.is_member(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.has_family_role(uuid, uuid, app_role) CASCADE;

-- Drop remaining policies and tables
DROP TABLE IF EXISTS public.user_memberships CASCADE;

-- Update the enum
ALTER TABLE public.profiles ALTER COLUMN default_role DROP DEFAULT;
ALTER TYPE app_role RENAME TO app_role_old;
CREATE TYPE app_role AS ENUM ('disabled_person', 'family_admin', 'family_viewer', 'carer', 'manager');

-- Update profiles table
ALTER TABLE public.profiles 
ALTER COLUMN default_role TYPE app_role USING 
  CASE 
    WHEN default_role::text = 'family_admin' THEN 'family_admin'::app_role
    WHEN default_role::text = 'carer' THEN 'carer'::app_role
    ELSE 'carer'::app_role
  END;

ALTER TABLE public.profiles ALTER COLUMN default_role SET DEFAULT 'carer'::app_role;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS care_recipient_name text NULL;

DROP TYPE app_role_old;

-- Recreate tables
CREATE TABLE public.user_memberships (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  family_id uuid NOT NULL,
  role app_role NOT NULL,
  care_recipient_id uuid NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, family_id)
);

ALTER TABLE public.user_memberships ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.invites (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id uuid NOT NULL,
  invite_code text NOT NULL UNIQUE,
  invited_role app_role NOT NULL,
  created_by uuid NOT NULL,
  redeemed_by uuid NULL,
  redeemed_at timestamp with time zone NULL,
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '7 days'),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;