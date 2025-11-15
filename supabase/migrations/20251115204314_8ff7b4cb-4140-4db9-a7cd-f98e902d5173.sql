-- Create body_logs table for injury tracking
create table public.body_logs (
  id uuid primary key default gen_random_uuid(),
  family_id uuid references public.families(id) on delete cascade not null,
  care_recipient_id uuid references public.care_recipients(id) on delete set null,
  body_location text not null,
  body_region_code text not null,
  view_type text not null check (view_type in ('front', 'back')),
  description text not null,
  type_severity text not null,
  incident_datetime timestamp with time zone not null default now(),
  created_by uuid references auth.users(id) on delete set null not null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  is_archived boolean default false
);

-- Enable RLS
alter table public.body_logs enable row level security;

-- RLS Policies
create policy "Family members can view body logs"
  on public.body_logs for select
  using (is_family_member(auth.uid(), family_id));

create policy "Family members can create body logs"
  on public.body_logs for insert
  with check (
    is_family_member(auth.uid(), family_id) 
    and created_by = auth.uid()
  );

create policy "Family members can update body logs"
  on public.body_logs for update
  using (is_family_member(auth.uid(), family_id));

create policy "Family members can delete body logs"
  on public.body_logs for delete
  using (is_family_member(auth.uid(), family_id));

-- Trigger for updated_at
create trigger update_body_logs_updated_at
  before update on public.body_logs
  for each row
  execute function public.update_updated_at_column();

-- Create index for performance
create index idx_body_logs_family_id on public.body_logs(family_id);
create index idx_body_logs_incident_datetime on public.body_logs(incident_datetime desc);