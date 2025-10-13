-- Update app_role enum to match new roles
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

-- Add care_recipient_name column
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS care_recipient_name text NULL;

-- Drop old enum
DROP TYPE app_role_old;

-- Recreate user_memberships table with new structure
DROP TABLE IF EXISTS user_memberships CASCADE;
CREATE TABLE public.user_memberships (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  family_id uuid NOT NULL,
  role app_role NOT NULL,
  care_recipient_id uuid NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, family_id)
);

-- Enable RLS
ALTER TABLE public.user_memberships ENABLE ROW LEVEL SECURITY;

-- Create invites table
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

-- Enable RLS on invites
ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;

-- Recreate functions with new role enum
CREATE OR REPLACE FUNCTION public.has_family_role(_user_id uuid, _family_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT exists (
    SELECT 1
    FROM public.user_memberships m
    WHERE m.user_id = _user_id
      AND m.family_id = _family_id
      AND m.role = _role
  );
$$;

CREATE OR REPLACE FUNCTION public.is_member(_user_id uuid, _family_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT exists (
    SELECT 1
    FROM public.user_memberships m
    WHERE m.user_id = _user_id
      AND m.family_id = _family_id
  );
$$;

-- Function to generate invite codes
CREATE OR REPLACE FUNCTION public.generate_invite(
  _family_id uuid,
  _role app_role
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _invite_code text;
  _user_id uuid;
BEGIN
  _user_id := auth.uid();
  
  -- Check if user is admin of this family
  IF NOT (has_family_role(_user_id, _family_id, 'disabled_person') OR 
          has_family_role(_user_id, _family_id, 'family_admin')) THEN
    RAISE EXCEPTION 'Only family admins can generate invites';
  END IF;
  
  -- Generate unique invite code
  _invite_code := upper(substring(gen_random_uuid()::text from 1 for 8));
  
  -- Insert invite
  INSERT INTO public.invites (family_id, invite_code, invited_role, created_by)
  VALUES (_family_id, _invite_code, _role, _user_id);
  
  RETURN _invite_code;
END;
$$;

-- Function to redeem invite codes
CREATE OR REPLACE FUNCTION public.redeem_invite(
  _invite_code text,
  _user_id uuid DEFAULT auth.uid()
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _invite record;
  _family_id uuid;
BEGIN
  -- Find and validate invite
  SELECT * INTO _invite
  FROM public.invites
  WHERE invite_code = _invite_code
    AND redeemed_by IS NULL
    AND expires_at > now();
    
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or expired invite code';
  END IF;
  
  _family_id := _invite.family_id;
  
  -- Check if user is already a member
  IF is_member(_user_id, _family_id) THEN
    RAISE EXCEPTION 'User is already a member of this family';
  END IF;
  
  -- Add user to family
  INSERT INTO public.user_memberships (user_id, family_id, role)
  VALUES (_user_id, _family_id, _invite.invited_role);
  
  -- Mark invite as redeemed
  UPDATE public.invites
  SET redeemed_by = _user_id, redeemed_at = now()
  WHERE id = _invite.id;
  
  RETURN _family_id;
END;
$$;

-- RLS Policies for user_memberships
CREATE POLICY "Memberships: members can select"
ON public.user_memberships
FOR SELECT
TO authenticated
USING (is_member(auth.uid(), family_id) OR user_id = auth.uid());

CREATE POLICY "Memberships: admin can insert"
ON public.user_memberships
FOR INSERT
TO authenticated
WITH CHECK (
  has_family_role(auth.uid(), family_id, 'disabled_person') OR 
  has_family_role(auth.uid(), family_id, 'family_admin') OR
  (EXISTS (SELECT 1 FROM families f WHERE f.id = family_id AND f.created_by = auth.uid()) AND user_id = auth.uid() AND role IN ('disabled_person', 'family_admin'))
);

CREATE POLICY "Memberships: admin can update"
ON public.user_memberships
FOR UPDATE
TO authenticated
USING (
  has_family_role(auth.uid(), family_id, 'disabled_person') OR 
  has_family_role(auth.uid(), family_id, 'family_admin')
);

CREATE POLICY "Memberships: admin can delete"
ON public.user_memberships
FOR DELETE
TO authenticated
USING (
  has_family_role(auth.uid(), family_id, 'disabled_person') OR 
  has_family_role(auth.uid(), family_id, 'family_admin')
);

-- RLS Policies for invites
CREATE POLICY "Invites: admin can select"
ON public.invites
FOR SELECT
TO authenticated
USING (
  has_family_role(auth.uid(), family_id, 'disabled_person') OR 
  has_family_role(auth.uid(), family_id, 'family_admin')
);

CREATE POLICY "Invites: admin can insert"
ON public.invites
FOR INSERT
TO authenticated
WITH CHECK (
  (has_family_role(auth.uid(), family_id, 'disabled_person') OR 
   has_family_role(auth.uid(), family_id, 'family_admin')) AND 
  created_by = auth.uid()
);

CREATE POLICY "Invites: admin can update"
ON public.invites
FOR UPDATE
TO authenticated
USING (
  has_family_role(auth.uid(), family_id, 'disabled_person') OR 
  has_family_role(auth.uid(), family_id, 'family_admin')
);