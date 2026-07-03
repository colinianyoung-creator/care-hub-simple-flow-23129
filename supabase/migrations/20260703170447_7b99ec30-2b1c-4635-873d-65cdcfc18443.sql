-- =====================================================================
-- Security hardening for 4 scanner findings
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) realtime.messages: replace loose substring topic match with exact
--    equality against the app's known conversation-scoped channel names.
--    Channels used by the app: messages-<id>, typing-<id>, read-receipts-<id>
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "Conversation participants can use realtime channels" ON realtime.messages;
CREATE POLICY "Conversation participants can use realtime channels"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.conversation_participants cp
    WHERE cp.user_id = auth.uid()
      AND realtime.topic() IN (
        'messages-'       || cp.conversation_id::text,
        'typing-'         || cp.conversation_id::text,
        'read-receipts-'  || cp.conversation_id::text
      )
  )
);

-- ---------------------------------------------------------------------
-- 2) public.profiles: stop exposing raw contact columns via the base
--    table. Move from a table-wide SELECT grant to column-level grants
--    that exclude email / phone / contact_email / contact_phone.
--    Owners still read their own contact info through the SECURITY
--    DEFINER RPC get_profile_safe(); relational lookups use
--    profiles_limited (non-sensitive columns only).
-- ---------------------------------------------------------------------
REVOKE SELECT ON public.profiles FROM authenticated;
REVOKE SELECT ON public.profiles FROM anon;

GRANT SELECT (
  id, full_name, profile_picture_url, created_at, updated_at,
  care_recipient_name, ui_preference, two_factor_enabled,
  theme, time_format, date_format, reduced_motion, high_contrast, font_size, language
) ON public.profiles TO authenticated;

GRANT SELECT (
  id, full_name, profile_picture_url, created_at, updated_at,
  care_recipient_name, ui_preference, two_factor_enabled,
  theme, time_format, date_format, reduced_motion, high_contrast, font_size, language
) ON public.profiles TO anon;

-- ---------------------------------------------------------------------
-- 3) SECURITY DEFINER functions: remove anonymous / PUBLIC execute on
--    every definer function in the public schema so unauthenticated
--    callers can no longer invoke any of them.
-- ---------------------------------------------------------------------
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT 'public.' || quote_ident(p.proname) || '(' || pg_get_function_identity_arguments(p.oid) || ')' AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef
  LOOP
    EXECUTE 'REVOKE EXECUTE ON FUNCTION ' || r.sig || ' FROM PUBLIC';
    EXECUTE 'REVOKE EXECUTE ON FUNCTION ' || r.sig || ' FROM anon';
  END LOOP;
END $$;

-- ---------------------------------------------------------------------
-- 4) Also drop authenticated execute on definer functions that are
--    purely internal (trigger bodies, rate-limit internals, helpers
--    invoked only from other definer functions). These are never called
--    directly by the client and are not referenced by RLS policies, so
--    revoking authenticated execute reduces surface without affecting
--    the app. RLS helper functions and intentional client RPCs keep
--    their authenticated execute grant.
-- ---------------------------------------------------------------------
DO $$
DECLARE
  r record;
  internal text[] := ARRAY[
    'check_rate_limit','record_rate_limit_attempt','get_remaining_attempts','cleanup_rate_limit_attempts',
    'link_placeholder_carer','create_recurring_task_instance','update_own_role_safe',
    'can_view_contact_details','has_family_role','get_user_family_role','get_user_admin_role','has_role',
    'auto_redeem_invite_code','handle_new_user','handle_new_user_profile','trigger_generate_mar_doses',
    'update_updated_at_column','update_family_settings_updated_at'
  ];
BEGIN
  FOR r IN
    SELECT 'public.' || quote_ident(p.proname) || '(' || pg_get_function_identity_arguments(p.oid) || ')' AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef AND p.proname = ANY(internal)
  LOOP
    EXECUTE 'REVOKE EXECUTE ON FUNCTION ' || r.sig || ' FROM authenticated';
  END LOOP;
END $$;