import seedData from "../data/unity-ta.json";
import type { PlanBundle } from "../types";

export function createSeedBundle(): PlanBundle {
  const data = structuredClone(seedData);
  return {
    plan: data.plan,
    tracks: data.tracks,
    months: data.months,
    weeks: data.weeks.map((week) => ({
      ...week,
      status: week.status as PlanBundle["weeks"][number]["status"],
      updatedAt: week.updatedAt
    })),
    dailyLogs: [],
    attachments: [],
    portfolio: data.portfolio.map((item) => ({
      ...item,
      status: item.status as PlanBundle["portfolio"][number]["status"]
    }))
  };
}

export const seedMeta = {
  importedAt: seedData.importedAt,
  sourceFile: seedData.sourceFile,
  schemaVersion: seedData.schemaVersion
};
