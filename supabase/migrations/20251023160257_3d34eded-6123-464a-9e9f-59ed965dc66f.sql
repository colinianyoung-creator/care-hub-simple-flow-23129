-- Fix the INSERT policy on user_memberships to allow family creators to add themselves
DROP POLICY IF EXISTS "Family admins can insert if role slot available" ON public.user_memberships;

CREATE POLICY "Family admins can insert if role slot available"
ON public.user_memberships
FOR INSERT
WITH CHECK (
  -- Existing admins can add members if role slot is available
  (is_family_admin(auth.uid(), family_id) AND can_add_admin_role(family_id, role))
  OR
  -- Family creator can add themselves as the FIRST member (fixed condition)
  (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM families
      WHERE families.id = user_memberships.family_id
      AND families.created_by = auth.uid()
    )
    AND NOT EXISTS (
      SELECT 1
      FROM user_memberships existing_memberships
      WHERE existing_memberships.family_id = user_memberships.family_id
    )
  )
);

-- Create family for existing admin user Colin Young who signed up before migration
DO $$
DECLARE
  _user_id UUID := '4a7d3b1f-f803-4adc-b689-84ac1969c932';
  _family_id UUID;
  _profile RECORD;
BEGIN
  -- Check if user already has a family
  IF EXISTS (SELECT 1 FROM user_memberships WHERE user_id = _user_id) THEN
    RAISE NOTICE 'User already has a family membership';
    RETURN;
  END IF;

  -- Get user profile for name
  SELECT * INTO _profile FROM profiles WHERE id = _user_id;
  
  IF NOT FOUND THEN
    RAISE NOTICE 'User profile not found';
    RETURN;
  END IF;

  -- Create family
  INSERT INTO families (name, created_by)
  VALUES (
    SPLIT_PART(COALESCE(_profile.full_name, 'User'), ' ', 1) || '''s Care Space',
    _user_id
  )
  RETURNING id INTO _family_id;

  -- Add user as admin
  INSERT INTO user_memberships (user_id, family_id, role)
  VALUES (_user_id, _family_id, COALESCE(_profile.preferred_role, 'family_admin'));

  RAISE NOTICE 'Successfully created family for existing user';
END $$;