-- Fix infinite recursion in profiles RLS policy
-- Drop the policy first, then the function
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP FUNCTION IF EXISTS public.can_update_own_profile(uuid);

-- Recreate the update policy with direct auth check (no recursion)
CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id 
  AND id = id  -- id cannot be changed
  AND (email IS NULL OR email = (SELECT p.email FROM public.profiles p WHERE p.id = auth.uid()))  -- email cannot be changed
  AND (created_at IS NULL OR created_at = (SELECT p.created_at FROM public.profiles p WHERE p.id = auth.uid()))  -- created_at cannot be changed
);