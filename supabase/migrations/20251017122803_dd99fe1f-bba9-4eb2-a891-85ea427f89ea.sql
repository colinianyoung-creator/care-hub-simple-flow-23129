-- Drop the current policy that only checks authentication
DROP POLICY IF EXISTS "Authenticated users can create families" ON public.families;

-- Create the corrected policy that validates created_by matches authenticated user
CREATE POLICY "Authenticated users can create families"
  ON public.families FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL 
    AND created_by = auth.uid()
  );