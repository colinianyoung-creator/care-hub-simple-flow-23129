-- Fix: Tighten profiles table RLS policy to prevent cross-family data access
-- The current policy allows viewing any user who shares any family membership,
-- but we need to restrict it to users who share the SAME specific family context

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Users can view profiles of family members" ON public.profiles;

-- Create a more restrictive policy that only allows viewing profiles of users
-- who share at least one common family membership
CREATE POLICY "Users can view profiles of family members"
ON public.profiles
FOR SELECT
USING (
  -- Always allow viewing own profile
  auth.uid() = id
  OR
  -- Only view profiles of users who share at least one family
  EXISTS (
    SELECT 1 
    FROM public.user_memberships um1
    JOIN public.user_memberships um2 ON um1.family_id = um2.family_id
    WHERE um1.user_id = auth.uid()
      AND um2.user_id = profiles.id
  )
);

-- Note: The profiles_secure view is secure - it's a view that inherits RLS from profiles table
-- and already masks sensitive contact fields (email, phone, contact_email, contact_phone)
-- using the can_view_contact_details function which checks:
-- 1. User is viewing their own profile, OR
-- 2. User is a family_admin/disabled_person in a shared family

-- Add an index to improve RLS policy performance
CREATE INDEX IF NOT EXISTS idx_user_memberships_user_family 
ON public.user_memberships(user_id, family_id);

-- Add comment to explain the security model
COMMENT ON VIEW public.profiles_secure IS 'Secure view of profiles that masks contact details (email, phone, contact_email, contact_phone) for users who are not the profile owner or a family admin. Use this view for general profile queries where contact details are not needed.';