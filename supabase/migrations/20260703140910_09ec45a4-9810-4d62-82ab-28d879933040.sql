-- 1. Allow care recipients (co-admins) to view & review role change requests
DROP POLICY IF EXISTS "Family admins can view role change requests" ON public.role_change_requests;
DROP POLICY IF EXISTS "Family admins can update role change requests" ON public.role_change_requests;

CREATE POLICY "Family managers can view role change requests"
  ON public.role_change_requests FOR SELECT
  USING (public.can_manage_family(auth.uid(), family_id));

CREATE POLICY "Family managers can update role change requests"
  ON public.role_change_requests FOR UPDATE
  USING (public.can_manage_family(auth.uid(), family_id));

-- 2. Member requests a role change for themselves
CREATE OR REPLACE FUNCTION public.request_role_change(_family_id uuid, _requested_role app_role, _reason text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _user_id uuid;
  _current_role app_role;
  _request_id uuid;
BEGIN
  _user_id := auth.uid();

  IF _user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Must be a member of the family
  SELECT role INTO _current_role
  FROM public.user_memberships
  WHERE user_id = _user_id AND family_id = _family_id;

  IF _current_role IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'You are not a member of this family');
  END IF;

  IF _current_role = _requested_role THEN
    RETURN jsonb_build_object('success', false, 'error', 'You already have this role');
  END IF;

  -- No duplicate pending request
  IF EXISTS (
    SELECT 1 FROM public.role_change_requests
    WHERE user_id = _user_id AND family_id = _family_id AND status = 'pending'
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'You already have a pending role change request');
  END IF;

  INSERT INTO public.role_change_requests (user_id, family_id, from_role, requested_role, reason, status)
  VALUES (_user_id, _family_id, _current_role, _requested_role, _reason, 'pending')
  RETURNING id INTO _request_id;

  RETURN jsonb_build_object('success', true, 'request_id', _request_id);
END;
$function$;

-- 3. Admin/care recipient changes a member's role directly (with safety rules)
CREATE OR REPLACE FUNCTION public.admin_change_member_role(_family_id uuid, _target_user_id uuid, _new_role app_role)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _caller uuid;
  _current_role app_role;
  _admin_count integer;
BEGIN
  _caller := auth.uid();

  IF _caller IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  IF NOT public.can_manage_family(_caller, _family_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only family admins or care recipients can change roles');
  END IF;

  SELECT role INTO _current_role
  FROM public.user_memberships
  WHERE user_id = _target_user_id AND family_id = _family_id;

  IF _current_role IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Member not found in this family');
  END IF;

  IF _current_role = _new_role THEN
    RETURN jsonb_build_object('success', true, 'new_role', _new_role::text, 'note', 'unchanged');
  END IF;

  -- Enforce single Family Admin per family
  IF _new_role = 'family_admin' AND EXISTS (
    SELECT 1 FROM public.user_memberships
    WHERE family_id = _family_id AND role = 'family_admin' AND user_id <> _target_user_id
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'This family already has a Family Admin');
  END IF;

  -- Enforce single Care Recipient per family
  IF _new_role = 'disabled_person' AND EXISTS (
    SELECT 1 FROM public.user_memberships
    WHERE family_id = _family_id AND role = 'disabled_person' AND user_id <> _target_user_id
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'This family already has a Care Recipient');
  END IF;

  -- Never leave the family without an admin (family_admin or disabled_person)
  IF _current_role IN ('family_admin', 'disabled_person')
     AND _new_role NOT IN ('family_admin', 'disabled_person') THEN
    SELECT COUNT(*) INTO _admin_count
    FROM public.user_memberships
    WHERE family_id = _family_id
      AND role IN ('family_admin', 'disabled_person')
      AND user_id <> _target_user_id;

    IF _admin_count = 0 THEN
      RETURN jsonb_build_object('success', false, 'error', 'Cannot remove the last admin from the family');
    END IF;
  END IF;

  UPDATE public.user_memberships
  SET role = _new_role, updated_at = now()
  WHERE user_id = _target_user_id AND family_id = _family_id;

  RETURN jsonb_build_object('success', true, 'new_role', _new_role::text);
END;
$function$;

-- 4. Review (approve/deny) a role change request
CREATE OR REPLACE FUNCTION public.review_role_change_request(_request_id uuid, _approve boolean, _reviewer_note text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _caller uuid;
  _req RECORD;
  _result jsonb;
BEGIN
  _caller := auth.uid();

  IF _caller IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT * INTO _req
  FROM public.role_change_requests
  WHERE id = _request_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Request not found');
  END IF;

  IF NOT public.can_manage_family(_caller, _req.family_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only family admins or care recipients can review requests');
  END IF;

  IF _req.status <> 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Request is not pending');
  END IF;

  IF _approve THEN
    _result := public.admin_change_member_role(_req.family_id, _req.user_id, _req.requested_role);
    IF NOT (_result->>'success')::boolean THEN
      RETURN _result; -- surface the rule failure, leave request pending
    END IF;

    UPDATE public.role_change_requests
    SET status = 'approved', reviewed_by = _caller, reviewed_at = now(), updated_at = now()
    WHERE id = _request_id;

    RETURN jsonb_build_object('success', true, 'status', 'approved');
  ELSE
    UPDATE public.role_change_requests
    SET status = 'rejected', reviewed_by = _caller, reviewed_at = now(), updated_at = now()
    WHERE id = _request_id;

    RETURN jsonb_build_object('success', true, 'status', 'rejected');
  END IF;
END;
$function$;