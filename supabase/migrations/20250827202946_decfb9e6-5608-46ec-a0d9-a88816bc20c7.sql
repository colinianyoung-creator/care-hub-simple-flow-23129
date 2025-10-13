-- Recreate functions with proper security settings
CREATE OR REPLACE FUNCTION public.has_family_role(_user_id uuid, _family_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT exists (
    SELECT 1
    FROM public.user_memberships m
    WHERE m.user_id = _user_id
      AND m.family_id = _family_id
      AND m.role = _role
  );
$$;

CREATE OR REPLACE FUNCTION public.is_member(_user_id uuid, _family_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT exists (
    SELECT 1
    FROM public.user_memberships m
    WHERE m.user_id = _user_id
      AND m.family_id = _family_id
  );
$$;

-- Function to generate invite codes
CREATE OR REPLACE FUNCTION public.generate_invite(
  _family_id uuid,
  _role app_role
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _invite_code text;
  _user_id uuid;
BEGIN
  _user_id := auth.uid();
  
  -- Check if user is admin of this family
  IF NOT (has_family_role(_user_id, _family_id, 'disabled_person') OR 
          has_family_role(_user_id, _family_id, 'family_admin')) THEN
    RAISE EXCEPTION 'Only family admins can generate invites';
  END IF;
  
  -- Generate unique invite code
  _invite_code := upper(substring(gen_random_uuid()::text from 1 for 8));
  
  -- Insert invite
  INSERT INTO public.invites (family_id, invite_code, invited_role, created_by)
  VALUES (_family_id, _invite_code, _role, _user_id);
  
  RETURN _invite_code;
END;
$$;

-- Function to redeem invite codes
CREATE OR REPLACE FUNCTION public.redeem_invite(
  _invite_code text,
  _user_id uuid DEFAULT auth.uid()
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _invite record;
  _family_id uuid;
BEGIN
  -- Find and validate invite
  SELECT * INTO _invite
  FROM public.invites
  WHERE invite_code = _invite_code
    AND redeemed_by IS NULL
    AND expires_at > now();
    
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or expired invite code';
  END IF;
  
  _family_id := _invite.family_id;
  
  -- Check if user is already a member
  IF is_member(_user_id, _family_id) THEN
    RAISE EXCEPTION 'User is already a member of this family';
  END IF;
  
  -- Add user to family
  INSERT INTO public.user_memberships (user_id, family_id, role)
  VALUES (_user_id, _family_id, _invite.invited_role);
  
  -- Mark invite as redeemed
  UPDATE public.invites
  SET redeemed_by = _user_id, redeemed_at = now()
  WHERE id = _invite.id;
  
  RETURN _family_id;
END;
$$;

-- Recreate all RLS policies
-- Families policies
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

CREATE POLICY "Families: creator can insert"
ON public.families
FOR INSERT
TO authenticated
WITH CHECK (created_by = auth.uid());

CREATE POLICY "Families: admin can update"
ON public.families
FOR UPDATE
TO authenticated
USING (has_family_role(auth.uid(), id, 'disabled_person') OR 
       has_family_role(auth.uid(), id, 'family_admin'));

CREATE POLICY "Families: admin can delete"
ON public.families
FOR DELETE
TO authenticated
USING (has_family_role(auth.uid(), id, 'disabled_person') OR 
       has_family_role(auth.uid(), id, 'family_admin'));

-- User memberships policies
CREATE POLICY "Memberships: members can select"
ON public.user_memberships
FOR SELECT
TO authenticated
USING (is_member(auth.uid(), family_id) OR user_id = auth.uid());

CREATE POLICY "Memberships: admin can insert"
ON public.user_memberships
FOR INSERT
TO authenticated
WITH CHECK (
  has_family_role(auth.uid(), family_id, 'disabled_person') OR 
  has_family_role(auth.uid(), family_id, 'family_admin') OR
  (EXISTS (SELECT 1 FROM families f WHERE f.id = family_id AND f.created_by = auth.uid()) AND user_id = auth.uid() AND role IN ('disabled_person', 'family_admin'))
);

CREATE POLICY "Memberships: admin can update"
ON public.user_memberships
FOR UPDATE
TO authenticated
USING (
  has_family_role(auth.uid(), family_id, 'disabled_person') OR 
  has_family_role(auth.uid(), family_id, 'family_admin')
);

CREATE POLICY "Memberships: admin can delete"
ON public.user_memberships
FOR DELETE
TO authenticated
USING (
  has_family_role(auth.uid(), family_id, 'disabled_person') OR 
  has_family_role(auth.uid(), family_id, 'family_admin')
);

-- Care recipients policies
CREATE POLICY "Care recipients: members can select"
ON public.care_recipients
FOR SELECT
TO authenticated
USING (is_member(auth.uid(), family_id));

CREATE POLICY "Care recipients: admin can insert"
ON public.care_recipients
FOR INSERT
TO authenticated
WITH CHECK (has_family_role(auth.uid(), family_id, 'disabled_person') OR 
            has_family_role(auth.uid(), family_id, 'family_admin'));

CREATE POLICY "Care recipients: admin can update"
ON public.care_recipients
FOR UPDATE
TO authenticated
USING (has_family_role(auth.uid(), family_id, 'disabled_person') OR 
       has_family_role(auth.uid(), family_id, 'family_admin'));

CREATE POLICY "Care recipients: admin can delete"
ON public.care_recipients
FOR DELETE
TO authenticated
USING (has_family_role(auth.uid(), family_id, 'disabled_person') OR 
       has_family_role(auth.uid(), family_id, 'family_admin'));

-- Time entries policies
CREATE POLICY "Time entries: members can select"
ON public.time_entries
FOR SELECT
TO authenticated
USING (is_member(auth.uid(), family_id));

CREATE POLICY "Time entries: carers insert own rows"
ON public.time_entries
FOR INSERT
TO authenticated
WITH CHECK (is_member(auth.uid(), family_id) AND user_id = auth.uid());

CREATE POLICY "Time entries: owners can update pending entries"
ON public.time_entries
FOR UPDATE
TO authenticated
USING ((user_id = auth.uid()) AND is_member(auth.uid(), family_id) AND 
       ((status = 'pending'::text) OR (status IS NULL)));

CREATE POLICY "Time entries: family admin can update all"
ON public.time_entries
FOR UPDATE
TO authenticated
USING (has_family_role(auth.uid(), family_id, 'disabled_person') OR 
       has_family_role(auth.uid(), family_id, 'family_admin'));

CREATE POLICY "Time entries: owners or admin can delete"
ON public.time_entries
FOR DELETE
TO authenticated
USING (((user_id = auth.uid()) AND is_member(auth.uid(), family_id)) OR 
       has_family_role(auth.uid(), family_id, 'disabled_person') OR 
       has_family_role(auth.uid(), family_id, 'family_admin'));

-- Tasks policies
CREATE POLICY "Tasks: members can select"
ON public.tasks
FOR SELECT
TO authenticated
USING (is_member(auth.uid(), family_id));

CREATE POLICY "Tasks: members can insert"
ON public.tasks
FOR INSERT
TO authenticated
WITH CHECK (is_member(auth.uid(), family_id) AND created_by = auth.uid());

CREATE POLICY "Tasks: members can update"
ON public.tasks
FOR UPDATE
TO authenticated
USING (is_member(auth.uid(), family_id));

CREATE POLICY "Tasks: members can delete"
ON public.tasks
FOR DELETE
TO authenticated
USING (is_member(auth.uid(), family_id));

-- Care notes policies
CREATE POLICY "Notes: members can select"
ON public.care_notes
FOR SELECT
TO authenticated
USING (is_member(auth.uid(), family_id));

CREATE POLICY "Notes: members can insert"
ON public.care_notes
FOR INSERT
TO authenticated
WITH CHECK (is_member(auth.uid(), family_id) AND author_id = auth.uid());

CREATE POLICY "Notes: author or admin can update"
ON public.care_notes
FOR UPDATE
TO authenticated
USING (((author_id = auth.uid()) AND is_member(auth.uid(), family_id)) OR 
       has_family_role(auth.uid(), family_id, 'disabled_person') OR 
       has_family_role(auth.uid(), family_id, 'family_admin'));

CREATE POLICY "Notes: author or admin can delete"
ON public.care_notes
FOR DELETE
TO authenticated
USING (((author_id = auth.uid()) AND is_member(auth.uid(), family_id)) OR 
       has_family_role(auth.uid(), family_id, 'disabled_person') OR 
       has_family_role(auth.uid(), family_id, 'family_admin'));

-- Care plans policies
CREATE POLICY "Care plans: members can select"
ON public.care_plans
FOR SELECT
TO authenticated
USING (is_member(auth.uid(), family_id));

CREATE POLICY "Care plans: family admin can insert"
ON public.care_plans
FOR INSERT
TO authenticated
WITH CHECK ((has_family_role(auth.uid(), family_id, 'disabled_person') OR 
             has_family_role(auth.uid(), family_id, 'family_admin')) AND 
            created_by = auth.uid());

CREATE POLICY "Care plans: family admin can update"
ON public.care_plans
FOR UPDATE
TO authenticated
USING (has_family_role(auth.uid(), family_id, 'disabled_person') OR 
       has_family_role(auth.uid(), family_id, 'family_admin'));

CREATE POLICY "Care plans: family admin can delete"
ON public.care_plans
FOR DELETE
TO authenticated
USING (has_family_role(auth.uid(), family_id, 'disabled_person') OR 
       has_family_role(auth.uid(), family_id, 'family_admin'));

-- Invites policies
CREATE POLICY "Invites: admin can select"
ON public.invites
FOR SELECT
TO authenticated
USING (
  has_family_role(auth.uid(), family_id, 'disabled_person') OR 
  has_family_role(auth.uid(), family_id, 'family_admin')
);

CREATE POLICY "Invites: admin can insert"
ON public.invites
FOR INSERT
TO authenticated
WITH CHECK (
  (has_family_role(auth.uid(), family_id, 'disabled_person') OR 
   has_family_role(auth.uid(), family_id, 'family_admin')) AND 
  created_by = auth.uid()
);

CREATE POLICY "Invites: admin can update"
ON public.invites
FOR UPDATE
TO authenticated
USING (
  has_family_role(auth.uid(), family_id, 'disabled_person') OR 
  has_family_role(auth.uid(), family_id, 'family_admin')
);