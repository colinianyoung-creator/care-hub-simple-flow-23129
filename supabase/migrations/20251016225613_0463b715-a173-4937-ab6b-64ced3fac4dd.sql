-- Drop and recreate update_own_role_safe function with proper return type
DROP FUNCTION IF EXISTS public.update_own_role_safe(uuid, app_role);

CREATE OR REPLACE FUNCTION public.update_own_role_safe(
  _family_id uuid,
  _new_role app_role
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid;
  _updated_count integer;
BEGIN
  _user_id := auth.uid();
  
  IF _user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;
  
  -- Check if user is member of the family
  IF NOT is_family_member(_user_id, _family_id) THEN
    RETURN json_build_object('success', false, 'error', 'User is not a member of this family');
  END IF;
  
  -- Update the user's role
  UPDATE public.user_memberships
  SET role = _new_role, updated_at = now()
  WHERE user_id = _user_id AND family_id = _family_id;
  
  GET DIAGNOSTICS _updated_count = ROW_COUNT;
  
  IF _updated_count = 0 THEN
    RETURN json_build_object('success', false, 'error', 'Membership not found');
  END IF;
  
  RETURN json_build_object(
    'success', true, 
    'new_role', _new_role::text,
    'family_id', _family_id
  );
END;
$$;