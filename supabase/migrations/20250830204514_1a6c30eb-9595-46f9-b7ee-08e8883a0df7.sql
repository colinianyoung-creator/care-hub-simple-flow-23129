
-- 1) Add foreign keys so PostgREST can auto-join profiles from related tables
-- Using NOT VALID to avoid blocking if legacy rows are missing profiles.
-- New inserts/updates will be enforced immediately.

ALTER TABLE public.user_memberships
  ADD CONSTRAINT fk_user_memberships_profile
  FOREIGN KEY (user_id) REFERENCES public.profiles(id)
  ON DELETE CASCADE
  NOT VALID;

ALTER TABLE public.shift_assignments
  ADD CONSTRAINT fk_shift_assignments_carer
  FOREIGN KEY (carer_id) REFERENCES public.profiles(id)
  ON DELETE CASCADE
  NOT VALID;

ALTER TABLE public.shift_instances
  ADD CONSTRAINT fk_shift_instances_carer
  FOREIGN KEY (carer_id) REFERENCES public.profiles(id)
  ON DELETE CASCADE
  NOT VALID;

-- Optional but recommended for future joins/expands in exports and summaries
ALTER TABLE public.time_entries
  ADD CONSTRAINT fk_time_entries_user
  FOREIGN KEY (user_id) REFERENCES public.profiles(id)
  ON DELETE CASCADE
  NOT VALID;

-- 2) RLS: Allow family admins and disabled_person to view profiles of members in their families
-- Keep existing self-select policy; this is additional.

CREATE POLICY "Family admins can view family member profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  -- Allow viewing profiles that belong to any family where the current user
  -- is either a family_admin or disabled_person
  EXISTS (
    SELECT 1
    FROM public.user_memberships um
    WHERE um.user_id = profiles.id
      AND (
        has_family_role(auth.uid(), um.family_id, 'family_admin') OR
        has_family_role(auth.uid(), um.family_id, 'disabled_person')
      )
  )
  OR profiles.id = auth.uid()
);
