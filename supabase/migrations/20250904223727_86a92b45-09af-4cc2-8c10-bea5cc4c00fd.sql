-- Fix the policy conflict by dropping and recreating

-- Drop all existing policies on profiles table
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Family members can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can create their own profile" ON public.profiles;

-- Create new comprehensive policies
-- 1. Users can view their own profile OR family member profiles
CREATE POLICY "Users can view own and family profiles" 
ON public.profiles 
FOR SELECT 
USING (
  id = auth.uid() OR public.users_in_same_family(auth.uid(), id)
);

-- 2. Users can only update their own profile
CREATE POLICY "Users can update own profile only" 
ON public.profiles 
FOR UPDATE 
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- 3. Users can only create their own profile
CREATE POLICY "Users can create own profile only" 
ON public.profiles 
FOR INSERT 
WITH CHECK (id = auth.uid());

-- 4. Only users can delete their own profile (optional, for completeness)
CREATE POLICY "Users can delete own profile only" 
ON public.profiles 
FOR DELETE 
USING (id = auth.uid());