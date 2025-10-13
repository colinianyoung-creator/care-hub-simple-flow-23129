-- Update RLS policy to allow admins to create shift requests on behalf of carers
-- This enables notifications when admins edit shifts
DROP POLICY IF EXISTS "Carers can create their own shift requests" ON public.shift_requests;

CREATE POLICY "Carers and admins can create shift requests" 
ON public.shift_requests 
FOR INSERT 
WITH CHECK (
  is_member(auth.uid(), family_id) AND 
  (
    requester_id = auth.uid() OR 
    (
      (has_family_role(auth.uid(), family_id, 'family_admin'::app_role) OR 
       has_family_role(auth.uid(), family_id, 'disabled_person'::app_role)) AND
      request_type = 'shift_change_notification'
    )
  )
);