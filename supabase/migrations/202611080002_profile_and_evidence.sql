-- Personal profile (public homepage) and honest evidence levels for portfolio items.

create table if not exists public.plan_profiles (
  plan_id uuid primary key references public.plans(id) on delete cascade,
  display_name text not null default '',
  headline text not null default '',
  avatar_url text not null default '',
  location text not null default '',
  school text not null default '',
  major text not null default '',
  degree text not null default '',
  grade text not null default '',
  graduation_year integer,
  target_role text not null default '',
  target_companies text not null default '',
  bio text not null default '',
  self_positioning text not null default '',
  honesty_note text not null default '',
  skills jsonb not null default '[]'::jsonb,
  highlights jsonb not null default '[]'::jsonb,
  links jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.portfolio_items
  add column if not exists evidence_level text not null default 'learning',
  add column if not exists ai_assisted boolean not null default false,
  add column if not exists perf_notes text not null default '';

alter table public.plan_months
  add column if not exists deliverable text not null default '',
  add column if not exists evidence_gate text not null default '',
  add column if not exists estimated_hours integer not null default 0;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'portfolio_items_evidence_level_check'
  ) then
    alter table public.portfolio_items
      add constraint portfolio_items_evidence_level_check
      check (evidence_level in ('learning', 'guided', 'independent', 'reusable'));
  end if;
end $$;

alter table public.plan_profiles enable row level security;

drop policy if exists "Profiles follow plan visibility" on public.plan_profiles;
create policy "Profiles follow plan visibility"
on public.plan_profiles for select
to anon, authenticated
using (is_plan_public(plan_id) or can_edit_plan(plan_id));

drop policy if exists "Editors manage profiles" on public.plan_profiles;
create policy "Editors manage profiles"
on public.plan_profiles for all
to authenticated
using (can_edit_plan(plan_id))
with check (can_edit_plan(plan_id));

create index if not exists portfolio_items_evidence_idx
  on public.portfolio_items(plan_id, evidence_level);

do $$
declare
  table_name text;
begin
  foreach table_name in array array['plan_profiles', 'portfolio_items']
  loop
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = table_name
    ) then
      execute format(
        'alter publication supabase_realtime add table public.%I',
        table_name
      );
    end if;
  end loop;
end $$;
