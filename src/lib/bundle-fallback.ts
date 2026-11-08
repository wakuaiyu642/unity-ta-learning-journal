// Merge new fields (deliverable / evidence gates / portfolio labels) into old
// cached bundles so returning visitors do not see blank values after upgrades.
import type { PlanBundle } from "../types";
import { createSeedBundle } from "./seed";

export function mergeSeedFallback(parsed: PlanBundle): PlanBundle {
  const fallback = createSeedBundle();
  const monthByKey = new Map(
    fallback.months.map((month) => [month.monthKey, month])
  );
  const portfolioByCode = new Map(
    fallback.portfolio
      .filter((item) => item.code)
      .map((item) => [item.code, item])
  );

  return {
    ...parsed,
    profile:
      parsed.profile && parsed.profile.displayName
        ? { ...fallback.profile, ...parsed.profile, planId: parsed.plan?.id ?? fallback.profile.planId }
        : { ...fallback.profile, planId: parsed.plan?.id ?? fallback.profile.planId },
    months: Array.isArray(parsed.months)
      ? parsed.months.map((month) => {
          const source = monthByKey.get(month.monthKey);
          if (!source) return month;
          return {
            ...month,
            deliverable: month.deliverable || source.deliverable,
            evidenceGate: month.evidenceGate || source.evidenceGate,
            estimatedHours: month.estimatedHours || source.estimatedHours,
            learning: month.learning?.length ? month.learning : source.learning,
            practice: month.practice?.length ? month.practice : source.practice,
            acceptance: month.acceptance?.length
              ? month.acceptance
              : source.acceptance
          };
        })
      : fallback.months,
    portfolio: Array.isArray(parsed.portfolio)
      ? parsed.portfolio.map((item) => {
          const source = item.code ? portfolioByCode.get(item.code) : undefined;
          if (!source) return item;
          const untouched =
            item.evidenceLevel === "learning" &&
            item.aiAssisted === false &&
            !item.perfNotes;
          return {
            ...item,
            evidenceLevel: untouched
              ? source.evidenceLevel
              : item.evidenceLevel ?? source.evidenceLevel,
            aiAssisted: untouched
              ? source.aiAssisted
              : item.aiAssisted ?? source.aiAssisted,
            perfNotes: item.perfNotes || source.perfNotes
          };
        })
      : fallback.portfolio,
    // dailyLogId 是打卡照片迁移新增字段，旧缓存里的附件没有它。
    attachments: Array.isArray(parsed.attachments)
      ? parsed.attachments.map((attachment) => ({
          ...attachment,
          dailyLogId: attachment.dailyLogId ?? null
        }))
      : fallback.attachments
  };
}
