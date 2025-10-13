
-- Extensions
create extension if not exists "pgcrypto";

-- 1) Roles enum
do $$
begin
  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type public.app_role as enum ('family_admin', 'carer');
  end if;
end$$;

-- 2) Profiles (mirror of auth.users; use for app-level metadata)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

-- Profiles policies: a user can see/update only their own profile
do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'profiles' and policyname = 'Users can select own profile') then
    create policy "Users can select own profile"
      on public.profiles
      for select
      to authenticated
      using (id = auth.uid());
  end if;

  if not exists (select 1 from pg_policies where tablename = 'profiles' and policyname = 'Users can upsert own profile') then
    create policy "Users can upsert own profile"
      on public.profiles
      for all
      to authenticated
      using (id = auth.uid())
      with check (id = auth.uid());
  end if;
end$$;

-- 3) Families (orgs)
create table if not exists public.families (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.families enable row level security;

-- 4) Care recipients (clients)
create table if not exists public.care_recipients (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  name text not null,
  notes text,
  created_at timestamptz not null default now()
);
alter table public.care_recipients enable row level security;

-- 5) Memberships (user <-> family with role)
create table if not exists public.user_memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  family_id uuid not null references public.families(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, family_id)
);
alter table public.user_memberships enable row level security;

-- 6) Helper functions (security definer) to avoid recursive RLS
create or replace function public.is_member(_user_id uuid, _family_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_memberships m
    where m.user_id = _user_id
      and m.family_id = _family_id
  );
$$;

create or replace function public.has_family_role(_user_id uuid, _family_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_memberships m
    where m.user_id = _user_id
      and m.family_id = _family_id
      and m.role = _role
  );
$$;

-- 7) Auto-add creator as family_admin on family creation
create or replace function public.handle_family_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_memberships (user_id, family_id, role)
  values (new.created_by, new.id, 'family_admin')
  on conflict (user_id, family_id) do nothing;
  return new;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'on_family_created_add_admin'
  ) then
    create trigger on_family_created_add_admin
      after insert on public.families
      for each row execute procedure public.handle_family_created();
  end if;
end$$;

-- 8) RLS Policies

-- Families
do $$
begin
  if not exists (select 1 from pg_policies where tablename='families' and policyname='Families: members can select') then
    create policy "Families: members can select"
      on public.families
      for select
      to authenticated
      using (public.is_member(auth.uid(), id));
  end if;

  if not exists (select 1 from pg_policies where tablename='families' and policyname='Families: creator can insert') then
    create policy "Families: creator can insert"
      on public.families
      for insert
      to authenticated
      with check (created_by = auth.uid());
  end if;

  if not exists (select 1 from pg_policies where tablename='families' and policyname='Families: admin can update') then
    create policy "Families: admin can update"
      on public.families
      for update
      to authenticated
      using (public.has_family_role(auth.uid(), id, 'family_admin'));
  end if;

  if not exists (select 1 from pg_policies where tablename='families' and policyname='Families: admin can delete') then
    create policy "Families: admin can delete"
      on public.families
      for delete
      to authenticated
      using (public.has_family_role(auth.uid(), id, 'family_admin'));
  end if;
end$$;

-- User memberships
do $$
begin
  if not exists (select 1 from pg_policies where tablename='user_memberships' and policyname='Memberships: members can select') then
    create policy "Memberships: members can select"
      on public.user_memberships
      for select
      to authenticated
      using (public.is_member(auth.uid(), family_id) or user_id = auth.uid());
  end if;

  if not exists (select 1 from pg_policies where tablename='user_memberships' and policyname='Memberships: admin can insert') then
    create policy "Memberships: admin can insert"
      on public.user_memberships
      for insert
      to authenticated
      with check (public.has_family_role(auth.uid(), family_id, 'family_admin'));
  end if;

  if not exists (select 1 from pg_policies where tablename='user_memberships' and policyname='Memberships: admin can update') then
    create policy "Memberships: admin can update"
      on public.user_memberships
      for update
      to authenticated
      using (public.has_family_role(auth.uid(), family_id, 'family_admin'));
  end if;

  if not exists (select 1 from pg_policies where tablename='user_memberships' and policyname='Memberships: admin can delete') then
    create policy "Memberships: admin can delete"
      on public.user_memberships
      for delete
      to authenticated
      using (public.has_family_role(auth.uid(), family_id, 'family_admin'));
  end if;
end$$;

-- Care recipients
do $$
begin
  if not exists (select 1 from pg_policies where tablename='care_recipients' and policyname='Care recipients: members can select') then
    create policy "Care recipients: members can select"
      on public.care_recipients
      for select
      to authenticated
      using (public.is_member(auth.uid(), family_id));
  end if;

  if not exists (select 1 from pg_policies where tablename='care_recipients' and policyname='Care recipients: admin can insert') then
    create policy "Care recipients: admin can insert"
      on public.care_recipients
      for insert
      to authenticated
      with check (public.has_family_role(auth.uid(), family_id, 'family_admin'));
  end if;

  if not exists (select 1 from pg_policies where tablename='care_recipients' and policyname='Care recipients: admin can update') then
    create policy "Care recipients: admin can update"
      on public.care_recipients
      for update
      to authenticated
      using (public.has_family_role(auth.uid(), family_id, 'family_admin'));
  end if;

  if not exists (select 1 from pg_policies where tablename='care_recipients' and policyname='Care recipients: admin can delete') then
    create policy "Care recipients: admin can delete"
      on public.care_recipients
      for delete
      to authenticated
      using (public.has_family_role(auth.uid(), family_id, 'family_admin'));
  end if;
end$$;

-- Time entries
create table if not exists public.time_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  family_id uuid not null references public.families(id) on delete cascade,
  care_recipient_id uuid references public.care_recipients(id) on delete set null,
  start_time timestamptz not null,
  end_time timestamptz,
  notes text,
  created_at timestamptz not null default now()
);
alter table public.time_entries enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where tablename='time_entries' and policyname='Time entries: members can select') then
    create policy "Time entries: members can select"
      on public.time_entries
      for select
      to authenticated
      using (public.is_member(auth.uid(), family_id));
  end if;

  if not exists (select 1 from pg_policies where tablename='time_entries' and policyname='Time entries: carers insert own rows') then
    create policy "Time entries: carers insert own rows"
      on public.time_entries
      for insert
      to authenticated
      with check (public.is_member(auth.uid(), family_id) and user_id = auth.uid());
  end if;

  if not exists (select 1 from pg_policies where tablename='time_entries' and policyname='Time entries: owners or admin can update') then
    create policy "Time entries: owners or admin can update"
      on public.time_entries
      for update
      to authenticated
      using ((user_id = auth.uid() and public.is_member(auth.uid(), family_id))
             or public.has_family_role(auth.uid(), family_id, 'family_admin'));
  end if;

  if not exists (select 1 from pg_policies where tablename='time_entries' and policyname='Time entries: owners or admin can delete') then
    create policy "Time entries: owners or admin can delete"
      on public.time_entries
      for delete
      to authenticated
      using ((user_id = auth.uid() and public.is_member(auth.uid(), family_id))
             or public.has_family_role(auth.uid(), family_id, 'family_admin'));
  end if;
end$$;

-- Tasks
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  care_recipient_id uuid references public.care_recipients(id) on delete set null,
  title text not null,
  description text,
  assigned_to uuid references auth.users(id) on delete set null,
  due_date date,
  completed_at timestamptz,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.tasks enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where tablename='tasks' and policyname='Tasks: members can select') then
    create policy "Tasks: members can select"
      on public.tasks
      for select
      to authenticated
      using (public.is_member(auth.uid(), family_id));
  end if;

  if not exists (select 1 from pg_policies where tablename='tasks' and policyname='Tasks: members can insert') then
    create policy "Tasks: members can insert"
      on public.tasks
      for insert
      to authenticated
      with check (public.is_member(auth.uid(), family_id) and created_by = auth.uid());
  end if;

  if not exists (select 1 from pg_policies where tablename='tasks' and policyname='Tasks: members can update') then
    create policy "Tasks: members can update"
      on public.tasks
      for update
      to authenticated
      using (public.is_member(auth.uid(), family_id));
  end if;

  if not exists (select 1 from pg_policies where tablename='tasks' and policyname='Tasks: members can delete') then
    create policy "Tasks: members can delete"
      on public.tasks
      for delete
      to authenticated
      using (public.is_member(auth.uid(), family_id));
  end if;
end$$;

-- Care notes
create table if not exists public.care_notes (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  care_recipient_id uuid references public.care_recipients(id) on delete set null,
  author_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);
alter table public.care_notes enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where tablename='care_notes' and policyname='Notes: members can select') then
    create policy "Notes: members can select"
      on public.care_notes
      for select
      to authenticated
      using (public.is_member(auth.uid(), family_id));
  end if;

  if not exists (select 1 from pg_policies where tablename='care_notes' and policyname='Notes: members can insert') then
    create policy "Notes: members can insert"
      on public.care_notes
      for insert
      to authenticated
      with check (public.is_member(auth.uid(), family_id) and author_id = auth.uid());
  end if;

  if not exists (select 1 from pg_policies where tablename='care_notes' and policyname='Notes: author or admin can update') then
    create policy "Notes: author or admin can update"
      on public.care_notes
      for update
      to authenticated
      using ((author_id = auth.uid() and public.is_member(auth.uid(), family_id))
             or public.has_family_role(auth.uid(), family_id, 'family_admin'));
  end if;

  if not exists (select 1 from pg_policies where tablename='care_notes' and policyname='Notes: author or admin can delete') then
    create policy "Notes: author or admin can delete"
      on public.care_notes
      for delete
      to authenticated
      using ((author_id = auth.uid() and public.is_member(auth.uid(), family_id))
             or public.has_family_role(auth.uid(), family_id, 'family_admin'));
  end if;
end$$;

-- Helpful indexes
create index if not exists idx_memberships_user on public.user_memberships(user_id);
create index if not exists idx_memberships_family on public.user_memberships(family_id);
create index if not exists idx_recipients_family on public.care_recipients(family_id);
create index if not exists idx_time_entries_family on public.time_entries(family_id);
create index if not exists idx_tasks_family on public.tasks(family_id);
create index if not exists idx_notes_family on public.care_notes(family_id);
