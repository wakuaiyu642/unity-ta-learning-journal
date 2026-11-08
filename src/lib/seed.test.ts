import { describe, expect, it } from "vitest";
import { createSeedBundle, seedMeta } from "./seed";
import { mergeSeedFallback } from "./bundle-fallback";
import {
  findRelevantMonth,
  getMonthWeekSlots,
  getPlanStats
} from "./date";

const evidenceLevels = ["learning", "guided", "independent", "reusable"];
const skillLevels = ["aware", "guided", "independent", "explainable"];

describe("growth pipeline seed data", () => {
  const bundle = createSeedBundle();

  it("imports the complete monthly plan: 20 months, 5 phases, 10 portfolio items", () => {
    expect(seedMeta.schemaVersion).toBe(3);
    expect(bundle.plan.slug).toBe("unity-ta");
    expect(bundle.plan.weeklyTargets).toHaveLength(4);
    expect(bundle.phases).toHaveLength(5);
    expect(bundle.months).toHaveLength(20);
    expect(bundle.portfolio).toHaveLength(10);

    expect(bundle.months[0]).toMatchObject({
      month: "2026.11",
      monthKey: "2026-11",
      startDate: "2026-11-09",
      endDate: "2026-11-30",
      stageId: "phase-foundation"
    });
    expect(bundle.months.at(-1)).toMatchObject({
      month: "2028.06",
      monthKey: "2028-06",
      startDate: "2028-06-01",
      endDate: "2028-06-30",
      stageId: "phase-graduate"
    });

    expect(new Set(bundle.months.map((month) => month.monthKey)).size).toBe(20);
    expect(bundle.months.map((month) => month.sortOrder)).toEqual(
      Array.from({ length: 20 }, (_, index) => index + 1)
    );
  });

  it("ships a complete public profile with honest self-assessment", () => {
    const profile = bundle.profile;
    expect(profile.planId).toBe(bundle.plan.id);
    expect(profile.displayName.trim()).not.toBe("");
    expect(profile.headline).toContain("数字媒体艺术");
    expect(profile.bio.length).toBeGreaterThan(20);
    expect(profile.selfPositioning.length).toBeGreaterThan(20);
    expect(profile.graduationYear).toBe(2028);
    expect(profile.honestyNote).toContain("AI");
    expect(profile.skills.length).toBeGreaterThanOrEqual(5);
    expect(profile.highlights.length).toBeGreaterThanOrEqual(3);
    expect(profile.links.githubUrl).toMatch(/^https:\/\//);

    for (const skill of profile.skills) {
      expect(skill.name.trim()).not.toBe("");
      expect(skill.note.trim()).not.toBe("");
      expect(skillLevels).toContain(skill.level);
    }
  });

  it("keeps the monthly content baseline and completes the stage mapping", () => {
    const phaseIds = new Set(bundle.phases.map((phase) => phase.id));
    const monthsPerPhase = new Map<string, number>();

    for (const month of bundle.months) {
      expect(month.deliverable.trim()).not.toBe("");
      expect(month.evidenceGate.trim()).not.toBe("");
      expect(month.estimatedHours).toBeGreaterThan(0);

      expect(month.learning.length).toBeGreaterThanOrEqual(2);
      expect(month.learning.length).toBeLessThanOrEqual(8);
      expect(month.practice.length).toBeGreaterThanOrEqual(2);
      expect(month.practice.length).toBeLessThanOrEqual(4);
      expect(month.weeklyFocus).toHaveLength(3);
      expect(month.acceptance).toHaveLength(3);
      expect(month.pitfalls.length).toBeGreaterThanOrEqual(3);
      expect(month.pitfalls.length).toBeLessThanOrEqual(4);
      expect(month.references.length).toBeGreaterThanOrEqual(1);
      expect(month.references.length).toBeLessThanOrEqual(3);
      expect(month.resumeEvidence.length).toBeGreaterThanOrEqual(1);
      expect(month.resumeEvidence.length).toBeLessThanOrEqual(3);
      for (const item of month.resumeEvidence) {
        expect(item.trim().length).toBeGreaterThan(4);
        expect(item).not.toContain("交付物");
      }

      expect(month.startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(month.endDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(month.startDate < month.endDate).toBe(true);
      expect(month.monthKey).toBe(month.month.replace(".", "-"));

      expect(phaseIds.has(month.stageId)).toBe(true);
      monthsPerPhase.set(
        month.stageId,
        (monthsPerPhase.get(month.stageId) ?? 0) + 1
      );
    }

    expect(monthsPerPhase.size).toBe(5);
    for (const phase of bundle.phases) {
      expect(phase.title.trim()).not.toBe("");
      expect(phase.range.trim()).not.toBe("");
      expect(phase.description.trim()).not.toBe("");
      expect(monthsPerPhase.get(phase.id) ?? 0).toBeGreaterThanOrEqual(1);
    }
  });

  it("labels portfolio evidence, AI assistance and publication honestly", () => {
    const works = bundle.portfolio.filter((item) =>
      /^作品\s*\d+/.test(item.code)
    );
    expect(works.map((item) => item.code)).toEqual([
      "作品 01",
      "作品 02",
      "作品 03",
      "作品 04",
      "作品 05"
    ]);
    expect(works[0].evidenceLevel).toBe("guided");
    expect(works[0].aiAssisted).toBe(true);
    expect(works[4].evidenceLevel).toBe("learning");
    expect(works[4].perfNotes).not.toContain("待补充");

    const codes = new Set<string>();
    for (const item of bundle.portfolio) {
      expect(item.title.trim()).not.toBe("");
      expect(item.summary.trim()).not.toBe("");
      expect(item.acceptance.trim()).not.toBe("");
      expect(evidenceLevels).toContain(item.evidenceLevel);
      expect(typeof item.aiAssisted).toBe("boolean");
      expect(typeof item.published).toBe("boolean");
      expect(item.perfNotes.length).toBeGreaterThanOrEqual(0);

      if (item.code) {
        expect(codes.has(item.code)).toBe(false);
        codes.add(item.code);
      }
    }
  });

  it("merges new fields into old cached bundles", () => {
    const fresh = createSeedBundle();
    const stale = {
      ...fresh,
      profile: { ...fresh.profile, displayName: "", bio: "" },
      months: fresh.months.map((month) => ({
        ...month,
        deliverable: "",
        evidenceGate: "",
        estimatedHours: 0
      })),
      portfolio: fresh.portfolio.map((item) => ({
        ...item,
        evidenceLevel: "learning" as const,
        aiAssisted: false,
        perfNotes: ""
      }))
    };
    const merged = mergeSeedFallback(stale);
    expect(merged.profile.displayName).not.toBe("");
    expect(merged.months[0].deliverable).not.toBe("");
    expect(merged.months[0].estimatedHours).toBeGreaterThan(0);
    expect(merged.portfolio[0].evidenceLevel).toBe("guided");
    expect(merged.portfolio[0].aiAssisted).toBe(true);
  });

  it("normalizes legacy attachments saved before daily check-in photos", () => {
    const fresh = createSeedBundle();
    const legacyAttachment = {
      id: "legacy-attachment",
      planId: fresh.plan.id,
      monthId: fresh.months[0].id,
      storagePath: "local/legacy",
      fileName: "legacy.png",
      mimeType: "image/png",
      sizeBytes: 1024,
      uploadedBy: "local-demo",
      url: null,
      createdAt: "2026-11-08T00:00:00.000Z"
    };
    const stale = {
      ...fresh,
      attachments: [legacyAttachment]
    } as unknown as typeof fresh;
    const merged = mergeSeedFallback(stale);
    expect(merged.attachments).toHaveLength(1);
    expect(merged.attachments[0].dailyLogId).toBeNull();
  });

  it("keeps the daily log link of check-in photos", () => {
    const fresh = createSeedBundle();
    const merged = mergeSeedFallback({
      ...fresh,
      attachments: [
        {
          id: "checkin-photo",
          planId: fresh.plan.id,
          monthId: fresh.months[0].id,
          dailyLogId: "log-1",
          storagePath: "local/checkin",
          fileName: "checkin.jpg",
          mimeType: "image/jpeg",
          sizeBytes: 2048,
          uploadedBy: "local-demo",
          url: null,
          createdAt: "2026-11-12T00:00:00.000Z"
        }
      ]
    });
    expect(merged.attachments[0].dailyLogId).toBe("log-1");
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
    expect(stats.totalMonths).toBe(20);
    expect(stats.completedMonths).toBe(1);
    expect(stats.completionPercent).toBe(5);
  });
});
