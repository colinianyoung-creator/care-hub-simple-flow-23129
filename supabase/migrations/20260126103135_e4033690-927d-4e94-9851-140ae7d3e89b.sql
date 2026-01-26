-- ============================================================
-- Security Enhancement: Add explicit authentication checks
-- Fixes error-level findings from security scanner
-- ============================================================

-- 1. PROFILES TABLE: Add explicit authentication requirement
-- Current policy relies on auth.uid() returning NULL for anon users
-- Making it explicit prevents any edge case vulnerabilities

DROP POLICY IF EXISTS "Users can view related profiles" ON profiles;
CREATE POLICY "Users can view related profiles"
ON profiles FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  AND (
    auth.uid() = id 
    OR users_in_same_family(auth.uid(), id)
  )
);

-- 2. CARE_RECIPIENTS TABLE: Strengthen with explicit family_id scoping
-- The existing is_family_member function already properly checks family membership
-- Adding explicit auth check and ensuring family_id from the row is used correctly

DROP POLICY IF EXISTS "Family members can view care recipients" ON care_recipients;
CREATE POLICY "Family members can view care recipients"
ON care_recipients FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  AND is_family_member(auth.uid(), family_id)
);

DROP POLICY IF EXISTS "Family admins can manage care recipients" ON care_recipients;
CREATE POLICY "Family admins can manage care recipients"
ON care_recipients FOR ALL
USING (
  auth.uid() IS NOT NULL 
  AND is_family_admin(auth.uid(), family_id)
)
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND is_family_admin(auth.uid(), family_id)
);