-- Function to auto-redeem invite code after profile creation
CREATE OR REPLACE FUNCTION public.auto_redeem_invite_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _pending_code TEXT;
  _invite_record RECORD;
BEGIN
  -- Get pending invite code from auth.users metadata
  SELECT raw_user_meta_data->>'pending_invite_code' INTO _pending_code
  FROM auth.users
  WHERE id = NEW.id;
  
  IF _pending_code IS NOT NULL AND _pending_code != '' THEN
    -- Find valid, unused invite code
    SELECT * INTO _invite_record
    FROM invite_codes
    WHERE LOWER(code) = LOWER(_pending_code)
      AND used_by IS NULL
      AND expires_at > NOW();
    
    IF _invite_record.id IS NOT NULL THEN
      -- Mark invite as used
      UPDATE invite_codes
      SET used_by = NEW.id, used_at = NOW()
      WHERE id = _invite_record.id;
      
      -- Create user membership (if not exists)
      INSERT INTO user_memberships (user_id, family_id, role)
      VALUES (NEW.id, _invite_record.family_id, _invite_record.role)
      ON CONFLICT (user_id, family_id) DO NOTHING;
      
      -- Clear the pending invite code from user metadata
      UPDATE auth.users
      SET raw_user_meta_data = raw_user_meta_data - 'pending_invite_code'
      WHERE id = NEW.id;
      
      RAISE NOTICE 'Auto-redeemed invite code % for user %', _pending_code, NEW.id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger after profile insert
DROP TRIGGER IF EXISTS trigger_auto_redeem_invite ON profiles;
CREATE TRIGGER trigger_auto_redeem_invite
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION auto_redeem_invite_code();

-- Fix conversations SELECT RLS policy (was comparing to wrong column)
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

-- Add INSERT policy for profiles table
CREATE POLICY "Users can insert their own profile"
ON profiles FOR INSERT
WITH CHECK (auth.uid() = id);