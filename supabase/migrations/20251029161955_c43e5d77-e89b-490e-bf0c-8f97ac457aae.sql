-- Fix generate_invite to include extensions schema in search path
CREATE OR REPLACE FUNCTION public.generate_invite(
  _family_id UUID,
  _role public.app_role,
  _expires_days INTEGER DEFAULT 7
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  _code TEXT;
  _user_id UUID;
BEGIN
  _user_id := auth.uid();
  
  -- Check if user can manage family (family_admin OR disabled_person)
  IF NOT public.can_manage_family(_user_id, _family_id) THEN
    RAISE EXCEPTION 'Only family admins or care recipients can generate invites';
  END IF;
  
  -- Generate random code (gen_random_bytes now accessible from extensions schema)
  _code := encode(gen_random_bytes(6), 'hex');
  
  -- Insert invite
  INSERT INTO public.invite_codes (family_id, code, role, created_by, expires_at)
  VALUES (_family_id, _code, _role, _user_id, now() + (_expires_days || ' days')::INTERVAL);
  
  RETURN _code;
END;
$$;