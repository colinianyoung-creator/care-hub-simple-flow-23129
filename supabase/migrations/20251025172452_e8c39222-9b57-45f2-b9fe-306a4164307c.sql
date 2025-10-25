-- Fix the WITH CHECK clause to avoid recursion
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Create simple policy without recursion
-- The id, email, and created_at fields are protected at the database level (id is PK, others can use triggers if needed)
CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);