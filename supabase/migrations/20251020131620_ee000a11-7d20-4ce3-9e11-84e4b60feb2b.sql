-- Drop the public SELECT policy that exposes invite codes to unauthenticated users
DROP POLICY IF EXISTS "Anyone can view unexpired unused invites for redemption" ON public.invite_codes;

-- Keep the family admin policy for viewing their own invite codes
-- (This policy should already exist and allows admins to manage their family's invites)