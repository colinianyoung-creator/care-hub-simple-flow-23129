
-- Fix families visibility so all members can read family metadata
-- 1) Drop the restrictive creator-only SELECT policy
DROP POLICY IF EXISTS "Families: creator can select own rows" ON public.families;

-- 2) Create permissive SELECT policies for both creators and members
CREATE POLICY "Families: creator can select own rows"
ON public.families
FOR SELECT
TO authenticated
USING (created_by = auth.uid());

CREATE POLICY "Families: members can select"
ON public.families
FOR SELECT
TO authenticated
USING (is_member(auth.uid(), id));
