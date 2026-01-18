-- Fix Security Issue 1: profiles_secure missing policies
-- profiles_secure is a view, so we need to check if it has RLS or add security

-- First, let's check if profiles_secure is a view and handle appropriately
-- If it's a view, we need to use SECURITY DEFINER functions or recreate with proper security

-- Drop and recreate profiles_secure as a secure view that only shows own profile
DROP VIEW IF EXISTS public.profiles_secure;

-- Create a secure view that uses SECURITY INVOKER to respect RLS
-- This view should only expose data to the owner
CREATE VIEW public.profiles_secure
WITH (security_invoker = true)
AS
SELECT 
  id,
  created_at,
  updated_at,
  ui_preference,
  two_factor_enabled,
  email,
  full_name,
  phone,
  profile_picture_url,
  contact_email,
  contact_phone,
  care_recipient_name
FROM public.profiles
WHERE id = auth.uid();

-- Grant select to authenticated users
GRANT SELECT ON public.profiles_secure TO authenticated;

-- Fix Security Issue 2: Create a limited profiles view for family member display
-- This only exposes non-sensitive fields (no email, phone, contact info)
CREATE OR REPLACE VIEW public.profiles_limited
WITH (security_invoker = true)
AS
SELECT 
  p.id,
  p.full_name,
  p.profile_picture_url
FROM public.profiles p
WHERE 
  -- User can see their own profile
  p.id = auth.uid()
  OR
  -- User can see profiles of people in their families (limited data only)
  EXISTS (
    SELECT 1 
    FROM user_memberships um1
    JOIN user_memberships um2 ON um1.family_id = um2.family_id
    WHERE um1.user_id = auth.uid() 
    AND um2.user_id = p.id
  );

GRANT SELECT ON public.profiles_limited TO authenticated;

-- Create a secure function to get profile safely (returns only non-sensitive data for non-owners)
CREATE OR REPLACE FUNCTION public.get_profile_safe(profile_id uuid)
RETURNS TABLE(
  id uuid,
  full_name text,
  profile_picture_url text,
  is_own_profile boolean,
  email text,
  phone text,
  contact_email text,
  contact_phone text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.full_name,
    p.profile_picture_url,
    (p.id = auth.uid()) as is_own_profile,
    CASE WHEN p.id = auth.uid() THEN p.email ELSE NULL END,
    CASE WHEN p.id = auth.uid() THEN p.phone ELSE NULL END,
    CASE WHEN p.id = auth.uid() THEN p.contact_email ELSE NULL END,
    CASE WHEN p.id = auth.uid() THEN p.contact_phone ELSE NULL END
  FROM public.profiles p
  WHERE p.id = profile_id
  AND (
    p.id = auth.uid()
    OR EXISTS (
      SELECT 1 
      FROM user_memberships um1
      JOIN user_memberships um2 ON um1.family_id = um2.family_id
      WHERE um1.user_id = auth.uid() 
      AND um2.user_id = p.id
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_profile_safe(uuid) TO authenticated;