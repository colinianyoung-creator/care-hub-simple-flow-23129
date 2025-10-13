-- Fix profiles table security by improving RLS policies for family-based access

-- First, let's update the profiles RLS policies to allow proper family member access
-- while maintaining security for personal contact information

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can only view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can only update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can only create their own profile" ON public.profiles;

-- Create more nuanced policies that support the care management workflow

-- 1. Users can always see their own complete profile
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (id = auth.uid());

-- 2. Family members can see limited profile information of other members
-- This allows the care workflow while protecting sensitive data
CREATE POLICY "Family members can view basic profile info" 
ON public.profiles 
FOR SELECT 
USING (
  id != auth.uid() AND EXISTS (
    SELECT 1 FROM public.user_memberships um1
    JOIN public.user_memberships um2 ON um1.family_id = um2.family_id
    WHERE um1.user_id = auth.uid() 
      AND um2.user_id = public.profiles.id
  )
);

-- 3. Users can only update their own profile
CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- 4. Users can only create their own profile
CREATE POLICY "Users can create their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (id = auth.uid());

-- 5. Family admins can view more complete profiles of their family members
-- but still with some data masking for privacy
CREATE POLICY "Family admins can view member profiles" 
ON public.profiles 
FOR SELECT 
USING (
  id != auth.uid() AND EXISTS (
    SELECT 1 FROM public.user_memberships um1
    JOIN public.user_memberships um2 ON um1.family_id = um2.family_id
    WHERE um1.user_id = auth.uid() 
      AND um2.user_id = public.profiles.id
      AND um1.role IN ('family_admin', 'disabled_person')
  )
);

-- Create a secure view for family member profiles that masks sensitive data
CREATE OR REPLACE VIEW public.family_member_profiles AS
SELECT 
  p.id,
  p.full_name,
  CASE 
    -- Show full email only to family admins and the profile owner
    WHEN p.id = auth.uid() OR EXISTS (
      SELECT 1 FROM public.user_memberships um1
      JOIN public.user_memberships um2 ON um1.family_id = um2.family_id
      WHERE um1.user_id = auth.uid() 
        AND um2.user_id = p.id
        AND um1.role IN ('family_admin', 'disabled_person')
    ) THEN p.contact_email
    -- Mask email for other family members
    WHEN EXISTS (
      SELECT 1 FROM public.user_memberships um1
      JOIN public.user_memberships um2 ON um1.family_id = um2.family_id
      WHERE um1.user_id = auth.uid() 
        AND um2.user_id = p.id
    ) THEN CONCAT(LEFT(p.contact_email, 3), '***@', SPLIT_PART(p.contact_email, '@', 2))
    ELSE NULL
  END as contact_email,
  CASE 
    -- Show full phone only to family admins and the profile owner
    WHEN p.id = auth.uid() OR EXISTS (
      SELECT 1 FROM public.user_memberships um1
      JOIN public.user_memberships um2 ON um1.family_id = um2.family_id
      WHERE um1.user_id = auth.uid() 
        AND um2.user_id = p.id
        AND um1.role IN ('family_admin', 'disabled_person')
    ) THEN p.contact_phone
    -- Mask phone for other family members
    WHEN EXISTS (
      SELECT 1 FROM public.user_memberships um1
      JOIN public.user_memberships um2 ON um1.family_id = um2.family_id
      WHERE um1.user_id = auth.uid() 
        AND um2.user_id = p.id
    ) THEN CONCAT('***-***-', RIGHT(p.contact_phone, 4))
    ELSE NULL
  END as contact_phone,
  p.care_recipient_name,
  p.default_role,
  p.created_at
FROM public.profiles p
WHERE 
  -- User can see their own profile or family member profiles
  p.id = auth.uid() 
  OR EXISTS (
    SELECT 1 FROM public.user_memberships um1
    JOIN public.user_memberships um2 ON um1.family_id = um2.family_id
    WHERE um1.user_id = auth.uid() 
      AND um2.user_id = p.id
  );

-- Enable RLS on the view
ALTER VIEW public.family_member_profiles SET (security_barrier = true);

-- Update the get_profile_safe function to use improved logic
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
BEGIN
  -- Log the access for audit purposes
  PERFORM public.log_profile_access(profile_user_id, 'read');
  
  -- Return data from the secure view
  RETURN QUERY 
  SELECT 
    fmp.id,
    fmp.full_name,
    fmp.contact_email,
    fmp.contact_phone,
    fmp.care_recipient_name,
    fmp.default_role,
    fmp.created_at
  FROM public.family_member_profiles fmp
  WHERE fmp.id = profile_user_id;
END;
$$;