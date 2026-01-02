-- Create rate_limit_attempts table
CREATE TABLE public.rate_limit_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  identifier TEXT NOT NULL,
  action_type TEXT NOT NULL,
  attempted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  success BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create index for efficient lookups
CREATE INDEX idx_rate_limit_identifier_action ON public.rate_limit_attempts(identifier, action_type, attempted_at DESC);

-- Enable RLS
ALTER TABLE public.rate_limit_attempts ENABLE ROW LEVEL SECURITY;

-- No direct access - only via functions
CREATE POLICY "No direct access to rate limits"
ON public.rate_limit_attempts
FOR ALL
USING (false);

-- Function to check if action is rate limited
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  _identifier TEXT,
  _action_type TEXT,
  _window_minutes INTEGER DEFAULT 15,
  _max_attempts INTEGER DEFAULT 5
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _attempt_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO _attempt_count
  FROM public.rate_limit_attempts
  WHERE identifier = _identifier
    AND action_type = _action_type
    AND attempted_at > (now() - (_window_minutes || ' minutes')::INTERVAL)
    AND success = false;
  
  RETURN _attempt_count < _max_attempts;
END;
$$;

-- Function to record an attempt
CREATE OR REPLACE FUNCTION public.record_rate_limit_attempt(
  _identifier TEXT,
  _action_type TEXT,
  _success BOOLEAN DEFAULT false,
  _metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.rate_limit_attempts (identifier, action_type, success, metadata)
  VALUES (_identifier, _action_type, _success, _metadata);
END;
$$;

-- Function to get remaining attempts
CREATE OR REPLACE FUNCTION public.get_remaining_attempts(
  _identifier TEXT,
  _action_type TEXT,
  _window_minutes INTEGER DEFAULT 15,
  _max_attempts INTEGER DEFAULT 5
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _attempt_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO _attempt_count
  FROM public.rate_limit_attempts
  WHERE identifier = _identifier
    AND action_type = _action_type
    AND attempted_at > (now() - (_window_minutes || ' minutes')::INTERVAL)
    AND success = false;
  
  RETURN GREATEST(0, _max_attempts - _attempt_count);
END;
$$;

-- Function to cleanup old rate limit entries (call periodically)
CREATE OR REPLACE FUNCTION public.cleanup_rate_limit_attempts()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _deleted_count INTEGER;
BEGIN
  DELETE FROM public.rate_limit_attempts
  WHERE attempted_at < (now() - INTERVAL '24 hours');
  
  GET DIAGNOSTICS _deleted_count = ROW_COUNT;
  RETURN _deleted_count;
END;
$$;

-- Update redeem_invite to include rate limiting
CREATE OR REPLACE FUNCTION public.redeem_invite(_code text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _invite RECORD;
  _user_id UUID;
  _user_email TEXT;
  _is_allowed BOOLEAN;
BEGIN
  _user_id := auth.uid();
  
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Check rate limit (5 attempts per 15 minutes)
  _is_allowed := public.check_rate_limit(_user_id::TEXT, 'invite_redeem', 15, 5);
  
  IF NOT _is_allowed THEN
    RAISE EXCEPTION 'Too many attempts. Please try again later.';
  END IF;
  
  -- Ensure profile exists
  PERFORM public.ensure_user_profile();
  
  -- Get user email
  SELECT email INTO _user_email FROM auth.users WHERE id = _user_id;
  
  -- Get invite
  SELECT * INTO _invite
  FROM public.invite_codes
  WHERE code = _code
    AND used_by IS NULL
    AND expires_at > now();
  
  IF NOT FOUND THEN
    -- Record failed attempt
    PERFORM public.record_rate_limit_attempt(_user_id::TEXT, 'invite_redeem', false, jsonb_build_object('code', _code));
    RAISE EXCEPTION 'Invalid or expired invite code';
  END IF;
  
  -- Record successful attempt
  PERFORM public.record_rate_limit_attempt(_user_id::TEXT, 'invite_redeem', true, jsonb_build_object('code', _code, 'family_id', _invite.family_id));
  
  -- Add user to family
  INSERT INTO public.user_memberships (user_id, family_id, role)
  VALUES (_user_id, _invite.family_id, _invite.role)
  ON CONFLICT (user_id, family_id) DO NOTHING;
  
  -- Mark invite as used
  UPDATE public.invite_codes
  SET used_by = _user_id, used_at = now()
  WHERE id = _invite.id;
  
  -- If this invite is linked to a placeholder carer, link them
  IF _invite.placeholder_carer_id IS NOT NULL THEN
    UPDATE public.placeholder_carers
    SET linked_user_id = _user_id, is_linked = TRUE, updated_at = NOW()
    WHERE id = _invite.placeholder_carer_id AND is_linked = FALSE;
    
    UPDATE public.shift_assignments
    SET carer_id = _user_id, placeholder_carer_id = NULL, updated_at = NOW()
    WHERE placeholder_carer_id = _invite.placeholder_carer_id;
  ELSE
    PERFORM public.link_placeholder_carer(_user_id, _user_email);
  END IF;
  
  RETURN _invite.family_id;
END;
$$;