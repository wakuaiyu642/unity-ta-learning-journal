-- Unity TA learning journal schema.
-- Public plans are readable by anonymous visitors. Writes are restricted to
-- the owner and invited editors at the database layer.

create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'week_status') then
    create type public.week_status as enum (
      'not_started',
      'in_progress',
      'done',
      'deferred'
    );
  end if;
  if not exists (select 1 from pg_type where typname = 'plan_role') then
    create type public.plan_role as enum ('owner', 'editor', 'viewer');
  end if;
end $$;

create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  subtitle text not null default '',
  period_label text not null default '',
  primary_focus text not null default '',
  supporting_focus text not null default '',
  stage_goal text not null default '',
  principle text not null default '',
  principles jsonb not null default '[]'::jsonb,
  weekly_targets jsonb not null default '[]'::jsonb,
  starts_on date not null,
  ends_on date not null,
  is_public boolean not null default true,
  owner_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.plan_members (
  plan_id uuid not null references public.plans(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.plan_role not null default 'viewer',
  created_at timestamptz not null default now(),
  primary key (plan_id, user_id)
);

create table if not exists public.plan_tracks (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans(id) on delete cascade,
  track_key text not null,
  label text not null,
  short_label text not null,
  color text not null,
  icon text not null default '',
  sort_order integer not null default 0,
  unique (plan_id, track_key)
);

create table if not exists public.plan_months (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans(id) on delete cascade,
  month_label text not null,
  phase_goal text not null default '',
  sort_order integer not null default 0,
  unique (plan_id, month_label)
);

create table if not exists public.plan_month_items (
  id uuid primary key default gen_random_uuid(),
  plan_month_id uuid not null references public.plan_months(id) on delete cascade,
  track_key text not null,
  content text not null,
  sort_order integer not null default 0
);

create table if not exists public.plan_weeks (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans(id) on delete cascade,
  week_no text not null,
  week_index integer not null,
  start_date date not null,
  end_date date not null,
  date_label text not null,
  theme text not null default '',
  status public.week_status not null default 'not_started',
  reflection text not null default '',
  updated_at timestamptz not null default now(),
  unique (plan_id, week_no)
);

create table if not exists public.plan_week_tasks (
  id uuid primary key default gen_random_uuid(),
  week_id uuid not null references public.plan_weeks(id) on delete cascade,
  track_key text not null,
  title text not null default '',
  content text not null default '',
  sort_order integer not null default 0
);

create table if not exists public.daily_logs (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans(id) on delete cascade,
  week_id uuid not null references public.plan_weeks(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  log_date date not null,
  minutes integer not null default 0 check (minutes between 0 and 1440),
  note text not null default '',
  author_name text not null default '学习者',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (plan_id, user_id, log_date)
);

create table if not exists public.attachments (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans(id) on delete cascade,
  week_id uuid not null references public.plan_weeks(id) on delete cascade,
  storage_path text not null unique,
  file_name text not null,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes between 0 and 10485760),
  uploaded_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.portfolio_items (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans(id) on delete cascade,
  code text not null default '',
  title text not null,
  summary text not null default '',
  acceptance_criteria text not null default '',
  status public.week_status not null default 'not_started',
  completed_on date,
  notes text not null default '',
  demo_url text not null default '',
  repo_url text not null default '',
  cover_url text not null default '',
  tech_stack text[] not null default '{}',
  published boolean not null default false,
  sort_order integer not null default 0
);

create index if not exists plan_tracks_plan_idx on public.plan_tracks(plan_id, sort_order);
create index if not exists plan_months_plan_idx on public.plan_months(plan_id, sort_order);
create index if not exists plan_month_items_month_idx on public.plan_month_items(plan_month_id, sort_order);
create index if not exists plan_weeks_plan_idx on public.plan_weeks(plan_id, week_index);
create index if not exists plan_week_tasks_week_idx on public.plan_week_tasks(week_id, sort_order);
create index if not exists daily_logs_plan_date_idx on public.daily_logs(plan_id, log_date desc);
create index if not exists attachments_week_idx on public.attachments(week_id, created_at desc);
create index if not exists portfolio_plan_idx on public.portfolio_items(plan_id, sort_order);
create index if not exists plan_members_user_idx on public.plan_members(user_id);

create or replace function public.is_plan_public(p_plan_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.plans
    where id = p_plan_id and is_public = true
  );
$$;

create or replace function public.can_edit_plan(p_plan_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.plan_members
    where plan_id = p_plan_id
      and user_id = auth.uid()
      and role in ('owner', 'editor')
  );
$$;

revoke all on function public.is_plan_public(uuid) from public;
grant execute on function public.is_plan_public(uuid) to anon, authenticated;
revoke all on function public.can_edit_plan(uuid) from public;
grant execute on function public.can_edit_plan(uuid) to anon, authenticated;

alter table public.plans enable row level security;
alter table public.plan_members enable row level security;
alter table public.plan_tracks enable row level security;
alter table public.plan_months enable row level security;
alter table public.plan_month_items enable row level security;
alter table public.plan_weeks enable row level security;
alter table public.plan_week_tasks enable row level security;
alter table public.daily_logs enable row level security;
alter table public.attachments enable row level security;
alter table public.portfolio_items enable row level security;

drop policy if exists "Public plans are readable" on public.plans;
create policy "Public plans are readable"
on public.plans for select
to anon, authenticated
using (is_public or can_edit_plan(id));

drop policy if exists "Editors can update plans" on public.plans;
create policy "Editors can update plans"
on public.plans for update
to authenticated
using (can_edit_plan(id))
with check (can_edit_plan(id));

drop policy if exists "Members can read own role" on public.plan_members;
create policy "Members can read own role"
on public.plan_members for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "Tracks follow plan visibility" on public.plan_tracks;
create policy "Tracks follow plan visibility"
on public.plan_tracks for select
to anon, authenticated
using (is_plan_public(plan_id) or can_edit_plan(plan_id));

drop policy if exists "Editors manage tracks" on public.plan_tracks;
create policy "Editors manage tracks"
on public.plan_tracks for all
to authenticated
using (can_edit_plan(plan_id))
with check (can_edit_plan(plan_id));

drop policy if exists "Months follow plan visibility" on public.plan_months;
create policy "Months follow plan visibility"
on public.plan_months for select
to anon, authenticated
using (is_plan_public(plan_id) or can_edit_plan(plan_id));

drop policy if exists "Editors manage months" on public.plan_months;
create policy "Editors manage months"
on public.plan_months for all
to authenticated
using (can_edit_plan(plan_id))
with check (can_edit_plan(plan_id));

drop policy if exists "Month items follow month visibility" on public.plan_month_items;
create policy "Month items follow month visibility"
on public.plan_month_items for select
to anon, authenticated
using (
  exists (
    select 1 from public.plan_months month
    where month.id = plan_month_id
      and (is_plan_public(month.plan_id) or can_edit_plan(month.plan_id))
  )
);

drop policy if exists "Editors manage month items" on public.plan_month_items;
create policy "Editors manage month items"
on public.plan_month_items for all
to authenticated
using (
  exists (
    select 1 from public.plan_months month
    where month.id = plan_month_id and can_edit_plan(month.plan_id)
  )
)
with check (
  exists (
    select 1 from public.plan_months month
    where month.id = plan_month_id and can_edit_plan(month.plan_id)
  )
);

drop policy if exists "Weeks follow plan visibility" on public.plan_weeks;
create policy "Weeks follow plan visibility"
on public.plan_weeks for select
to anon, authenticated
using (is_plan_public(plan_id) or can_edit_plan(plan_id));

drop policy if exists "Editors update weeks" on public.plan_weeks;
create policy "Editors update weeks"
on public.plan_weeks for update
to authenticated
using (can_edit_plan(plan_id))
with check (can_edit_plan(plan_id));

drop policy if exists "Week tasks follow week visibility" on public.plan_week_tasks;
create policy "Week tasks follow week visibility"
on public.plan_week_tasks for select
to anon, authenticated
using (
  exists (
    select 1 from public.plan_weeks week
    where week.id = week_id
      and (is_plan_public(week.plan_id) or can_edit_plan(week.plan_id))
  )
);

drop policy if exists "Editors manage week tasks" on public.plan_week_tasks;
create policy "Editors manage week tasks"
on public.plan_week_tasks for all
to authenticated
using (
  exists (
    select 1 from public.plan_weeks week
    where week.id = week_id and can_edit_plan(week.plan_id)
  )
)
with check (
  exists (
    select 1 from public.plan_weeks week
    where week.id = week_id and can_edit_plan(week.plan_id)
  )
);

drop policy if exists "Daily logs follow plan visibility" on public.daily_logs;
create policy "Daily logs follow plan visibility"
on public.daily_logs for select
to anon, authenticated
using (is_plan_public(plan_id) or can_edit_plan(plan_id));

drop policy if exists "Editors insert own daily logs" on public.daily_logs;
create policy "Editors insert own daily logs"
on public.daily_logs for insert
to authenticated
with check (can_edit_plan(plan_id) and user_id = auth.uid());

drop policy if exists "Editors update own daily logs" on public.daily_logs;
create policy "Editors update own daily logs"
on public.daily_logs for update
to authenticated
using (can_edit_plan(plan_id) and user_id = auth.uid())
with check (can_edit_plan(plan_id) and user_id = auth.uid());

drop policy if exists "Editors delete own daily logs" on public.daily_logs;
create policy "Editors delete own daily logs"
on public.daily_logs for delete
to authenticated
using (can_edit_plan(plan_id) and user_id = auth.uid());

drop policy if exists "Attachments follow plan visibility" on public.attachments;
create policy "Attachments follow plan visibility"
on public.attachments for select
to anon, authenticated
using (is_plan_public(plan_id) or can_edit_plan(plan_id));

drop policy if exists "Editors insert own attachments" on public.attachments;
create policy "Editors insert own attachments"
on public.attachments for insert
to authenticated
with check (can_edit_plan(plan_id) and uploaded_by = auth.uid());

drop policy if exists "Editors delete attachments" on public.attachments;
create policy "Editors delete attachments"
on public.attachments for delete
to authenticated
using (can_edit_plan(plan_id));

drop policy if exists "Portfolio follows plan visibility" on public.portfolio_items;
create policy "Portfolio follows plan visibility"
on public.portfolio_items for select
to anon, authenticated
using (is_plan_public(plan_id) or can_edit_plan(plan_id));

drop policy if exists "Editors update portfolio" on public.portfolio_items;
create policy "Editors update portfolio"
on public.portfolio_items for update
to authenticated
using (can_edit_plan(plan_id))
with check (can_edit_plan(plan_id));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'learning-files',
  'learning-files',
  true,
  10485760,
  array[
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/heic',
    'application/pdf',
    'text/markdown',
    'text/plain'
  ]
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public learning files are readable" on storage.objects;
create policy "Public learning files are readable"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'learning-files');

drop policy if exists "Editors upload learning files" on storage.objects;
create policy "Editors upload learning files"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'learning-files'
  and can_edit_plan(((storage.foldername(name))[1])::uuid)
);

drop policy if exists "Editors update learning files" on storage.objects;
create policy "Editors update learning files"
on storage.objects for update
to authenticated
using (
  bucket_id = 'learning-files'
  and can_edit_plan(((storage.foldername(name))[1])::uuid)
);

drop policy if exists "Editors delete learning files" on storage.objects;
create policy "Editors delete learning files"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'learning-files'
  and can_edit_plan(((storage.foldername(name))[1])::uuid)
);

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'plans',
    'plan_weeks',
    'daily_logs',
    'attachments',
    'portfolio_items'
  ]
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
