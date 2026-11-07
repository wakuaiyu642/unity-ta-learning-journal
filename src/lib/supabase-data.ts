import type {
  Attachment,
  DailyLog,
  DailyLogInput,
  MonthPatch,
  Plan,
  PlanBundle,
  PlanMember,
  PlanMonth,
  PlanPhase,
  PlanProfile,
  PlanReference,
  PlanRole,
  PortfolioItem,
  PortfolioPatch,
  ProfilePatch,
  ProgressStatus,
  WeeklyReview,
  WeeklyReviewInput
} from "../types";
import { createSeedBundle } from "./seed";
import { safeFileName } from "./utils";
import { supabase } from "./supabase";

type CloudRow = Record<string, unknown>;

function requireClient() {
  if (!supabase) throw new Error("Supabase 尚未配置。");
  return supabase;
}

function mapPlan(row: CloudRow, phases: PlanPhase[]): Plan {
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

function mapProfile(row: CloudRow, planId: string): PlanProfile {
  const links = (row.links as Partial<PlanProfile["links"]> | null) ?? {};
  return {
    planId: String(row.plan_id ?? planId),
    displayName: String(row.display_name ?? ""),
    headline: String(row.headline ?? ""),
    avatarUrl: String(row.avatar_url ?? ""),
    location: String(row.location ?? ""),
    school: String(row.school ?? ""),
    major: String(row.major ?? ""),
    degree: String(row.degree ?? ""),
    grade: String(row.grade ?? ""),
    graduationYear:
      row.graduation_year === null || row.graduation_year === undefined
        ? null
        : Number(row.graduation_year),
    targetRole: String(row.target_role ?? ""),
    targetCompanies: String(row.target_companies ?? ""),
    bio: String(row.bio ?? ""),
    selfPositioning: String(row.self_positioning ?? ""),
    honestyNote: String(row.honesty_note ?? ""),
    skills: (row.skills as PlanProfile["skills"] | null) ?? [],
    highlights: (row.highlights as string[] | null) ?? [],
    links: {
      githubUrl: String(links.githubUrl ?? ""),
      email: String(links.email ?? ""),
      resumeUrl: String(links.resumeUrl ?? ""),
      websiteUrl: String(links.websiteUrl ?? ""),
      showEmail: Boolean(links.showEmail)
    },
    updatedAt: String(row.updated_at ?? "")
  };
}

function fallbackProfile(planId: string): PlanProfile {
  return { ...createSeedBundle().profile, planId };
}

const sectionKeys: Record<string, keyof PlanMonth> = {
  learning: "learning",
  practice: "practice",
  weekly_focus: "weeklyFocus",
  acceptance: "acceptance",
  pitfalls: "pitfalls",
  resume_evidence: "resumeEvidence"
};

function mapMonth(row: CloudRow): PlanMonth {
  const result: PlanMonth = {
    id: String(row.id),
    month: String(row.month_label),
    monthKey: String(row.month_key),
    stageId: String(row.stage_key ?? ""),
    title: String(row.title ?? row.phase_goal ?? ""),
    startDate: String(row.starts_on),
    endDate: String(row.ends_on),
    status: (row.status as ProgressStatus) ?? "not_started",
    completedAt: row.completed_at ? String(row.completed_at) : null,
    sortOrder: Number(row.sort_order),
    deliverable: String(row.deliverable ?? ""),
    evidenceGate: String(row.evidence_gate ?? ""),
    estimatedHours: Number(row.estimated_hours ?? 0),
    learning: [],
    practice: [],
    weeklyFocus: [],
    acceptance: [],
    pitfalls: [],
    references: [],
    resumeEvidence: []
  };

  const sections = ((row.sections as CloudRow[]) ?? []).sort(
    (a, b) => Number(a.sort_order) - Number(b.sort_order)
  );
  for (const section of sections) {
    const type = String(section.section_type);
    if (type === "reference") {
      result.references.push({
        label: String(section.content),
        href: String(section.href ?? "")
      });
      continue;
    }
    const key = sectionKeys[type];
    if (key) {
      (result[key] as string[]).push(String(section.content));
    }
  }
  return result;
}

function mapDailyLog(row: CloudRow): DailyLog {
  return {
    id: String(row.id),
    planId: String(row.plan_id),
    monthId: String(row.month_id),
    userId: String(row.user_id),
    logDate: String(row.log_date),
    minutes: Number(row.minutes ?? 0),
    note: String(row.note ?? ""),
    authorName: String(row.author_name ?? "学习者"),
    createdAt: String(row.created_at)
  };
}

function mapWeeklyReview(row: CloudRow): WeeklyReview {
  return {
    id: String(row.id),
    planId: String(row.plan_id),
    userId: String(row.user_id),
    weekStart: String(row.week_start),
    weekEnd: String(row.week_end),
    completed: String(row.completed ?? ""),
    blockers: String(row.blockers ?? ""),
    nextFocus: String(row.next_focus ?? ""),
    authorName: String(row.author_name ?? "学习者"),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at)
  };
}

function mapAttachment(row: CloudRow): Attachment {
  const client = requireClient();
  const storagePath = String(row.storage_path);
  const { data } = client.storage.from("learning-files").getPublicUrl(storagePath);
  return {
    id: String(row.id),
    planId: String(row.plan_id),
    monthId: String(row.month_id),
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
    status: (row.status as ProgressStatus) ?? "not_started",
    completedOn: row.completed_on ? String(row.completed_on) : null,
    notes: String(row.notes ?? ""),
    demoUrl: String(row.demo_url ?? ""),
    repoUrl: String(row.repo_url ?? ""),
    coverUrl: String(row.cover_url ?? ""),
    techStack: (row.tech_stack as string[]) ?? [],
    evidenceLevel:
      (row.evidence_level as PortfolioItem["evidenceLevel"]) ?? "learning",
    aiAssisted: Boolean(row.ai_assisted),
    perfNotes: String(row.perf_notes ?? ""),
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

  const phases = (planRow.phases as PlanPhase[]) ?? [];
  const plan = mapPlan(planRow, phases);
  const [months, dailyLogs, weeklyReviews, attachments, portfolio, profileRow] =
    await Promise.all([
      client
        .from("plan_months")
        .select("*, sections:plan_month_sections(*)")
        .eq("plan_id", plan.id)
        .order("sort_order"),
      client
        .from("daily_logs")
        .select("*")
        .eq("plan_id", plan.id)
        .not("month_id", "is", null)
        .order("log_date", { ascending: false }),
      client
        .from("weekly_reviews")
        .select("*")
        .eq("plan_id", plan.id)
        .order("week_start", { ascending: false }),
      client
        .from("attachments")
        .select("*")
        .eq("plan_id", plan.id)
        .not("month_id", "is", null)
        .order("created_at", { ascending: false }),
      client
        .from("portfolio_items")
        .select("*")
        .eq("plan_id", plan.id)
        .order("sort_order"),
      client
        .from("plan_profiles")
        .select("*")
        .eq("plan_id", plan.id)
        .maybeSingle()
    ]);

  const firstError = [months, dailyLogs, weeklyReviews, attachments, portfolio]
    .map((result) => result.error)
    .find(Boolean);
  if (firstError) throw firstError;

  return {
    plan,
    // 个人资料表是增量迁移；未迁移/未 seed 时不阻断整站，回退到内置默认资料。
    profile:
      profileRow.error || !profileRow.data
        ? fallbackProfile(plan.id)
        : mapProfile(profileRow.data as CloudRow, plan.id),
    phases,
    months: (months.data ?? []).map((row) => mapMonth(row as CloudRow)),
    dailyLogs: (dailyLogs.data ?? []).map((row) =>
      mapDailyLog(row as CloudRow)
    ),
    weeklyReviews: (weeklyReviews.data ?? []).map((row) =>
      mapWeeklyReview(row as CloudRow)
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

export async function updateCloudMonth(
  monthId: string,
  patch: MonthPatch
) {
  const client = requireClient();
  const payload: Record<string, unknown> = {
    updated_at: new Date().toISOString()
  };
  if (patch.status !== undefined) payload.status = patch.status;
  if (patch.completedAt !== undefined) payload.completed_at = patch.completedAt;
  if (patch.title !== undefined) payload.title = patch.title;
  const { error } = await client
    .from("plan_months")
    .update(payload)
    .eq("id", monthId);
  if (error) throw error;

  const arrayMap: Array<[keyof MonthPatch, string]> = [
    ["learning", "learning"],
    ["practice", "practice"],
    ["weeklyFocus", "weekly_focus"],
    ["acceptance", "acceptance"],
    ["pitfalls", "pitfalls"],
    ["resumeEvidence", "resume_evidence"]
  ];
  for (const [key, sectionType] of arrayMap) {
    const values = patch[key] as string[] | undefined;
    if (!values) continue;
    const deleteResult = await client
      .from("plan_month_sections")
      .delete()
      .eq("plan_month_id", monthId)
      .eq("section_type", sectionType);
    if (deleteResult.error) throw deleteResult.error;
    if (values.length) {
      const insertResult = await client.from("plan_month_sections").insert(
        values.map((content, index) => ({
          plan_month_id: monthId,
          section_type: sectionType,
          content,
          href: "",
          sort_order: index + 1
        }))
      );
      if (insertResult.error) throw insertResult.error;
    }
  }
  if (patch.references) {
    const deleteResult = await client
      .from("plan_month_sections")
      .delete()
      .eq("plan_month_id", monthId)
      .eq("section_type", "reference");
    if (deleteResult.error) throw deleteResult.error;
    if (patch.references.length) {
      const insertResult = await client.from("plan_month_sections").insert(
        patch.references.map((reference: PlanReference, index) => ({
          plan_month_id: monthId,
          section_type: "reference",
          content: reference.label,
          href: reference.href,
          sort_order: index + 1
        }))
      );
      if (insertResult.error) throw insertResult.error;
    }
  }
}

export async function upsertCloudDailyLog(
  planId: string,
  monthId: string,
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
        month_id: monthId,
        week_id: null,
        user_id: user.id,
        log_date: input.logDate,
        minutes: input.minutes,
        note: input.note,
        author_name: authorName || user.email?.split("@")[0] || "学习者",
        updated_at: new Date().toISOString()
      },
      { onConflict: "plan_id,user_id,log_date" }
    )
    .select()
    .single();
  if (error) throw error;
  return mapDailyLog(data as CloudRow);
}

export async function upsertCloudWeeklyReview(
  planId: string,
  input: WeeklyReviewInput,
  authorName: string
) {
  const client = requireClient();
  const {
    data: { user }
  } = await client.auth.getUser();
  if (!user) throw new Error("请先登录再填写周复盘。");
  const { data, error } = await client
    .from("weekly_reviews")
    .upsert(
      {
        plan_id: planId,
        user_id: user.id,
        week_start: input.weekStart,
        week_end: input.weekEnd,
        completed: input.completed,
        blockers: input.blockers,
        next_focus: input.nextFocus,
        author_name: authorName || user.email?.split("@")[0] || "学习者",
        updated_at: new Date().toISOString()
      },
      { onConflict: "plan_id,user_id,week_start" }
    )
    .select()
    .single();
  if (error) throw error;
  return mapWeeklyReview(data as CloudRow);
}

export async function uploadCloudAttachment(
  planId: string,
  monthId: string,
  file: File
) {
  const client = requireClient();
  const {
    data: { user }
  } = await client.auth.getUser();
  if (!user) throw new Error("请先登录再上传附件。");
  const id = crypto.randomUUID();
  const path = `${planId}/${monthId}/${id}-${safeFileName(file.name)}`;
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
      month_id: monthId,
      week_id: null,
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
    evidenceLevel: "evidence_level",
    aiAssisted: "ai_assisted",
    perfNotes: "perf_notes",
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

const profileColumnMap: Record<string, string> = {
  displayName: "display_name",
  headline: "headline",
  avatarUrl: "avatar_url",
  location: "location",
  school: "school",
  major: "major",
  degree: "degree",
  grade: "grade",
  graduationYear: "graduation_year",
  targetRole: "target_role",
  targetCompanies: "target_companies",
  bio: "bio",
  selfPositioning: "self_positioning",
  honestyNote: "honesty_note",
  skills: "skills",
  highlights: "highlights",
  links: "links"
};

export async function updateCloudProfile(planId: string, patch: ProfilePatch) {
  const client = requireClient();
  const payload: Record<string, unknown> = {
    plan_id: planId,
    updated_at: new Date().toISOString()
  };
  for (const [key, value] of Object.entries(patch)) {
    const column = profileColumnMap[key];
    if (column) payload[column] = value;
  }
  const { error } = await client
    .from("plan_profiles")
    .upsert(payload, { onConflict: "plan_id" });
  if (error) throw error;
}

export type ProfileAssetKind = "avatar" | "resume" | "cover";

export async function uploadPlanAsset(
  planId: string,
  kind: ProfileAssetKind,
  file: File,
  itemId?: string
): Promise<string> {
  const client = requireClient();
  const id = crypto.randomUUID();
  const extension = (file.name.split(".").pop() || "bin").toLowerCase();
  const prefix =
    kind === "cover"
      ? `portfolio/${itemId ?? "item"}-cover`
      : `profile/${kind}`;
  const path = `${planId}/${prefix}-${id}.${extension}`;
  const { error } = await client.storage
    .from("learning-files")
    .upload(path, file, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
      cacheControl: "3600"
    });
  if (error) throw error;
  const { data } = client.storage.from("learning-files").getPublicUrl(path);
  return data.publicUrl;
}

export async function deleteCloudAsset(publicUrl: string) {
  const client = requireClient();
  const marker = "/storage/v1/object/public/learning-files/";
  const index = publicUrl.indexOf(marker);
  if (index === -1) return;
  const path = publicUrl.slice(index + marker.length);
  const { error } = await client.storage.from("learning-files").remove([path]);
  if (error) throw error;
}

export async function signInWithEmailPassword(
  email: string,
  password: string
) {
  const client = requireClient();
  const { error } = await client.auth.signInWithPassword({ email, password });
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
