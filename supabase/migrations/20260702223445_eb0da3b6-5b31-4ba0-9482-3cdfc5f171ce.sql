-- 1) invite_codes: restrict SELECT visibility to the admin who created the code
DROP POLICY IF EXISTS "Family admins can view invite codes" ON public.invite_codes;
CREATE POLICY "Admins can view own invite codes"
ON public.invite_codes
FOR SELECT
TO authenticated
USING (
  can_manage_family(auth.uid(), family_id)
  AND created_by = auth.uid()
);

-- 2) invite_codes: add explicit INSERT policy (defense in depth; RPC uses SECURITY DEFINER)
DROP POLICY IF EXISTS "Admins can create invite codes" ON public.invite_codes;
CREATE POLICY "Admins can create invite codes"
ON public.invite_codes
FOR INSERT
TO authenticated
WITH CHECK (
  can_manage_family(auth.uid(), family_id)
  AND created_by = auth.uid()
);

-- 3) mar_history: writes only occur via the mark_dose() SECURITY DEFINER function.
-- Add explicit policies that deny all client-side writes (defense in depth).
DROP POLICY IF EXISTS "No client inserts to mar_history" ON public.mar_history;
CREATE POLICY "No client inserts to mar_history"
ON public.mar_history
FOR INSERT
TO authenticated
WITH CHECK (false);

DROP POLICY IF EXISTS "No client updates to mar_history" ON public.mar_history;
CREATE POLICY "No client updates to mar_history"
ON public.mar_history
FOR UPDATE
TO authenticated
USING (false);

DROP POLICY IF EXISTS "No client deletes to mar_history" ON public.mar_history;
CREATE POLICY "No client deletes to mar_history"
ON public.mar_history
FOR DELETE
TO authenticated
USING (false);

-- 4) profile_pictures storage: remove the unrestricted public read policy.
-- Family-scoped SELECT policies already exist and remain the only way to view pictures.
DROP POLICY IF EXISTS "Users can view all profile pictures" ON storage.objects;

-- 5) realtime.messages: restrict Realtime channel subscriptions to conversation participants.
-- Message content is already protected by RLS on public.messages (postgres_changes respects it);
-- this adds authorization on the Realtime layer for conversation-scoped channels.
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
      AND realtime.topic() LIKE '%' || cp.conversation_id::text
  )
);