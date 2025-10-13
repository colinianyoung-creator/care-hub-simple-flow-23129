
-- 1) Extend time_entries to support external carers (admin-entered manual hours)
alter table public.time_entries
  add column if not exists is_external boolean not null default false,
  add column if not exists worked_by_name text;

-- 2) Recurring schedules for planned shifts
create table if not exists public.shift_schedules (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null,
  care_recipient_id uuid,
  title text not null,
  notes text,
  assignee_id uuid,                            -- optional planned assignee
  start_date date not null,
  end_date date,
  start_time time not null,
  end_time time not null,
  days_of_week smallint[] not null,            -- 0=Sun .. 6=Sat
  frequency text not null default 'weekly',    -- prototype: weekly
  interval integer not null default 1,         -- e.g. every 1 week
  timezone text not null default 'UTC',
  active boolean not null default true,
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.shift_schedules enable row level security;

create policy if not exists "Family members can view shift schedules"
  on public.shift_schedules
  for select
  using (is_member(auth.uid(), family_id));

create policy if not exists "Admins can manage shift schedules"
  on public.shift_schedules
  for all
  using (
    has_family_role(auth.uid(), family_id, 'family_admin'::app_role)
    or has_family_role(auth.uid(), family_id, 'disabled_person'::app_role)
  )
  with check (
    (has_family_role(auth.uid(), family_id, 'family_admin'::app_role)
     or has_family_role(auth.uid(), family_id, 'disabled_person'::app_role))
    and created_by = auth.uid()
  );

drop trigger if exists trg_shift_schedules_updated_at on public.shift_schedules;
create trigger trg_shift_schedules_updated_at
  before update on public.shift_schedules
  for each row
  execute procedure public.update_updated_at_column();

-- 3) Exceptions/amendments for schedules (holidays, sick, swaps, extra shifts)
create table if not exists public.shift_exceptions (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null,
  schedule_id uuid,
  date date not null,
  action text not null,                         -- e.g. 'cancelled','time_change','reassigned','extra_shift','holiday','sick'
  new_start timestamptz,
  new_end timestamptz,
  new_assignee_id uuid,
  is_external boolean not null default false,
  worked_by_name text,
  note text,
  created_by uuid not null,
  created_at timestamptz not null default now()
);

alter table public.shift_exceptions enable row level security;

create policy if not exists "Family members can view shift exceptions"
  on public.shift_exceptions
  for select
  using (is_member(auth.uid(), family_id));

create policy if not exists "Admins can manage shift exceptions"
  on public.shift_exceptions
  for all
  using (
    has_family_role(auth.uid(), family_id, 'family_admin'::app_role)
    or has_family_role(auth.uid(), family_id, 'disabled_person'::app_role)
  )
  with check (
    has_family_role(auth.uid(), family_id, 'family_admin'::app_role)
    or has_family_role(auth.uid(), family_id, 'disabled_person'::app_role)
  );

-- 4) Appointments (editable by all family members)
create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null,
  care_recipient_id uuid,
  title text not null,
  description text,
  location text,
  start_at timestamptz not null,
  end_at timestamptz,
  created_by uuid not null,
  assigned_to uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.appointments enable row level security;

create policy if not exists "Family members can select appointments"
  on public.appointments
  for select
  using (is_member(auth.uid(), family_id));

create policy if not exists "Family members can insert appointments"
  on public.appointments
  for insert
  with check (is_member(auth.uid(), family_id) and created_by = auth.uid());

create policy if not exists "Family members can update appointments"
  on public.appointments
  for update
  using (is_member(auth.uid(), family_id));

create policy if not exists "Family members can delete appointments"
  on public.appointments
  for delete
  using (is_member(auth.uid(), family_id));

drop trigger if exists trg_appointments_updated_at on public.appointments;
create trigger trg_appointments_updated_at
  before update on public.appointments
  for each row
  execute procedure public.update_updated_at_column();

-- 5) Medication Notes (authors + admins can edit/delete)
create table if not exists public.medication_entries (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null,
  care_recipient_id uuid,
  medication_name text not null,
  dosage text,
  taken_at timestamptz not null default now(),
  scheduled_at timestamptz,
  reminder_at timestamptz,
  notes text,
  created_by uuid not null,
  created_at timestamptz not null default now()
);

alter table public.medication_entries enable row level security;

create policy if not exists "Family members can view medication entries"
  on public.medication_entries
  for select
  using (is_member(auth.uid(), family_id));

create policy if not exists "Family members can create medication entries"
  on public.medication_entries
  for insert
  with check (is_member(auth.uid(), family_id) and created_by = auth.uid());

create policy if not exists "Authors and admins can update medication entries"
  on public.medication_entries
  for update
  using (
    created_by = auth.uid()
    or has_family_role(auth.uid(), family_id, 'family_admin'::app_role)
    or has_family_role(auth.uid(), family_id, 'disabled_person'::app_role)
  );

create policy if not exists "Authors and admins can delete medication entries"
  on public.medication_entries
  for delete
  using (
    created_by = auth.uid()
    or has_family_role(auth.uid(), family_id, 'family_admin'::app_role)
    or has_family_role(auth.uid(), family_id, 'disabled_person'::app_role)
  );

-- 6) Profiles: optional contact info + updated_at
alter table public.profiles
  add column if not exists contact_phone text,
  add column if not exists contact_email text,
  add column if not exists updated_at timestamptz not null default now();

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row
  execute procedure public.update_updated_at_column();
