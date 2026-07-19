-- Run this once in Supabase SQL Editor.
create table if not exists public.clinic_records (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  record_data jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.procedure_records (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  record_data jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.app_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  settings_data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.clinic_records enable row level security;
alter table public.procedure_records enable row level security;
alter table public.app_settings enable row level security;

drop policy if exists "Users manage their own clinic records" on public.clinic_records;
create policy "Users manage their own clinic records" on public.clinic_records for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "Users manage their own procedure records" on public.procedure_records;
create policy "Users manage their own procedure records" on public.procedure_records for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "Users manage their own settings" on public.app_settings;
create policy "Users manage their own settings" on public.app_settings for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- Optional for instant cross-device refresh. Run each line only once.
alter publication supabase_realtime add table public.clinic_records;
alter publication supabase_realtime add table public.procedure_records;
alter publication supabase_realtime add table public.app_settings;
