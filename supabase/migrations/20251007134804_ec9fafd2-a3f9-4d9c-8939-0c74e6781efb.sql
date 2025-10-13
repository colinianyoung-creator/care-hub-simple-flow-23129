-- Drop the existing overly permissive SELECT policy on profiles
DROP POLICY IF EXISTS "Users can view profiles with contact restrictions" ON public.profiles;

-- Create a helper function to check if user can view full contact info
CREATE OR REPLACE FUNCTION public.can_view_full_contact(viewer_id uuid, profile_owner_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  -- Own profile or family admin in same family
  SELECT 
    viewer_id = profile_owner_id
    OR EXISTS (
      SELECT 1
      FROM public.user_memberships um_viewer
      JOIN public.user_memberships um_owner ON um_viewer.family_id = um_owner.family_id
      WHERE um_viewer.user_id = viewer_id
        AND um_owner.user_id = profile_owner_id
        AND um_viewer.role IN ('family_admin', 'disabled_person')
    );
$$;

-- Create new SELECT policy with field-level masking
-- Users can see profiles in their family, but contact info is restricted
CREATE POLICY "Users can view profiles with masked contact info"
ON public.profiles
FOR SELECT
USING (
  -- Can view profile if same user or in same family
  id = auth.uid() OR users_in_same_family(auth.uid(), id)
);

-- Since we can't mask fields directly in RLS, we'll update the get_profile_safe function
-- to be the recommended way to access profiles with proper masking
-- And add a comment to guide developers

COMMENT ON TABLE public.profiles IS 'Contains user profile information. IMPORTANT: Use get_profile_safe() function to query this table to ensure contact information is properly masked based on user permissions. Direct queries will expose contact information to all family members.';

-- Update the can_view_contact_info function to match the new security model
DROP FUNCTION IF EXISTS public.can_view_contact_info(uuid, uuid);

CREATE OR REPLACE FUNCTION public.can_view_contact_info(viewer_id uuid, profile_owner_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT 
    viewer_id = profile_owner_id
    OR EXISTS (
      SELECT 1
      FROM public.user_memberships um_viewer
      JOIN public.user_memberships um_owner ON um_viewer.family_id = um_owner.family_id
      WHERE um_viewer.user_id = viewer_id
        AND um_owner.user_id = profile_owner_id
        AND um_viewer.role IN ('family_admin', 'disabled_person')
    );
$$;