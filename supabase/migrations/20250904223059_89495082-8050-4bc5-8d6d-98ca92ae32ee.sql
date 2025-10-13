
-- 1) Returns a safe care recipient display name for a family, enforcing membership
create or replace function public.get_care_recipient_name_for_family(_family_id uuid)
returns text
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  _name text;
begin
  -- Only allow family members to resolve names
  if not public.is_member(auth.uid(), _family_id) then
    return null;
  end if;

  -- Preferred: from care_recipients (already visible to members via RLS)
  select cr.name
    into _name
  from public.care_recipients cr
  where cr.family_id = _family_id
  limit 1;

  if _name is not null and length(trim(_name)) > 0 then
    return _name;
  end if;

  -- Fallback: family's disabled person profile full_name
  select p.full_name
    into _name
  from public.profiles p
  join public.user_memberships um on um.user_id = p.id
  where um.family_id = _family_id
    and um.role = 'disabled_person'
  limit 1;

  if _name is not null and length(trim(_name)) > 0 then
    return _name;
  end if;

  -- Fallback: any family admin's profile full_name
  select p.full_name
    into _name
  from public.profiles p
  join public.user_memberships um on um.user_id = p.id
  where um.family_id = _family_id
    and um.role = 'family_admin'
  limit 1;

  return coalesce(nullif(trim(_name), ''), 'Care Family');
end;
$$;

-- 2) Returns shift instances within a date range plus carer and care recipient names,
--    enforcing role-appropriate visibility
create or replace function public.get_shift_instances_with_names(
  _family_id uuid,
  _start_date date,
  _end_date date
)
returns table (
  id uuid,
  shift_assignment_id uuid,
  family_id uuid,
  scheduled_date date,
  start_time time without time zone,
  end_time time without time zone,
  status text,
  carer_id uuid,
  carer_name text,
  care_recipient_name text,
  notes text,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
)
language plpgsql
security definer
stable
set search_path = public
as $$
begin
  -- Must be a member of this family
  if not public.is_member(auth.uid(), _family_id) then
    return;
  end if;

  -- Admin-like roles: return all shifts for the family
  if public.has_family_role(auth.uid(), _family_id, 'family_admin')
     or public.has_family_role(auth.uid(), _family_id, 'disabled_person')
     or public.has_family_role(auth.uid(), _family_id, 'manager')
     or public.has_family_role(auth.uid(), _family_id, 'family_viewer')
  then
    return query
      select
        si.id,
        si.shift_assignment_id,
        si.family_id,
        si.scheduled_date,
        si.start_time,
        si.end_time,
        si.status,
        si.carer_id,
        coalesce(cp.full_name, 'Carer') as carer_name,
        public.get_care_recipient_name_for_family(_family_id) as care_recipient_name,
        si.notes,
        si.created_at,
        si.updated_at
      from public.shift_instances si
      left join public.profiles cp on cp.id = si.carer_id
      where si.family_id = _family_id
        and si.scheduled_date between _start_date and _end_date
      order by si.scheduled_date, si.start_time nulls first;
    return;
  end if;

  -- Carers: only their own shifts
  if public.has_family_role(auth.uid(), _family_id, 'carer') then
    return query
      select
        si.id,
        si.shift_assignment_id,
        si.family_id,
        si.scheduled_date,
        si.start_time,
        si.end_time,
        si.status,
        si.carer_id,
        coalesce(cp.full_name, 'Carer') as carer_name,
        public.get_care_recipient_name_for_family(_family_id) as care_recipient_name,
        si.notes,
        si.created_at,
        si.updated_at
      from public.shift_instances si
      left join public.profiles cp on cp.id = si.carer_id
      where si.family_id = _family_id
        and si.carer_id = auth.uid()
        and si.scheduled_date between _start_date and _end_date
      order by si.scheduled_date, si.start_time nulls first;
    return;
  end if;

  -- Any other role: return nothing
  return;
end;
$$;
