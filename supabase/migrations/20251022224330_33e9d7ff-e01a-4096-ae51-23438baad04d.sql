-- ============================================
-- 1. CREATE FUNCTION TO CHECK ADMIN SLOT AVAILABILITY
-- ============================================

CREATE OR REPLACE FUNCTION public.can_add_admin_role(_family_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Can only add family_admin or disabled_person as admins
  SELECT CASE 
    WHEN _role NOT IN ('family_admin', 'disabled_person') THEN true
    WHEN _role = 'family_admin' THEN 
      NOT EXISTS (
        SELECT 1 FROM user_memberships 
        WHERE family_id = _family_id 
        AND role = 'family_admin'
      )
    WHEN _role = 'disabled_person' THEN
      NOT EXISTS (
        SELECT 1 FROM user_memberships 
        WHERE family_id = _family_id 
        AND role = 'disabled_person'
      )
    ELSE false
  END;
$$;

-- ============================================
-- 2. CREATE FUNCTION TO CHECK IF USER IS PROTECTED ADMIN
-- ============================================

CREATE OR REPLACE FUNCTION public.is_protected_admin(_user_id uuid, _family_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_memberships
    WHERE user_id = _user_id 
    AND family_id = _family_id
    AND role IN ('family_admin', 'disabled_person')
  );
$$;

-- ============================================
-- 3. CREATE FUNCTION TO GET ADMIN ROLE OF USER
-- ============================================

CREATE OR REPLACE FUNCTION public.get_user_admin_role(_user_id uuid, _family_id uuid)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM user_memberships
  WHERE user_id = _user_id 
  AND family_id = _family_id
  AND role IN ('family_admin', 'disabled_person')
  LIMIT 1;
$$;

-- ============================================
-- 4. UPDATE RLS POLICY ON user_memberships FOR DELETE
-- ============================================

-- Drop existing delete policies
DROP POLICY IF EXISTS "Family admins can delete memberships" ON user_memberships;
DROP POLICY IF EXISTS "Users can delete their own membership" ON user_memberships;

-- New policy: Family admins can delete non-admin memberships
CREATE POLICY "Family admins can delete non-admin memberships"
  ON user_memberships FOR DELETE
  USING (
    is_family_admin(auth.uid(), family_id) 
    AND NOT is_protected_admin(user_id, family_id)
  );

-- New policy: Users can delete their own membership if not a protected admin
CREATE POLICY "Users can delete their own membership if not admin"
  ON user_memberships FOR DELETE
  USING (
    user_id = auth.uid() 
    AND NOT is_protected_admin(user_id, family_id)
  );

-- ============================================
-- 5. UPDATE RLS POLICY ON user_memberships FOR UPDATE
-- ============================================

-- Drop existing update policy
DROP POLICY IF EXISTS "Family admins can update memberships" ON user_memberships;

-- New policy: Family admins can update memberships but cannot demote protected admins
CREATE POLICY "Family admins can update non-admin memberships"
  ON user_memberships FOR UPDATE
  USING (
    is_family_admin(auth.uid(), family_id)
    AND NOT is_protected_admin(user_id, family_id)
  );

-- ============================================
-- 6. UPDATE RLS POLICY ON user_memberships FOR INSERT
-- ============================================

-- Drop existing insert policy
DROP POLICY IF EXISTS "Family admins or creators can insert memberships" ON user_memberships;

-- New policy: Check admin slot availability when inserting
CREATE POLICY "Family admins can insert if role slot available"
  ON user_memberships FOR INSERT
  WITH CHECK (
    (
      -- Family admins can add members if role slot is available
      is_family_admin(auth.uid(), family_id) 
      AND can_add_admin_role(family_id, role)
    ) 
    OR 
    (
      -- Family creators can add themselves (first membership only)
      user_id = auth.uid() 
      AND EXISTS (
        SELECT 1 FROM families 
        WHERE id = family_id 
        AND created_by = auth.uid()
      )
      AND NOT EXISTS (
        SELECT 1 FROM user_memberships 
        WHERE family_id = user_memberships.family_id
      )
    )
  );

-- ============================================
-- 7. UPDATE TRIGGER FUNCTION TO ONLY CREATE FAMILY FOR ADMINS
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  _user_role app_role;
  _family_id uuid;
  _first_name text;
BEGIN
  _user_role := COALESCE((NEW.raw_user_meta_data->>'selected_role')::app_role, 'carer'::app_role);
  
  -- Insert/update profile
  INSERT INTO public.profiles (id, full_name, care_recipient_name, preferred_role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.raw_user_meta_data->>'care_recipient_name',
    _user_role
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    care_recipient_name = COALESCE(EXCLUDED.care_recipient_name, profiles.care_recipient_name),
    preferred_role = COALESCE(EXCLUDED.preferred_role, profiles.preferred_role);
  
  -- Only create family for family_admin or disabled_person roles
  IF _user_role IN ('family_admin', 'disabled_person') 
     AND NOT EXISTS (SELECT 1 FROM public.user_memberships WHERE user_id = NEW.id) 
  THEN
    -- Extract first name from full name
    _first_name := SPLIT_PART(COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'), ' ', 1);
    
    -- Create personal family
    INSERT INTO public.families (name, created_by)
    VALUES (
      _first_name || '''s Care Space',
      NEW.id
    )
    RETURNING id INTO _family_id;
    
    -- Add user as member with their role
    INSERT INTO public.user_memberships (user_id, family_id, role)
    VALUES (NEW.id, _family_id, _user_role);
  END IF;
  
  RETURN NEW;
END;
$function$;

-- ============================================
-- 8. ADD COMMENTS TO DOCUMENT TWO-ADMIN SYSTEM
-- ============================================

COMMENT ON FUNCTION public.can_add_admin_role IS 
  'Checks if an admin role slot is available. Each family can have max one family_admin and one disabled_person.';

COMMENT ON FUNCTION public.is_protected_admin IS 
  'Returns true if user is a family_admin or disabled_person in the family. Protected admins cannot be removed or demoted by other admins.';

COMMENT ON FUNCTION public.get_user_admin_role IS 
  'Returns the admin role of a user in a family, if they have one (family_admin or disabled_person).';