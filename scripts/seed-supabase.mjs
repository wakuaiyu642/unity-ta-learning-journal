import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

try {
  process.loadEnvFile?.(".env.local");
} catch {
  // Environment variables may be supplied directly by the shell.
}

const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ownerEmail =
  process.argv
    .find((argument) => argument.startsWith("--owner-email="))
    ?.split("=")[1] ??
  process.env.OWNER_EMAIL ??
  null;

if (!url || !serviceRoleKey) {
  throw new Error(
    "请在 .env.local 中配置 SUPABASE_URL 和 SUPABASE_SERVICE_ROLE_KEY。"
  );
}

const client = createClient(url, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});
const seed = JSON.parse(
  await readFile(resolve("src/data/unity-ta-monthly.json"), "utf8")
);

function assertResult(result, label) {
  if (result.error) throw new Error(`${label}: ${result.error.message}`);
  return result.data;
}

async function findUserByEmail(email) {
  if (!email) return null;
  let page = 1;
  while (true) {
    const { data, error } = await client.auth.admin.listUsers({
      page,
      perPage: 1000
    });
    if (error) throw error;
    const match = data.users.find(
      (user) => user.email?.toLowerCase() === email.toLowerCase()
    );
    if (match) return match;
    if (data.users.length < 1000 || data.nextPage === null) return null;
    page = data.nextPage ?? page + 1;
  }
}

const owner = await findUserByEmail(ownerEmail);
const planPayload = {
  slug: seed.plan.slug,
  title: seed.plan.title,
  subtitle: seed.plan.subtitle,
  period_label: seed.plan.periodLabel,
  primary_focus: seed.plan.primaryFocus,
  supporting_focus: seed.plan.supportingFocus,
  stage_goal: seed.plan.stageGoal,
  principle: seed.plan.principle,
  principles: seed.plan.principles,
  weekly_targets: seed.plan.weeklyTargets,
  phases: seed.phases,
  starts_on: seed.plan.startDate,
  ends_on: seed.plan.endDate,
  is_public: true,
  updated_at: new Date().toISOString()
};
if (owner) planPayload.owner_id = owner.id;

const plan = assertResult(
  await client
    .from("plans")
    .upsert(planPayload, { onConflict: "slug" })
    .select()
    .single(),
  "写入计划"
);
const planId = plan.id;

const months = assertResult(
  await client
    .from("plan_months")
    .upsert(
      seed.months.map((month) => ({
        plan_id: planId,
        month_label: month.month,
        month_key: month.monthKey,
        stage_key: month.stageId,
        title: month.title,
        phase_goal: month.title,
        starts_on: month.startDate,
        ends_on: month.endDate,
        sort_order: month.sortOrder,
        deliverable: month.deliverable,
        evidence_gate: month.evidenceGate,
        estimated_hours: month.estimatedHours,
        updated_at: new Date().toISOString()
      })),
      { onConflict: "plan_id,month_label" }
    )
    .select(),
  "写入月度计划"
);

const monthByKey = new Map(months.map((month) => [month.month_key, month.id]));
assertResult(
  await client
    .from("plan_month_sections")
    .delete()
    .in("plan_month_id", [...monthByKey.values()]),
  "刷新月度正文"
);

const sectionRows = [];
const sectionMap = [
  ["learning", "learning"],
  ["practice", "practice"],
  ["weeklyFocus", "weekly_focus"],
  ["acceptance", "acceptance"],
  ["pitfalls", "pitfalls"],
  ["resumeEvidence", "resume_evidence"]
];
for (const month of seed.months) {
  const planMonthId = monthByKey.get(month.monthKey);
  for (const [key, sectionType] of sectionMap) {
    month[key].forEach((content, index) => {
      sectionRows.push({
        plan_month_id: planMonthId,
        section_type: sectionType,
        content,
        href: "",
        sort_order: index + 1
      });
    });
  }
  month.references.forEach((reference, index) => {
    sectionRows.push({
      plan_month_id: planMonthId,
      section_type: "reference",
      content: reference.label,
      href: reference.href,
      sort_order: index + 1
    });
  });
}
assertResult(
  await client.from("plan_month_sections").insert(sectionRows),
  "写入月度正文"
);

for (const month of months) {
  assertResult(
    await client
      .from("daily_logs")
      .update({ month_id: month.id })
      .eq("plan_id", planId)
      .gte("log_date", month.starts_on)
      .lte("log_date", month.ends_on),
    `回填 ${month.month_label} 每日记录`
  );
}

const existingPortfolio = assertResult(
  await client
    .from("portfolio_items")
    .select("id, code, evidence_level, ai_assisted, perf_notes")
    .eq("plan_id", planId),
  "检查作品集"
);
const existingPortfolioCodes = new Set(
  existingPortfolio.map((item) => item.code).filter(Boolean)
);
const portfolioRow = (item) => ({
  plan_id: planId,
  code: item.code,
  title: item.title,
  summary: item.summary,
  acceptance_criteria: item.acceptance,
  status: item.status,
  completed_on: item.completedOn,
  notes: item.notes,
  demo_url: item.demoUrl,
  repo_url: item.repoUrl,
  cover_url: item.coverUrl,
  tech_stack: item.techStack,
  evidence_level: item.evidenceLevel ?? "learning",
  ai_assisted: Boolean(item.aiAssisted),
  perf_notes: item.perfNotes ?? "",
  published: item.published,
  sort_order: item.sortOrder
});
const portfolioRows =
  existingPortfolio.length === 0
    ? seed.portfolio.map(portfolioRow)
    : seed.portfolio
        .filter(
          (item) => item.code && !existingPortfolioCodes.has(item.code)
        )
        .map(portfolioRow);
if (portfolioRows.length) {
  assertResult(
    await client.from("portfolio_items").insert(portfolioRows),
    "写入作品集"
  );
}

// 只回填「仍是默认值」的旧作品行（learning / false / 空性能记录），
// 保留用户在线编辑过的完成度、AI 标注和性能记录。
const seedByCode = new Map(
  seed.portfolio.filter((item) => item.code).map((item) => [item.code, item])
);
let relabeled = 0;
for (const existing of existingPortfolio) {
  const item = seedByCode.get(existing.code);
  if (!item) continue;
  const isDefault =
    existing.evidence_level === "learning" &&
    existing.ai_assisted === false &&
    !existing.perf_notes;
  const nextLevel = item.evidenceLevel ?? "learning";
  const nextAi = Boolean(item.aiAssisted);
  const nextPerf = item.perfNotes ?? "";
  const needsUpdate =
    existing.evidence_level !== nextLevel ||
    existing.ai_assisted !== nextAi ||
    (existing.perf_notes ?? "") !== nextPerf;
  if (isDefault && needsUpdate) {
    assertResult(
      await client
        .from("portfolio_items")
        .update({
          evidence_level: nextLevel,
          ai_assisted: nextAi,
          perf_notes: nextPerf
        })
        .eq("id", existing.id),
      `回填作品标注 ${existing.code}`
    );
    relabeled += 1;
  }
}
if (relabeled) console.log(`Backfilled honest labels for ${relabeled} portfolio rows.`);

const existingProfile = assertResult(
  await client
    .from("plan_profiles")
    .select("plan_id")
    .eq("plan_id", planId)
    .maybeSingle(),
  "检查个人资料"
);
if (!existingProfile) {
  const profile = seed.profile;
  assertResult(
    await client.from("plan_profiles").insert({
      plan_id: planId,
      display_name: profile.displayName,
      headline: profile.headline,
      avatar_url: profile.avatarUrl,
      location: profile.location,
      school: profile.school,
      major: profile.major,
      degree: profile.degree,
      grade: profile.grade,
      graduation_year: profile.graduationYear,
      target_role: profile.targetRole,
      target_companies: profile.targetCompanies,
      bio: profile.bio,
      self_positioning: profile.selfPositioning,
      honesty_note: profile.honestyNote,
      skills: profile.skills,
      highlights: profile.highlights,
      links: profile.links,
      updated_at: new Date().toISOString()
    }),
    "写入个人资料"
  );
  console.log("Inserted initial personal profile (edit it online afterwards).");
}

if (owner) {
  assertResult(
    await client.from("plan_members").upsert(
      { plan_id: planId, user_id: owner.id, role: "owner" },
      { onConflict: "plan_id,user_id" }
    ),
    "绑定所有者"
  );
}

console.log(
  `Seeded ${seed.months.length} months and ${sectionRows.length} monthly content items.`
);
if (ownerEmail && !owner) {
  console.log(
    `No account exists for ${ownerEmail}. Create the account before binding owner access.`
  );
} else if (owner) {
  console.log(`Owner access linked to ${ownerEmail}.`);
}
