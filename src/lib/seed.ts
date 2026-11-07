import seedData from "../data/unity-ta-monthly.json";
import type { PlanBundle, PlanProfile, ProgressStatus } from "../types";

export function createSeedBundle(): PlanBundle {
  const data = structuredClone(seedData);
  return {
    plan: data.plan,
    profile: data.profile as PlanProfile,
    phases: data.phases,
    months: data.months.map((month) => ({
      ...month,
      status: month.status as ProgressStatus,
      completedAt: month.completedAt
    })),
    dailyLogs: [],
    weeklyReviews: [],
    attachments: [],
    portfolio: data.portfolio.map((item) => ({
      ...item,
      status: item.status as ProgressStatus,
      evidenceLevel: item.evidenceLevel as PlanBundle["portfolio"][number]["evidenceLevel"]
    }))
  };
}

export const seedMeta = {
  importedAt: seedData.importedAt,
  sourceDocument: seedData.sourceDocument,
  schemaVersion: seedData.schemaVersion
};
