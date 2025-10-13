-- Fix the security definer view issue by removing it and using RLS policies instead

-- Drop the security definer view
DROP VIEW IF EXISTS public.family_member_profiles;

-- Create a helper function to check if two users are in the same family
CREATE OR REPLACE FUNCTION public.users_in_same_family(user1_id uuid, user2_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_memberships um1
    JOIN public.user_memberships um2 ON um1.family_id = um2.family_id
    WHERE um1.user_id = user1_id AND um2.user_id = user2_id
  );
$$;

-- Update the RLS policies to be more precise and secure
-- Drop the overlapping policies first
DROP POLICY IF EXISTS "Family members can view basic profile info" ON public.profiles;
DROP POLICY IF EXISTS "Family admins can view member profiles" ON public.profiles;

-- Create a single comprehensive policy for family member access
CREATE POLICY "Family members can view profiles" 
ON public.profiles 
FOR SELECT 
USING (
  id = auth.uid() OR public.users_in_same_family(auth.uid(), id)
);

-- Improve the get_profile_safe function to handle data masking properly
CREATE OR REPLACE FUNCTION public.get_profile_safe(profile_user_id uuid)
RETURNS TABLE(
  id uuid, 
  full_name text, 
  contact_email text, 
  contact_phone text, 
  care_recipient_name text, 
  default_role app_role, 
  created_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_own_profile boolean;
  is_family_admin boolean;
  is_same_family boolean;
BEGIN
  -- Log the access for audit purposes
  PERFORM public.log_profile_access(profile_user_id, 'read');
  
  -- Check relationships
  is_own_profile := (profile_user_id = auth.uid());
  is_same_family := public.users_in_same_family(auth.uid(), profile_user_id);
  
  -- Check if current user is family admin in same family as target user
  is_family_admin := EXISTS (
    SELECT 1 FROM public.user_memberships um1
    JOIN public.user_memberships um2 ON um1.family_id = um2.family_id
    WHERE um1.user_id = auth.uid() 
      AND um2.user_id = profile_user_id
      AND um1.role IN ('family_admin', 'disabled_person')
  );
  
  -- Return data based on access level
  IF is_own_profile THEN
    -- Return full profile for own data
    RETURN QUERY 
    SELECT p.id, p.full_name, p.contact_email, p.contact_phone, 
           p.care_recipient_name, p.default_role, p.created_at
    FROM public.profiles p 
    WHERE p.id = profile_user_id;
  ELSIF is_family_admin AND is_same_family THEN
    -- Return slightly masked data for family admins
    RETURN QUERY 
    SELECT p.id, p.full_name, 
           CASE 
             WHEN p.contact_email IS NOT NULL 
             THEN CONCAT(LEFT(p.contact_email, 3), '***@', SPLIT_PART(p.contact_email, '@', 2))
             ELSE NULL 
           END as contact_email,
           CASE 
             WHEN p.contact_phone IS NOT NULL 
             THEN CONCAT('***-***-', RIGHT(p.contact_phone, 4))
             ELSE NULL 
           END as contact_phone,
           p.care_recipient_name, p.default_role, p.created_at
    FROM public.profiles p 
    WHERE p.id = profile_user_id;
  ELSIF is_same_family THEN
    -- Return basic info only for other family members
    RETURN QUERY 
    SELECT p.id, p.full_name, 
           NULL::text as contact_email,
           NULL::text as contact_phone,
           p.care_recipient_name, p.default_role, p.created_at
    FROM public.profiles p 
    WHERE p.id = profile_user_id;
  ELSE
    -- Return nothing for non-family members
    RETURN;
  END IF;
END;
$$;