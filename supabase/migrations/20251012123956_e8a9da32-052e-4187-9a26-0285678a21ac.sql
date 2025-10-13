-- ============================================
-- SECURITY FIX: Address Error-Level Findings
-- ============================================

-- 1. Fix profiles table RLS policy
-- Current policy allows direct access to contact info
-- We need to restrict it so applications use profiles_safe view instead

DROP POLICY IF EXISTS "Users can view profiles with masked contact info" ON profiles;

-- Users can view their own full profile
CREATE POLICY "Users can view own profile with full contact"
ON profiles FOR SELECT
USING (id = auth.uid());

-- Family admins can view profiles in their families (but should use profiles_safe for masked data)
CREATE POLICY "Admins can view family member profiles"
ON profiles FOR SELECT
USING (
  users_in_same_family(auth.uid(), id) 
  AND (
    has_family_role(auth.uid(), (
      SELECT family_id FROM user_memberships 
      WHERE user_id = profiles.id 
      LIMIT 1
    ), 'family_admin'::app_role)
    OR has_family_role(auth.uid(), (
      SELECT family_id FROM user_memberships 
      WHERE user_id = profiles.id 
      LIMIT 1
    ), 'disabled_person'::app_role)
  )
);

-- NOTE: Applications should use profiles_safe view for masked contact info
-- profiles_safe already has proper masking built in