import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

try {
  process.loadEnvFile?.(".env.local");
} catch {
  // .env.local is optional when variables are provided by the shell.
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
  await readFile(resolve("src/data/unity-ta.json"), "utf8")
);

async function findUserByEmail(email) {
  if (!email) return null;
  let page = 1;
  const perPage = 1000;
  while (true) {
    const { data, error } = await client.auth.admin.listUsers({
      page,
      perPage
    });
    if (error) throw error;
    const match = data.users.find(
      (user) => user.email?.toLowerCase() === email.toLowerCase()
    );
    if (match) return match;
    if (data.users.length < perPage || data.nextPage === null) return null;
    page = data.nextPage ?? page + 1;
  }
}

function assertResult(result, label) {
  if (result.error) {
    throw new Error(`${label}: ${result.error.message}`);
  }
  return result.data;
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
  starts_on: seed.plan.startDate,
  ends_on: seed.plan.endDate,
  is_public: true,
  updated_at: new Date().toISOString()
};
if (owner) planPayload.owner_id = owner.id;

const plan = assertResult(
  await client
    .from("plans")
    .upsert(
      planPayload,
      { onConflict: "slug" }
    )
    .select()
    .single(),
  "写入计划"
);

const planId = plan.id;
assertResult(
  await client.from("plan_tracks").upsert(
    seed.tracks.map((track) => ({
      plan_id: planId,
      track_key: track.key,
      label: track.label,
      short_label: track.shortLabel,
      color: track.color,
      icon: track.icon,
      sort_order: track.sortOrder
    })),
    { onConflict: "plan_id,track_key" }
  ),
  "写入学习主线"
);

const insertedMonths = assertResult(
  await client
    .from("plan_months")
    .upsert(
      seed.months.map((month) => ({
        plan_id: planId,
        month_label: month.month,
        phase_goal: month.phaseGoal,
        sort_order: month.sortOrder
      })),
      { onConflict: "plan_id,month_label" }
    )
    .select(),
  "写入月份"
);
const monthByLabel = new Map(insertedMonths.map((month) => [month.month_label, month.id]));
assertResult(
  await client
    .from("plan_month_items")
    .delete()
    .in("plan_month_id", [...monthByLabel.values()]),
  "刷新月度任务"
);
assertResult(
  await client.from("plan_month_items").insert(
    seed.months.flatMap((month) =>
      month.items.map((item, index) => ({
        plan_month_id: monthByLabel.get(month.month),
        track_key: item.trackKey,
        content: item.content,
        sort_order: index + 1
      }))
    )
  ),
  "写入月度任务"
);

const insertedWeeks = assertResult(
  await client
    .from("plan_weeks")
    .upsert(
      seed.weeks.map((week) => ({
        plan_id: planId,
        week_no: week.weekNo,
        week_index: week.weekIndex,
        start_date: week.startDate,
        end_date: week.endDate,
        date_label: week.dateLabel,
        theme: week.theme
      })),
      { onConflict: "plan_id,week_no" }
    )
    .select(),
  "写入周任务"
);
const weekByNo = new Map(insertedWeeks.map((week) => [week.week_no, week.id]));
assertResult(
  await client
    .from("plan_week_tasks")
    .delete()
    .in("week_id", [...weekByNo.values()]),
  "刷新每周任务"
);
assertResult(
  await client.from("plan_week_tasks").insert(
    seed.weeks.flatMap((week) =>
      week.tasks.map((task) => ({
        week_id: weekByNo.get(week.weekNo),
        track_key: task.trackKey,
        title: task.title,
        content: task.content,
        sort_order: task.sortOrder
      }))
    )
  ),
  "写入每周任务"
);

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
      {
        plan_id: planId,
        user_id: owner.id,
        role: "owner"
      },
      { onConflict: "plan_id,user_id" }
    ),
    "绑定所有者"
  );
}

console.log(
  `Seeded plan ${seed.plan.slug}: ${seed.months.length} months, ${seed.weeks.length} weeks, ${seed.portfolio.length} portfolio items.`
);
if (!ownerEmail) {
  console.log(
    "No --owner-email was provided. Sign in once, then rerun with --owner-email=you@example.com to grant owner access."
  );
} else if (!owner) {
  console.log(
    `No Supabase user exists for ${ownerEmail}. Sign in with email OTP once, then rerun this command.`
  );
} else {
  console.log(`Owner access linked to ${ownerEmail}.`);
}
