
-- Allow requesters and admins/disabled person to delete shift requests
create policy "Requesters and admins can delete shift requests"
on public.shift_requests
for delete
to authenticated
using (
  is_member(auth.uid(), family_id)
  and (
    has_family_role(auth.uid(), family_id, 'family_admin'::app_role)
    or has_family_role(auth.uid(), family_id, 'disabled_person'::app_role)
    or (
      has_family_role(auth.uid(), family_id, 'carer'::app_role)
      and requester_id = auth.uid()
    )
  )
);
