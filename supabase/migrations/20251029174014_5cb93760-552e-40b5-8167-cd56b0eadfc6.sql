-- Fix 1: Update generate_invite to produce 8-character codes (4 bytes = 8 hex chars)
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
  
  IF NOT public.can_manage_family(_user_id, _family_id) THEN
    RAISE EXCEPTION 'Only family admins or care recipients can generate invites';
  END IF;
  
  -- Generate 8-character random code (4 bytes = 8 hex chars)
  _code := encode(gen_random_bytes(4), 'hex');
  
  INSERT INTO public.invite_codes (family_id, code, role, created_by, expires_at)
  VALUES (_family_id, _code, _role, _user_id, now() + (_expires_days || ' days')::INTERVAL);
  
  RETURN _code;
END;
$$;

-- Fix 3: Add DELETE policy for invite codes
CREATE POLICY "Admins can delete invite codes"
ON public.invite_codes
FOR DELETE
TO authenticated
USING (public.can_manage_family(auth.uid(), family_id));

-- Fix 3: Add UPDATE policy for invite codes
CREATE POLICY "Admins can update invite codes"
ON public.invite_codes
FOR UPDATE
TO authenticated
USING (public.can_manage_family(auth.uid(), family_id))
WITH CHECK (public.can_manage_family(auth.uid(), family_id));