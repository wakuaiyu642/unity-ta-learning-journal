import { z } from "zod";
import type {
  DailyLogInput,
  MonthPatch,
  PortfolioPatch,
  WeeklyReviewInput
} from "../types";

const statusSchema = z.enum([
  "not_started",
  "in_progress",
  "done",
  "deferred"
]);

export const dailyLogSchema = z.object({
  logDate: z.string().date("日期格式无效"),
  minutes: z
    .number()
    .int("学习时长必须是整数")
    .min(0, "学习时长不能小于 0")
    .max(1440, "单日学习时长不能超过 24 小时"),
  note: z.string().max(5000, "记录内容不能超过 5000 字")
});

export const portfolioPatchSchema = z.object({
  status: statusSchema.optional(),
  title: z.string().min(1, "作品名称不能为空").max(120).optional(),
  summary: z.string().max(3000).optional(),
  acceptance: z.string().max(5000).optional(),
  completedOn: z.string().date("完成日期格式无效").nullable().optional(),
  notes: z.string().max(5000).optional(),
  demoUrl: z.union([z.literal(""), z.string().url("演示链接格式无效")]).optional(),
  repoUrl: z
    .union([z.literal(""), z.string().url("GitHub 链接格式无效")])
    .optional(),
  coverUrl: z
    .union([z.literal(""), z.string().url("封面链接格式无效")])
    .optional(),
  techStack: z.array(z.string().max(40)).max(20).optional(),
  published: z.boolean().optional()
});

export const weeklyReviewSchema = z.object({
  weekStart: z.string().date("周开始日期格式无效"),
  weekEnd: z.string().date("周结束日期格式无效"),
  completed: z.string().max(5000, "本周完成内容不能超过 5000 字"),
  blockers: z.string().max(5000, "卡点不能超过 5000 字"),
  nextFocus: z.string().max(5000, "下周重点不能超过 5000 字")
});

export const monthPatchSchema = z.object({
  status: statusSchema.optional(),
  completedAt: z.string().datetime().nullable().optional(),
  title: z.string().min(1).max(160).optional(),
  learning: z.array(z.string().max(1000)).max(20).optional(),
  practice: z.array(z.string().max(1000)).max(20).optional(),
  weeklyFocus: z.array(z.string().max(1000)).max(12).optional(),
  acceptance: z.array(z.string().max(1500)).max(12).optional(),
  pitfalls: z.array(z.string().max(1500)).max(12).optional(),
  references: z
    .array(
      z.object({
        label: z.string().max(200),
        href: z.union([z.literal(""), z.string().url()])
      })
    )
    .max(12)
    .optional(),
  resumeEvidence: z.array(z.string().max(1000)).max(12).optional()
});

export function validateDailyLog(input: DailyLogInput) {
  return dailyLogSchema.parse(input);
}

export function validatePortfolioPatch(input: PortfolioPatch) {
  return portfolioPatchSchema.parse(input);
}

export function validateWeeklyReview(input: WeeklyReviewInput) {
  return weeklyReviewSchema.parse(input);
}

export function validateMonthPatch(input: MonthPatch) {
  return monthPatchSchema.parse(input);
}
