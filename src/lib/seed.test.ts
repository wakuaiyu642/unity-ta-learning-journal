import { describe, expect, it } from "vitest";
import { createSeedBundle } from "./seed";
import {
  findRelevantMonth,
  getMonthWeekSlots,
  getPlanStats
} from "./date";

describe("monthly Unity TA seed data", () => {
  const bundle = createSeedBundle();

  it("imports the complete monthly plan", () => {
    expect(bundle.months).toHaveLength(20);
    expect(bundle.phases).toHaveLength(5);
    expect(bundle.portfolio).toHaveLength(9);
    expect(bundle.months[0]).toMatchObject({
      month: "2026.11",
      startDate: "2026-11-09",
      endDate: "2026-11-30"
    });
    expect(bundle.months.at(-1)).toMatchObject({
      month: "2028.06",
      startDate: "2028-06-01",
      endDate: "2028-06-30"
    });
  });

  it("meets the expanded content quality baseline", () => {
    for (const month of bundle.months) {
      expect(month.learning.length).toBeGreaterThanOrEqual(10);
      expect(month.practice.length).toBeGreaterThanOrEqual(5);
      expect(month.weeklyFocus.length).toBeGreaterThanOrEqual(4);
      expect(month.acceptance.length).toBeGreaterThanOrEqual(3);
      expect(month.pitfalls.length).toBeGreaterThanOrEqual(3);
      expect(month.references.length).toBeGreaterThanOrEqual(2);
      expect(month.resumeEvidence.length).toBeGreaterThanOrEqual(2);
    }
  });

  it("finds the first month before the plan starts", () => {
    const relevant = findRelevantMonth(bundle.months, "2026-11-01");
    expect(relevant.state).toBe("upcoming");
    expect(relevant.month.monthKey).toBe("2026-11");
  });

  it("assigns weekly review slots by the week containing Monday", () => {
    const first = bundle.months[0];
    const slots = getMonthWeekSlots(
      first,
      bundle.plan.startDate,
      bundle.plan.endDate
    );
    expect(slots.map((slot) => slot.weekStart)).toEqual([
      "2026-11-09",
      "2026-11-16",
      "2026-11-23",
      "2026-11-30"
    ]);
    expect(slots.at(-1)?.weekStart.slice(0, 7)).toBe("2026-11");
  });

  it("derives completion from manual monthly status only", () => {
    const completedMonth = bundle.months[0];
    completedMonth.status = "done";
    const stats = getPlanStats(bundle);
    expect(stats.completedMonths).toBe(1);
    expect(stats.completionPercent).toBe(5);
  });
});
