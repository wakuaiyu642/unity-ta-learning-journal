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
  weekly_targets: [],
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
    .select("id")
    .eq("plan_id", planId)
    .limit(1),
  "检查作品集"
);
if (!existingPortfolio.length) {
  assertResult(
    await client.from("portfolio_items").insert(
      seed.portfolio.map((item) => ({
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
        published: item.published,
        sort_order: item.sortOrder
      }))
    ),
    "写入作品集"
  );
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
