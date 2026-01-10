-- Fix all conversation-related RLS policies to be PERMISSIVE (default)
-- Currently they are RESTRICTIVE which blocks all access when no permissive policies exist

-- conversations table policies
DROP POLICY IF EXISTS "Family members can create conversations" ON conversations;
CREATE POLICY "Family members can create conversations"
ON conversations FOR INSERT
WITH CHECK (is_family_member(auth.uid(), family_id) AND (created_by = auth.uid()));

DROP POLICY IF EXISTS "Conversation creators can update" ON conversations;
CREATE POLICY "Conversation creators can update"
ON conversations FOR UPDATE
USING (created_by = auth.uid());

DROP POLICY IF EXISTS "Users can view conversations they participate in" ON conversations;
CREATE POLICY "Users can view conversations they participate in"
ON conversations FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_participants.conversation_id = conversations.id
      AND conversation_participants.user_id = auth.uid()
  )
);

-- conversation_participants table policies
DROP POLICY IF EXISTS "Conversation participants can add members from same family" ON conversation_participants;
CREATE POLICY "Conversation participants can add members from same family"
ON conversation_participants FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id = conversation_participants.conversation_id 
      AND is_family_member(auth.uid(), c.family_id)
  )
);

DROP POLICY IF EXISTS "Users can view their conversation participations" ON conversation_participants;
CREATE POLICY "Users can view their conversation participations"
ON conversation_participants FOR SELECT
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own participation" ON conversation_participants;
CREATE POLICY "Users can update their own participation"
ON conversation_participants FOR UPDATE
USING (user_id = auth.uid());