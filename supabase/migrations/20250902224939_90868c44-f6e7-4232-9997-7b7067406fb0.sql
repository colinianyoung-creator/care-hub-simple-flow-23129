-- Fix conflicting RLS policies on profiles table
-- Remove duplicate SELECT policy and consolidate into a single, clear policy

-- Drop the duplicate "Restrict direct profile access" policy
DROP POLICY IF EXISTS "Restrict direct profile access" ON public.profiles;

-- Update the remaining policy to be more explicit and secure
DROP POLICY IF EXISTS "Users can select own profile" ON public.profiles;

-- Create a single, clear SELECT policy that only allows users to see their own profile
CREATE POLICY "Users can only view their own profile" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (id = auth.uid());

-- Ensure INSERT policy is secure and explicit
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

CREATE POLICY "Users can only create their own profile" 
ON public.profiles 
FOR INSERT 
TO authenticated
WITH CHECK (id = auth.uid());

-- Ensure UPDATE policy is secure and explicit  
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can only update their own profile" 
ON public.profiles 
FOR UPDATE 
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Ensure no DELETE policy exists (profiles should not be deletable via API)
DROP POLICY IF EXISTS "Users can delete own profile" ON public.profiles;

-- Add a comment to document the security approach
COMMENT ON TABLE public.profiles IS 'Contains sensitive personal information. RLS policies restrict access to profile owners only. Profile data can be safely shared with family members through the get_profile_safe() function which handles data masking.';