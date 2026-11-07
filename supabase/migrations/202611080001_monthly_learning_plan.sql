-- Monthly planning model. Weekly tables are intentionally retained for rollback.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'progress_status') then
    create type public.progress_status as enum (
      'not_started',
      'in_progress',
      'done',
      'deferred'
    );
  end if;
end $$;

alter table public.plans
  add column if not exists phases jsonb not null default '[]'::jsonb;

alter table public.plan_months
  add column if not exists month_key text,
  add column if not exists stage_key text not null default '',
  add column if not exists title text not null default '',
  add column if not exists starts_on date,
  add column if not exists ends_on date,
  add column if not exists status public.progress_status not null default 'not_started',
  add column if not exists completed_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

create unique index if not exists plan_months_month_key_idx
  on public.plan_months(plan_id, month_key)
  where month_key is not null;

create table if not exists public.plan_month_sections (
  id uuid primary key default gen_random_uuid(),
  plan_month_id uuid not null references public.plan_months(id) on delete cascade,
  section_type text not null check (
    section_type in (
      'learning',
      'practice',
      'weekly_focus',
      'acceptance',
      'pitfalls',
      'reference',
      'resume_evidence'
    )
  ),
  content text not null,
  href text not null default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.weekly_reviews (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  week_start date not null,
  week_end date not null,
  completed text not null default '',
  blockers text not null default '',
  next_focus text not null default '',
  author_name text not null default '学习者',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (week_end >= week_start),
  unique (plan_id, user_id, week_start)
);

alter table public.daily_logs
  add column if not exists month_id uuid references public.plan_months(id) on delete cascade;
alter table public.daily_logs
  alter column week_id drop not null;

alter table public.attachments
  add column if not exists month_id uuid references public.plan_months(id) on delete cascade;
alter table public.attachments
  alter column week_id drop not null;

update public.daily_logs log
set month_id = month.id
from public.plan_weeks week
join public.plan_months month
  on month.plan_id = week.plan_id
 and month.month_label = to_char(week.start_date, 'YYYY.MM')
where log.week_id = week.id
  and log.month_id is null;

update public.attachments file
set month_id = month.id
from public.plan_weeks week
join public.plan_months month
  on month.plan_id = week.plan_id
 and month.month_label = to_char(week.start_date, 'YYYY.MM')
where file.week_id = week.id
  and file.month_id is null;

create index if not exists plan_month_sections_month_idx
  on public.plan_month_sections(plan_month_id, section_type, sort_order);
create index if not exists daily_logs_month_idx
  on public.daily_logs(month_id, log_date);
create index if not exists attachments_month_idx
  on public.attachments(month_id, created_at desc);
create index if not exists weekly_reviews_plan_week_idx
  on public.weekly_reviews(plan_id, week_start desc);

alter table public.plan_month_sections enable row level security;
alter table public.weekly_reviews enable row level security;

drop policy if exists "Month sections follow plan visibility" on public.plan_month_sections;
create policy "Month sections follow plan visibility"
on public.plan_month_sections for select
to anon, authenticated
using (
  exists (
    select 1 from public.plan_months month
    where month.id = plan_month_id
      and (is_plan_public(month.plan_id) or can_edit_plan(month.plan_id))
  )
);

drop policy if exists "Editors manage month sections" on public.plan_month_sections;
create policy "Editors manage month sections"
on public.plan_month_sections for all
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

drop policy if exists "Weekly reviews follow plan visibility" on public.weekly_reviews;
create policy "Weekly reviews follow plan visibility"
on public.weekly_reviews for select
to anon, authenticated
using (is_plan_public(plan_id) or can_edit_plan(plan_id));

drop policy if exists "Editors insert own weekly reviews" on public.weekly_reviews;
create policy "Editors insert own weekly reviews"
on public.weekly_reviews for insert
to authenticated
with check (can_edit_plan(plan_id) and user_id = auth.uid());

drop policy if exists "Editors update own weekly reviews" on public.weekly_reviews;
create policy "Editors update own weekly reviews"
on public.weekly_reviews for update
to authenticated
using (can_edit_plan(plan_id) and user_id = auth.uid())
with check (can_edit_plan(plan_id) and user_id = auth.uid());

drop policy if exists "Editors delete own weekly reviews" on public.weekly_reviews;
create policy "Editors delete own weekly reviews"
on public.weekly_reviews for delete
to authenticated
using (can_edit_plan(plan_id) and user_id = auth.uid());

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'plan_months',
    'plan_month_sections',
    'daily_logs',
    'weekly_reviews',
    'attachments'
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
