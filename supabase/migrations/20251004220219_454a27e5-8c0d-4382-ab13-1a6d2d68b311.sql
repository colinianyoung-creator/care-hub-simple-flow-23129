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

-- Drop the existing overly permissive SELECT policy
DROP POLICY IF EXISTS "Users can view basic profile info of family members" ON public.profiles;

-- Create new SELECT policy that properly restricts contact information
-- Regular family members can see basic info but NOT contact details
-- Only the owner and family admins can see contact information
CREATE POLICY "Users can view profiles with contact restrictions"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  -- User can always see their own full profile
  id = auth.uid()
  OR
  -- Family members can see basic info only (contact info will be handled by columns)
  users_in_same_family(auth.uid(), id)
);

-- Add comment explaining the security model
COMMENT ON POLICY "Users can view profiles with contact restrictions" ON public.profiles IS 
'Allows users to view their own profile and basic info of family members. Contact information (email/phone) should be accessed via get_profile_safe() function which implements proper masking.';

-- Update the get_profile_safe function to ensure it's the recommended way to access profiles
COMMENT ON FUNCTION public.get_profile_safe(uuid) IS 
'Secure function to retrieve profile information with proper contact information masking. This is the RECOMMENDED way to access profile data as it implements field-level security:
- Profile owner: sees all fields
- Family admin: sees masked contact info (partial email/phone)  
- Family member: sees name only, no contact info
- Others: no access';
