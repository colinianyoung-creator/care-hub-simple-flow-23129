-- Fix profiles table RLS to prevent sensitive data exposure
-- Remove the policy that allows family members to view all profile columns
DROP POLICY IF EXISTS "Users can view profiles of family members" ON public.profiles;

-- The existing "Users can view their own profile" policy already handles owner access
-- Users can only view ALL columns for their own profile

-- For family member lookups, code should use:
-- 1. profiles_limited view (id, full_name, profile_picture_url only)
-- 2. get_profile_safe() RPC function (masks sensitive data for non-owners)

-- Ensure profiles_limited view exists with proper security (recreate if needed)
DROP VIEW IF EXISTS public.profiles_limited;
CREATE VIEW public.profiles_limited 
WITH (security_invoker = true, security_barrier = true)
AS SELECT 
  id,
  full_name,
  profile_picture_url
FROM public.profiles
WHERE (
  -- User can see their own profile
  id = auth.uid()
  OR
  -- User can see profiles of family members (limited fields only)
  EXISTS (
    SELECT 1 FROM user_memberships um1
    JOIN user_memberships um2 ON um1.family_id = um2.family_id
    WHERE um1.user_id = auth.uid() AND um2.user_id = profiles.id
  )
);

-- Grant SELECT on the view
GRANT SELECT ON public.profiles_limited TO authenticated;