-- Daily check-in photos: every attachment may belong to one daily log.
-- The homepage check-in card uploads photos together with a daily log, so the
-- attachment points at the log row instead of only at the month.
-- Idempotent and additive: safe to run on a database that already has the
-- monthly-plan migrations applied.

alter table public.attachments
  add column if not exists daily_log_id uuid references public.daily_logs(id) on delete set null;

create index if not exists attachments_daily_log_idx
  on public.attachments(daily_log_id, created_at desc);

-- Rebuild the insert policy so a check-in photo can only reference a daily log
-- that belongs to the same plan. Month-level attachments keep passing with
-- daily_log_id = null.
drop policy if exists "Editors insert own attachments" on public.attachments;
create policy "Editors insert own attachments"
on public.attachments for insert
to authenticated
with check (
  can_edit_plan(plan_id) and uploaded_by = auth.uid() and (
    daily_log_id is null or exists (
      select 1 from public.daily_logs log
      where log.id = attachments.daily_log_id and log.plan_id = attachments.plan_id
    )
  )
);
