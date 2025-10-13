-- Fix function search path security issues by setting search_path to 'public'

-- Update existing functions to have secure search_path
CREATE OR REPLACE FUNCTION public.has_family_role(_user_id uuid, _family_id uuid, _role app_role)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT exists (
    SELECT 1
    FROM public.user_memberships m
    WHERE m.user_id = _user_id
      AND m.family_id = _family_id
      AND m.role = _role
  );
$function$;

CREATE OR REPLACE FUNCTION public.is_member(_user_id uuid, _family_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT exists (
    SELECT 1
    FROM public.user_memberships m
    WHERE m.user_id = _user_id
      AND m.family_id = _family_id
  );
$function$;

CREATE OR REPLACE FUNCTION public.generate_invite(_family_id uuid, _role app_role)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;