import type {
  Attachment,
  DailyLog,
  DailyLogInput,
  Plan,
  PlanBundle,
  PlanMember,
  PlanMonth,
  PlanRole,
  PlanTrack,
  PlanWeek,
  PortfolioItem,
  PortfolioPatch,
  WeekPatch
} from "../types";
import { safeFileName } from "./utils";
import { supabase } from "./supabase";

type CloudRow = Record<string, unknown>;

function requireClient() {
  if (!supabase) throw new Error("Supabase 尚未配置。");
  return supabase;
}

function mapPlan(row: CloudRow): Plan {
  return {
    id: String(row.id),
    slug: String(row.slug),
    title: String(row.title),
    subtitle: String(row.subtitle ?? ""),
    periodLabel: String(row.period_label ?? ""),
    primaryFocus: String(row.primary_focus ?? ""),
    supportingFocus: String(row.supporting_focus ?? ""),
    stageGoal: String(row.stage_goal ?? ""),
    principle: String(row.principle ?? ""),
    principles: (row.principles as string[]) ?? [],
    weeklyTargets:
      (row.weekly_targets as Array<{ label: string; value: string }>) ?? [],
    startDate: String(row.starts_on),
    endDate: String(row.ends_on),
    isPublic: Boolean(row.is_public)
  };
}

function mapTrack(row: CloudRow): PlanTrack {
  return {
    id: String(row.id),
    key: String(row.track_key),
    label: String(row.label),
    shortLabel: String(row.short_label),
    color: String(row.color),
    icon: String(row.icon),
    sortOrder: Number(row.sort_order)
  };
}

function mapMonth(row: CloudRow): PlanMonth {
  return {
    id: String(row.id),
    month: String(row.month_label),
    phaseGoal: String(row.phase_goal),
    items: ((row.items as CloudRow[]) ?? []).map((item) => ({
      id: String(item.id),
      trackKey: String(item.track_key),
      content: String(item.content)
    })),
    sortOrder: Number(row.sort_order)
  };
}

function mapWeek(row: CloudRow): PlanWeek {
  return {
    id: String(row.id),
    weekNo: String(row.week_no),
    weekIndex: Number(row.week_index),
    startDate: String(row.start_date),
    endDate: String(row.end_date),
    dateLabel: String(row.date_label),
    theme: String(row.theme),
    tasks: ((row.tasks as CloudRow[]) ?? [])
      .map((task) => ({
        id: String(task.id),
        trackKey: String(task.track_key),
        title: String(task.title ?? ""),
        content: String(task.content),
        sortOrder: Number(task.sort_order)
      }))
      .sort((a, b) => a.sortOrder - b.sortOrder),
    status: (row.status as PlanWeek["status"]) ?? "not_started",
    reflection: String(row.reflection ?? ""),
    updatedAt: row.updated_at ? String(row.updated_at) : null
  };
}

function mapDailyLog(row: CloudRow): DailyLog {
  return {
    id: String(row.id),
    planId: String(row.plan_id),
    weekId: String(row.week_id),
    userId: String(row.user_id),
    logDate: String(row.log_date),
    minutes: Number(row.minutes ?? 0),
    note: String(row.note ?? ""),
    authorName: String(row.author_name ?? "学习者"),
    createdAt: String(row.created_at)
  };
}

function mapAttachment(row: CloudRow): Attachment {
  const client = requireClient();
  const storagePath = String(row.storage_path);
  const { data } = client.storage.from("learning-files").getPublicUrl(storagePath);
  return {
    id: String(row.id),
    planId: String(row.plan_id),
    weekId: String(row.week_id),
    storagePath,
    fileName: String(row.file_name),
    mimeType: String(row.mime_type),
    sizeBytes: Number(row.size_bytes),
    uploadedBy: String(row.uploaded_by),
    url: data.publicUrl,
    createdAt: String(row.created_at)
  };
}

function mapPortfolio(row: CloudRow): PortfolioItem {
  return {
    id: String(row.id),
    code: String(row.code ?? ""),
    title: String(row.title),
    summary: String(row.summary ?? ""),
    acceptance: String(row.acceptance_criteria ?? ""),
    status: (row.status as PortfolioItem["status"]) ?? "not_started",
    completedOn: row.completed_on ? String(row.completed_on) : null,
    notes: String(row.notes ?? ""),
    demoUrl: String(row.demo_url ?? ""),
    repoUrl: String(row.repo_url ?? ""),
    coverUrl: String(row.cover_url ?? ""),
    techStack: (row.tech_stack as string[]) ?? [],
    published: Boolean(row.published),
    sortOrder: Number(row.sort_order)
  };
}

export async function loadCloudBundle(slug: string): Promise<PlanBundle> {
  const client = requireClient();
  const { data: planRow, error: planError } = await client
    .from("plans")
    .select("*")
    .eq("slug", slug)
    .single();
  if (planError) throw planError;

  const plan = mapPlan(planRow);
  const [tracks, months, weeks, dailyLogs, attachments, portfolio] =
    await Promise.all([
      client
        .from("plan_tracks")
        .select("*")
        .eq("plan_id", plan.id)
        .order("sort_order"),
      client
        .from("plan_months")
        .select("*, items:plan_month_items(*)")
        .eq("plan_id", plan.id)
        .order("sort_order"),
      client
        .from("plan_weeks")
        .select("*, tasks:plan_week_tasks(*)")
        .eq("plan_id", plan.id)
        .order("week_index"),
      client
        .from("daily_logs")
        .select("*")
        .eq("plan_id", plan.id)
        .order("log_date", { ascending: false }),
      client
        .from("attachments")
        .select("*")
        .eq("plan_id", plan.id)
        .order("created_at", { ascending: false }),
      client
        .from("portfolio_items")
        .select("*")
        .eq("plan_id", plan.id)
        .order("sort_order")
    ]);

  const firstError = [tracks, months, weeks, dailyLogs, attachments, portfolio]
    .map((result) => result.error)
    .find(Boolean);
  if (firstError) throw firstError;

  return {
    plan,
    tracks: (tracks.data ?? []).map((row) => mapTrack(row as CloudRow)),
    months: (months.data ?? []).map((row) => mapMonth(row as CloudRow)),
    weeks: (weeks.data ?? []).map((row) => mapWeek(row as CloudRow)),
    dailyLogs: (dailyLogs.data ?? []).map((row) =>
      mapDailyLog(row as CloudRow)
    ),
    attachments: (attachments.data ?? []).map((row) =>
      mapAttachment(row as CloudRow)
    ),
    portfolio: (portfolio.data ?? []).map((row) =>
      mapPortfolio(row as CloudRow)
    )
  };
}

export async function fetchPlanRole(planId: string): Promise<PlanRole | null> {
  const client = requireClient();
  const { data, error } = await client
    .from("plan_members")
    .select("role")
    .eq("plan_id", planId)
    .maybeSingle();
  if (error) throw error;
  return (data?.role as PlanRole | undefined) ?? null;
}

export async function updateCloudWeek(
  weekId: string,
  patch: WeekPatch
) {
  const client = requireClient();
  const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.status !== undefined) payload.status = patch.status;
  if (patch.theme !== undefined) payload.theme = patch.theme;
  if (patch.reflection !== undefined) payload.reflection = patch.reflection;
  const { error } = await client.from("plan_weeks").update(payload).eq("id", weekId);
  if (error) throw error;
}

export async function updateCloudTask(taskId: string, content: string) {
  const client = requireClient();
  const { error } = await client
    .from("plan_week_tasks")
    .update({ content })
    .eq("id", taskId);
  if (error) throw error;
}

export async function upsertCloudDailyLog(
  planId: string,
  weekId: string,
  input: DailyLogInput,
  authorName: string
) {
  const client = requireClient();
  const {
    data: { user }
  } = await client.auth.getUser();
  if (!user) throw new Error("请先登录再记录每日进度。");

  const { data, error } = await client
    .from("daily_logs")
    .upsert(
      {
        plan_id: planId,
        week_id: weekId,
        user_id: user.id,
        log_date: input.logDate,
        minutes: input.minutes,
        note: input.note,
        author_name: authorName || user.email?.split("@")[0] || "学习者"
      },
      { onConflict: "plan_id,user_id,log_date" }
    )
    .select()
    .single();
  if (error) throw error;
  return mapDailyLog(data as CloudRow);
}

export async function uploadCloudAttachment(
  planId: string,
  weekId: string,
  file: File
) {
  const client = requireClient();
  const {
    data: { user }
  } = await client.auth.getUser();
  if (!user) throw new Error("请先登录再上传附件。");

  const id = crypto.randomUUID();
  const path = `${planId}/${weekId}/${id}-${safeFileName(file.name)}`;
  const { error: uploadError } = await client.storage
    .from("learning-files")
    .upload(path, file, {
      contentType: file.type,
      upsert: false,
      cacheControl: "3600"
    });
  if (uploadError) throw uploadError;

  const { data, error } = await client
    .from("attachments")
    .insert({
      id,
      plan_id: planId,
      week_id: weekId,
      storage_path: path,
      file_name: file.name,
      mime_type: file.type,
      size_bytes: file.size,
      uploaded_by: user.id
    })
    .select()
    .single();
  if (error) throw error;
  return mapAttachment(data as CloudRow);
}

export async function deleteCloudAttachment(attachment: Attachment) {
  const client = requireClient();
  const [storageResult, tableResult] = await Promise.all([
    client.storage.from("learning-files").remove([attachment.storagePath]),
    client.from("attachments").delete().eq("id", attachment.id)
  ]);
  if (storageResult.error) throw storageResult.error;
  if (tableResult.error) throw tableResult.error;
}

export async function updateCloudPortfolio(
  itemId: string,
  patch: PortfolioPatch
) {
  const client = requireClient();
  const payload: Record<string, unknown> = {};
  const map: Record<keyof PortfolioPatch, string> = {
    status: "status",
    title: "title",
    summary: "summary",
    acceptance: "acceptance_criteria",
    completedOn: "completed_on",
    notes: "notes",
    demoUrl: "demo_url",
    repoUrl: "repo_url",
    coverUrl: "cover_url",
    techStack: "tech_stack",
    published: "published"
  };
  for (const [key, value] of Object.entries(patch)) {
    payload[map[key as keyof PortfolioPatch]] = value;
  }
  const { error } = await client
    .from("portfolio_items")
    .update(payload)
    .eq("id", itemId);
  if (error) throw error;
}

export async function signInWithEmailPassword(
  email: string,
  password: string
) {
  const client = requireClient();
  const { error } = await client.auth.signInWithPassword({
    email,
    password
  });
  if (error) throw error;
}

export async function updateCloudPassword(password: string) {
  const client = requireClient();
  const { error } = await client.auth.updateUser({ password });
  if (error) throw error;
}

export async function signOutCloud() {
  const client = requireClient();
  const { error } = await client.auth.signOut();
  if (error) throw error;
}

async function invokeCollaborators<T>(body: Record<string, unknown>): Promise<T> {
  const client = requireClient();
  const { data, error } = await client.functions.invoke("manage-collaborators", {
    body
  });
  if (error) throw error;
  if (data?.error) throw new Error(String(data.error));
  return data as T;
}

export async function listCloudCollaborators(planId: string) {
  const data = await invokeCollaborators<{ members: PlanMember[] }>({
    action: "list",
    planId
  });
  return data.members;
}

export async function inviteCloudCollaborator(
  planId: string,
  email: string,
  role: PlanRole
) {
  const data = await invokeCollaborators<{ member: PlanMember }>({
    action: "invite",
    planId,
    email,
    role
  });
  return data.member;
}

export async function revokeCloudCollaborator(planId: string, userId: string) {
  await invokeCollaborators({
    action: "revoke",
    planId,
    userId
  });
}
