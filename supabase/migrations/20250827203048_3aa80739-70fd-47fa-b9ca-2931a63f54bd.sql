-- Create invite management functions
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

-- Create policies for invites table
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

-- Create policies for user_memberships table
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