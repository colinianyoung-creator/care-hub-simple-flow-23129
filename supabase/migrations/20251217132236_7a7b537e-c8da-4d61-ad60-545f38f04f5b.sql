-- Add placeholder_carer_id column to invite_codes
ALTER TABLE public.invite_codes 
ADD COLUMN placeholder_carer_id uuid REFERENCES public.placeholder_carers(id) ON DELETE SET NULL;

-- Drop and recreate generate_invite function with placeholder support
DROP FUNCTION IF EXISTS public.generate_invite(uuid, app_role, integer);

CREATE OR REPLACE FUNCTION public.generate_invite(
  _family_id uuid, 
  _role app_role, 
  _expires_days integer DEFAULT 7,
  _placeholder_carer_id uuid DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
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
  
  INSERT INTO public.invite_codes (family_id, code, role, created_by, expires_at, placeholder_carer_id)
  VALUES (_family_id, _code, _role, _user_id, now() + (_expires_days || ' days')::INTERVAL, _placeholder_carer_id);
  
  RETURN _code;
END;
$function$;

-- Update redeem_invite to handle placeholder carer linking
CREATE OR REPLACE FUNCTION public.redeem_invite(_code text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _invite RECORD;
  _user_id UUID;
  _user_email TEXT;
BEGIN
  _user_id := auth.uid();
  
  -- Ensure profile exists
  PERFORM public.ensure_user_profile();
  
  -- Get user email
  SELECT email INTO _user_email FROM auth.users WHERE id = _user_id;
  
  -- Get invite
  SELECT * INTO _invite
  FROM public.invite_codes
  WHERE code = _code
    AND used_by IS NULL
    AND expires_at > now();
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or expired invite code';
  END IF;
  
  -- Add user to family
  INSERT INTO public.user_memberships (user_id, family_id, role)
  VALUES (_user_id, _invite.family_id, _invite.role)
  ON CONFLICT (user_id, family_id) DO NOTHING;
  
  -- Mark invite as used
  UPDATE public.invite_codes
  SET used_by = _user_id, used_at = now()
  WHERE id = _invite.id;
  
  -- If this invite is linked to a placeholder carer, link them
  IF _invite.placeholder_carer_id IS NOT NULL THEN
    -- Update the specific placeholder carer
    UPDATE public.placeholder_carers
    SET linked_user_id = _user_id, is_linked = TRUE, updated_at = NOW()
    WHERE id = _invite.placeholder_carer_id AND is_linked = FALSE;
    
    -- Transfer shift assignments from placeholder to real user
    UPDATE public.shift_assignments
    SET carer_id = _user_id, placeholder_carer_id = NULL, updated_at = NOW()
    WHERE placeholder_carer_id = _invite.placeholder_carer_id;
  ELSE
    -- Try to link by email if no specific placeholder
    PERFORM public.link_placeholder_carer(_user_id, _user_email);
  END IF;
  
  RETURN _invite.family_id;
END;
$function$;