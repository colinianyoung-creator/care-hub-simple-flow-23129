
-- 1) Add missing foreign key so PostgREST can join user_memberships -> families
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_user_memberships_family'
      AND table_schema = 'public'
      AND table_name = 'user_memberships'
      AND constraint_type = 'FOREIGN KEY'
  ) THEN
    ALTER TABLE public.user_memberships
      ADD CONSTRAINT fk_user_memberships_family
      FOREIGN KEY (family_id)
      REFERENCES public.families(id)
      ON DELETE CASCADE;
  END IF;
END;
$$;

-- 2) Ensure creator is auto-added with the correct role based on their profile
CREATE OR REPLACE FUNCTION public.handle_family_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  creator_role app_role := 'family_admin';
BEGIN
  -- If profile has a default_role, use it; otherwise default to family_admin
  SELECT COALESCE(p.default_role, 'family_admin'::app_role)
    INTO creator_role
  FROM public.profiles p
  WHERE p.id = NEW.created_by;

  INSERT INTO public.user_memberships (user_id, family_id, role)
  VALUES (NEW.created_by, NEW.id, creator_role)
  ON CONFLICT (user_id, family_id) DO NOTHING;

  RETURN NEW;
END;
$$;
