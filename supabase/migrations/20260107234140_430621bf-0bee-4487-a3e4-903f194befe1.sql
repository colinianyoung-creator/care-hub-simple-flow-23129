-- Make user reference columns nullable to support ON DELETE SET NULL
-- This allows user deletion to cascade properly while preserving historical records

ALTER TABLE public.time_entries 
  ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE public.conversation_participants 
  ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE public.leave_requests 
  ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE public.messages 
  ALTER COLUMN sender_id DROP NOT NULL;

ALTER TABLE public.role_change_requests 
  ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE public.user_memberships 
  ALTER COLUMN user_id DROP NOT NULL;