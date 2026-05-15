create extension if not exists "pgcrypto";

create type app_role as enum ('support_agent', 'manager', 'admin');
create type incident_status as enum ('new', 'triaged', 'assigned', 'in_progress', 'waiting_customer', 'resolved', 'closed');
create type incident_priority as enum ('low', 'medium', 'high', 'critical');
create type incident_source as enum ('manual', 'email', 'google_drive', 'teams', 'whatsapp', 'phone', 'warehouse_note');
create type processing_status as enum ('received', 'processed', 'failed');
create type rpa_status as enum ('running', 'completed', 'failed');
create type content_status as enum ('draft', 'reviewed', 'published');

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role app_role not null default 'support_agent',
  department text,
  created_at timestamptz not null default now()
);

create table raw_inputs (
  id uuid primary key default gen_random_uuid(),
  source incident_source not null,
  content text not null,
  external_id text,
  file_name text,
  file_url text,
  processing_status processing_status not null default 'received',
  extracted_json jsonb,
  uploaded_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

create table incidents (
  id uuid primary key default gen_random_uuid(),
  raw_input_id uuid references raw_inputs(id) on delete set null,
  title text not null,
  summary text not null,
  status incident_status not null default 'new',
  priority incident_priority not null default 'medium',
  source incident_source not null default 'manual',
  department text not null default 'Customer Support',
  issue_type text not null default 'Customer complaint',
  customer_name text,
  tracking_number text,
  assigned_to text,
  duplicate_of uuid references incidents(id),
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table incident_events (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid not null references incidents(id) on delete cascade,
  event_type text not null,
  message text not null,
  actor_id uuid references profiles(id),
  created_at timestamptz not null default now()
);

create table attachments (
  id uuid primary key default gen_random_uuid(),
  raw_input_id uuid references raw_inputs(id) on delete cascade,
  incident_id uuid references incidents(id) on delete cascade,
  bucket text not null default 'incident-attachments',
  path text not null,
  mime_type text,
  created_at timestamptz not null default now()
);

create table departments (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  default_owner text
);

create table rpa_runs (
  id text primary key,
  source text not null,
  status rpa_status not null,
  processed integer not null default 0,
  failed integer not null default 0,
  summary text not null default '',
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

create table rpa_run_logs (
  id uuid primary key default gen_random_uuid(),
  rpa_run_id text not null references rpa_runs(id) on delete cascade,
  level text not null default 'info',
  item_ref text,
  message text not null,
  created_at timestamptz not null default now()
);

create table content_items (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  status content_status not null default 'draft',
  tags text[] not null default '{}',
  current_version integer not null default 1,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table content_versions (
  id uuid primary key default gen_random_uuid(),
  content_id uuid not null references content_items(id) on delete cascade,
  version integer not null,
  status content_status not null,
  body text not null,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

create table content_attachments (
  id uuid primary key default gen_random_uuid(),
  content_id uuid not null references content_items(id) on delete cascade,
  bucket text not null default 'incident-attachments',
  path text not null,
  mime_type text,
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;
alter table raw_inputs enable row level security;
alter table incidents enable row level security;
alter table incident_events enable row level security;
alter table attachments enable row level security;
alter table departments enable row level security;
alter table rpa_runs enable row level security;
alter table rpa_run_logs enable row level security;
alter table content_items enable row level security;
alter table content_versions enable row level security;
alter table content_attachments enable row level security;

create policy "authenticated profiles read" on profiles for select to authenticated using (true);
create policy "users update own profile" on profiles for update to authenticated using (auth.uid() = id);
create policy "authenticated raw inputs" on raw_inputs for all to authenticated using (true) with check (true);
create policy "authenticated incidents" on incidents for all to authenticated using (true) with check (true);
create policy "authenticated incident events" on incident_events for all to authenticated using (true) with check (true);
create policy "authenticated attachments" on attachments for all to authenticated using (true) with check (true);
create policy "authenticated departments read" on departments for select to authenticated using (true);
create policy "managers view rpa runs" on rpa_runs for select to authenticated using (true);
create policy "managers view rpa logs" on rpa_run_logs for select to authenticated using (true);
create policy "authenticated content items" on content_items for all to authenticated using (true) with check (true);
create policy "authenticated content versions" on content_versions for all to authenticated using (true) with check (true);
create policy "authenticated content attachments" on content_attachments for all to authenticated using (true) with check (true);

insert into departments (name, default_owner) values
  ('Customer Support', 'Support queue'),
  ('Last Mile Delivery', 'Delivery queue'),
  ('Warehouse Operations', 'Warehouse queue'),
  ('Address Resolution', 'Address queue'),
  ('IT Systems', 'IT queue'),
  ('Claims', 'Claims queue'),
  ('Finance', 'Finance queue')
on conflict (name) do nothing;
