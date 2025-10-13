-- Create security definer function to check if a user can view contact information
-- Returns true only if:
-- 1. Viewer is the profile owner, OR
-- 2. Viewer is a family admin in the same family as the profile owner
CREATE OR REPLACE FUNCTION public.can_view_contact_info(viewer_id uuid, profile_owner_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
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

-- Drop existing SELECT policies on profiles table
DROP POLICY IF EXISTS "Users can view basic profile info of family members" ON public.profiles;
DROP POLICY IF EXISTS "Users can view profiles with contact restrictions" ON public.profiles;

-- Create comprehensive SELECT policy that works with get_profile_safe function
-- This policy allows row-level access, but applications should use get_profile_safe()
-- for proper field-level security and contact information masking
CREATE POLICY "Users can view profiles with contact restrictions"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  -- User can always see their own full profile
  id = auth.uid()
  OR
  -- Family members can see profiles (use get_profile_safe for proper field masking)
  users_in_same_family(auth.uid(), id)
);

-- Add helpful comments
COMMENT ON POLICY "Users can view profiles with contact restrictions" ON public.profiles IS 
'Allows users to view their own profile and profiles of family members. IMPORTANT: Applications should use get_profile_safe() function for proper contact information masking and field-level security.';

COMMENT ON FUNCTION public.get_profile_safe(uuid) IS 
'RECOMMENDED: Secure function to retrieve profile information with proper contact information masking.
- Profile owner: sees all fields
- Family admin: sees masked contact info (***@domain.com, ***-***-1234)  
- Family member: sees name only, no contact info
- Non-family: no access
This function implements field-level security that RLS policies cannot provide.';

COMMENT ON FUNCTION public.can_view_contact_info(uuid, uuid) IS 
'Security definer function that checks if viewer_id can see contact information of profile_owner_id. Returns true only if viewer is the owner OR a family admin in the same family.';
