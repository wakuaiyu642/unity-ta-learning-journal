import { describe, expect, it } from "vitest";
import { getAnyLogForDate, getDailyLogForDate, isDateInMonth } from "./date";
import { createSeedBundle } from "./seed";
import type { DailyLog } from "../types";

const bundle = createSeedBundle();
const firstMonth = bundle.months[0];

function makeLog(
  logDate: string,
  userId: string,
  monthId = firstMonth.id
): DailyLog {
  return {
    id: `${userId}-${logDate}`,
    planId: bundle.plan.id,
    monthId,
    userId,
    logDate,
    minutes: 60,
    note: "",
    authorName: userId,
    createdAt: `${logDate}T10:00:00.000Z`
  };
}

describe("getAnyLogForDate", () => {
  const logs = [
    makeLog("2026-11-12", "owner"),
    makeLog("2026-11-12", "editor"),
    makeLog("2026-11-13", "editor")
  ];

  it("returns the first log of any member on that date", () => {
    expect(getAnyLogForDate(logs, firstMonth.id, "2026-11-12")?.userId).toBe(
      "owner"
    );
  });

  it("filters by user when a user id is provided", () => {
    expect(
      getAnyLogForDate(logs, firstMonth.id, "2026-11-12", "editor")?.userId
    ).toBe("editor");
  });

  it("returns null when nobody logged that day or the month differs", () => {
    expect(getAnyLogForDate(logs, firstMonth.id, "2026-11-14")).toBeNull();
    expect(getAnyLogForDate(logs, "another-month", "2026-11-12")).toBeNull();
  });

  it("keeps getDailyLogForDate scoped to one user", () => {
    expect(
      getDailyLogForDate(logs, firstMonth.id, "2026-11-12", "owner")?.userId
    ).toBe("owner");
    expect(
      getDailyLogForDate(logs, firstMonth.id, "2026-11-13", "owner")
    ).toBeNull();
  });
});

describe("isDateInMonth", () => {
  it("includes the first and last day of the month range", () => {
    expect(isDateInMonth(firstMonth, "2026-11-09")).toBe(true);
    expect(isDateInMonth(firstMonth, "2026-11-20")).toBe(true);
    expect(isDateInMonth(firstMonth, "2026-11-30")).toBe(true);
  });

  it("excludes dates outside the month range", () => {
    expect(isDateInMonth(firstMonth, "2026-11-08")).toBe(false);
    expect(isDateInMonth(firstMonth, "2026-12-01")).toBe(false);
  });
});
