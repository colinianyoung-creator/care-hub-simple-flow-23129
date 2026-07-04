
CREATE TABLE public.admin_transfer_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  initiated_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  to_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  outgoing_role app_role NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_transfer_requests TO authenticated;
GRANT ALL ON public.admin_transfer_requests TO service_role;

ALTER TABLE public.admin_transfer_requests ENABLE ROW LEVEL SECURITY;

-- Members of a family can view that family's transfer requests
CREATE POLICY "Family members can view transfer requests"
ON public.admin_transfer_requests
FOR SELECT
TO authenticated
USING (public.is_family_member(auth.uid(), family_id));

-- Only one pending transfer per family
CREATE UNIQUE INDEX admin_transfer_requests_one_pending_per_family
ON public.admin_transfer_requests (family_id)
WHERE status = 'pending';

CREATE TRIGGER update_admin_transfer_requests_updated_at
BEFORE UPDATE ON public.admin_transfer_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Start a transfer (current Family Admin only)
CREATE OR REPLACE FUNCTION public.request_admin_transfer(_family_id uuid, _to_user_id uuid, _outgoing_role app_role)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _caller uuid;
  _target_role app_role;
  _request_id uuid;
BEGIN
  _caller := auth.uid();

  IF _caller IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Caller must be the current family_admin of this family
  IF NOT public.has_family_role(_caller, _family_id, 'family_admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only the current Family Admin can transfer the admin role');
  END IF;

  IF _caller = _to_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'You cannot transfer the admin role to yourself');
  END IF;

  IF _outgoing_role NOT IN ('carer', 'family_viewer') THEN
    RETURN jsonb_build_object('success', false, 'error', 'You can only step down to Carer or Family Viewer');
  END IF;

  -- Target must be an existing member of the family
  SELECT role INTO _target_role
  FROM public.user_memberships
  WHERE user_id = _to_user_id AND family_id = _family_id;

  IF _target_role IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'The selected person is not a member of this family');
  END IF;

  IF _target_role = 'family_admin' THEN
    RETURN jsonb_build_object('success', false, 'error', 'This person is already the Family Admin');
  END IF;

  -- No duplicate pending transfer
  IF EXISTS (
    SELECT 1 FROM public.admin_transfer_requests
    WHERE family_id = _family_id AND status = 'pending'
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'There is already a pending admin transfer for this family');
  END IF;

  INSERT INTO public.admin_transfer_requests (family_id, initiated_by, to_user_id, outgoing_role, status)
  VALUES (_family_id, _caller, _to_user_id, _outgoing_role, 'pending')
  RETURNING id INTO _request_id;

  RETURN jsonb_build_object('success', true, 'request_id', _request_id);
END;
$$;

-- Respond to a transfer (nominated user only)
CREATE OR REPLACE FUNCTION public.respond_admin_transfer(_request_id uuid, _accept boolean)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _caller uuid;
  _req RECORD;
BEGIN
  _caller := auth.uid();

  IF _caller IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT * INTO _req
  FROM public.admin_transfer_requests
  WHERE id = _request_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Transfer request not found');
  END IF;

  IF _req.status <> 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'This transfer request is no longer pending');
  END IF;

  IF _caller <> _req.to_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only the nominated person can respond to this transfer');
  END IF;

  IF NOT _accept THEN
    UPDATE public.admin_transfer_requests
    SET status = 'declined', reviewed_at = now(), updated_at = now()
    WHERE id = _request_id;
    RETURN jsonb_build_object('success', true, 'status', 'declined');
  END IF;

  -- Verify the initiator is still the family_admin (guard against stale requests)
  IF NOT public.has_family_role(_req.initiated_by, _req.family_id, 'family_admin') THEN
    UPDATE public.admin_transfer_requests
    SET status = 'cancelled', reviewed_at = now(), updated_at = now()
    WHERE id = _request_id;
    RETURN jsonb_build_object('success', false, 'error', 'The original admin is no longer the Family Admin; transfer cancelled');
  END IF;

  -- Target must still be a member
  IF NOT public.is_family_member(_req.to_user_id, _req.family_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'You are no longer a member of this family');
  END IF;

  -- Atomic swap: outgoing admin -> chosen role, nominee -> family_admin
  UPDATE public.user_memberships
  SET role = _req.outgoing_role, updated_at = now()
  WHERE user_id = _req.initiated_by AND family_id = _req.family_id;

  UPDATE public.user_memberships
  SET role = 'family_admin', updated_at = now()
  WHERE user_id = _req.to_user_id AND family_id = _req.family_id;

  UPDATE public.admin_transfer_requests
  SET status = 'accepted', reviewed_at = now(), updated_at = now()
  WHERE id = _request_id;

  RETURN jsonb_build_object('success', true, 'status', 'accepted');
END;
$$;

-- Cancel a still-pending transfer (initiating admin only)
CREATE OR REPLACE FUNCTION public.cancel_admin_transfer(_request_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _caller uuid;
  _req RECORD;
BEGIN
  _caller := auth.uid();

  IF _caller IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT * INTO _req
  FROM public.admin_transfer_requests
  WHERE id = _request_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Transfer request not found');
  END IF;

  IF _req.status <> 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'This transfer request is no longer pending');
  END IF;

  IF _caller <> _req.initiated_by THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only the admin who started this transfer can cancel it');
  END IF;

  UPDATE public.admin_transfer_requests
  SET status = 'cancelled', reviewed_at = now(), updated_at = now()
  WHERE id = _request_id;

  RETURN jsonb_build_object('success', true, 'status', 'cancelled');
END;
$$;
