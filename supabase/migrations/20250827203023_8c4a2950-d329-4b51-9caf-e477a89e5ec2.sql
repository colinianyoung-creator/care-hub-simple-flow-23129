-- Recreate the main functions first
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