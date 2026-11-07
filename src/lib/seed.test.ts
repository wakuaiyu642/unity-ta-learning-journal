import { describe, expect, it } from "vitest";
import { createSeedBundle } from "./seed";
import { findRelevantWeek, getPlanStats } from "./date";
import { getDuplicateWeekThemes } from "./utils";

describe("Unity TA seed data", () => {
  const bundle = createSeedBundle();

  it("imports the complete workbook structure", () => {
    expect(bundle.months).toHaveLength(20);
    expect(bundle.weeks).toHaveLength(86);
    expect(bundle.portfolio).toHaveLength(9);
    expect(bundle.weeks[0]).toMatchObject({
      weekNo: "W01",
      startDate: "2026-11-09",
      endDate: "2026-11-15"
    });
    expect(bundle.weeks.at(-1)).toMatchObject({
      weekNo: "W86",
      startDate: "2028-06-26",
      endDate: "2028-06-30"
    });
  });

  it("preserves the seven repeated week topics", () => {
    expect(getDuplicateWeekThemes(bundle.weeks)).toHaveLength(7);
  });

  it("finds the first week before the plan starts", () => {
    const relevant = findRelevantWeek(bundle.weeks, "2026-11-07");
    expect(relevant.state).toBe("upcoming");
    expect(relevant.week.weekNo).toBe("W01");
  });

  it("derives completion statistics from manual week status", () => {
    const completedWeek = bundle.weeks[0];
    completedWeek.status = "done";
    const stats = getPlanStats(bundle);
    expect(stats.completedWeeks).toBe(1);
    expect(stats.completionPercent).toBe(1);
  });
});
