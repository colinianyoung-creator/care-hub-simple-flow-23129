-- Fix profile RLS policy: Remove overly restrictive updated_at check
-- This was causing "new row violates row-level security policy" errors

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can update their own profile" 
ON public.profiles
FOR UPDATE 
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id 
  AND id = id  -- Cannot change id
  AND email IS NOT DISTINCT FROM (SELECT email FROM public.profiles WHERE id = auth.uid())  -- Cannot change email
  AND created_at IS NOT DISTINCT FROM (SELECT created_at FROM public.profiles WHERE id = auth.uid())  -- Cannot change created_at
  -- Removed updated_at restriction - it's automatically handled by database trigger
);