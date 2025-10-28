-- Fix change_user_role to include disabled_person in CASE 3 and add verification
DROP FUNCTION IF EXISTS public.change_user_role(app_role);

CREATE OR REPLACE FUNCTION public.change_user_role(_new_role app_role)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid;
  _user_name text;
  _result jsonb;
  _memberships_count int;
  _family_id uuid;
  _is_sole_member boolean;
  _updated_role app_role;
BEGIN
  -- Get authenticated user
  _user_id := auth.uid();
  IF _user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Get user's name for family creation
  SELECT full_name INTO _user_name FROM public.profiles WHERE id = _user_id;

  -- Count existing memberships
  SELECT COUNT(*) INTO _memberships_count
  FROM public.user_memberships 
  WHERE user_id = _user_id;

  -- Get first family_id if memberships exist
  IF _memberships_count > 0 THEN
    SELECT family_id INTO _family_id
    FROM public.user_memberships 
    WHERE user_id = _user_id
    LIMIT 1;
  END IF;

  -- CASE 1: No existing membership - create personal care space
  IF _memberships_count = 0 THEN
    UPDATE public.profiles 
    SET ui_preference = _new_role 
    WHERE id = _user_id;

    -- If admin role, auto-create personal family
    IF _new_role IN ('family_admin', 'disabled_person') THEN
      INSERT INTO public.families (name, created_by)
      VALUES (SPLIT_PART(COALESCE(_user_name, 'User'), ' ', 1) || '''s Care Space', _user_id)
      RETURNING id INTO _family_id;

      INSERT INTO public.user_memberships (user_id, family_id, role)
      VALUES (_user_id, _family_id, _new_role);

      RETURN jsonb_build_object(
        'success', true, 
        'action', 'created_family',
        'family_id', _family_id,
        'new_role', _new_role
      );
    ELSE
      RETURN jsonb_build_object(
        'success', true,
        'action', 'updated_preference',
        'new_role', _new_role
      );
    END IF;
  END IF;

  -- CASE 2: Has membership - check if sole member
  SELECT COUNT(*) = 1 INTO _is_sole_member
  FROM public.user_memberships
  WHERE family_id = _family_id;

  -- If sole member, can change role in place
  IF _is_sole_member THEN
    UPDATE public.user_memberships
    SET role = _new_role
    WHERE user_id = _user_id AND family_id = _family_id
    RETURNING role INTO _updated_role;

    -- Verify the update actually happened
    IF _updated_role IS NULL THEN
      RAISE EXCEPTION 'Failed to update membership role';
    END IF;

    UPDATE public.profiles 
    SET ui_preference = _new_role 
    WHERE id = _user_id;

    RETURN jsonb_build_object(
      'success', true,
      'action', 'updated_role',
      'family_id', _family_id,
      'new_role', _updated_role
    );
  END IF;

  -- CASE 3: Not sole member - switching to non-admin removes membership
  -- FIXED: Added disabled_person to the list
  IF _new_role IN ('carer', 'family_viewer', 'disabled_person') THEN
    DELETE FROM public.user_memberships
    WHERE user_id = _user_id;

    UPDATE public.profiles 
    SET ui_preference = _new_role 
    WHERE id = _user_id;

    RETURN jsonb_build_object(
      'success', true,
      'action', 'left_family',
      'new_role', _new_role
    );
  END IF;

  -- CASE 4: Not sole member, trying to become admin - blocked
  RETURN jsonb_build_object(
    'success', false,
    'error', 'Cannot become admin while other members exist. Please transfer admin rights first.'
  );
END;
$$;