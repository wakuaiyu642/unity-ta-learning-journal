import { z } from "zod";
import type {
  DailyLogInput,
  MonthPatch,
  PortfolioPatch,
  ProfilePatch,
  WeeklyReviewInput
} from "../types";

const statusSchema = z.enum([
  "not_started",
  "in_progress",
  "done",
  "deferred"
]);

const evidenceLevelSchema = z.enum([
  "learning",
  "guided",
  "independent",
  "reusable"
]);

const skillLevelSchema = z.enum([
  "aware",
  "guided",
  "independent",
  "explainable"
]);

const imageSourceSchema = z.union([
  z.literal(""),
  z.string().url("图片链接格式无效"),
  z.string().max(3_000_000, "图片过大").regex(/^data:image\//, "图片格式无效")
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
  coverUrl: imageSourceSchema.optional(),
  techStack: z.array(z.string().max(40)).max(20).optional(),
  evidenceLevel: evidenceLevelSchema.optional(),
  aiAssisted: z.boolean().optional(),
  perfNotes: z.string().max(3000, "性能记录不能超过 3000 字").optional(),
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

const profileLinksSchema = z.object({
  githubUrl: z.union([z.literal(""), z.string().url("GitHub 链接格式无效")]),
  email: z.union([z.literal(""), z.string().email("邮箱格式无效")]),
  resumeUrl: z.union([
    z.literal(""),
    z.string().url("简历链接格式无效"),
    z.string().max(3_000_000).regex(/^data:application\/pdf/, "简历格式无效")
  ]),
  websiteUrl: z.union([z.literal(""), z.string().url("网站链接格式无效")]),
  showEmail: z.boolean()
});

export const profilePatchSchema = z.object({
  displayName: z.string().trim().min(1, "显示名称不能为空").max(40),
  headline: z.string().max(120),
  avatarUrl: imageSourceSchema,
  location: z.string().max(80),
  school: z.string().max(120),
  major: z.string().max(120),
  degree: z.string().max(40),
  grade: z.string().max(40),
  graduationYear: z
    .number()
    .int("毕业年份必须是整数")
    .min(2000, "毕业年份无效")
    .max(2100, "毕业年份无效")
    .nullable(),
  targetRole: z.string().max(120),
  targetCompanies: z.string().max(200),
  bio: z.string().max(2000, "个人简介不能超过 2000 字"),
  selfPositioning: z.string().max(1200, "自我定位不能超过 1200 字"),
  honestyNote: z.string().max(800),
  skills: z
    .array(
      z.object({
        name: z.string().trim().min(1, "技能名称不能为空").max(60),
        level: skillLevelSchema,
        note: z.string().max(600)
      })
    )
    .max(12, "最多 12 项技能"),
  highlights: z.array(z.string().max(300)).max(12, "最多 12 条亮点"),
  links: profileLinksSchema
}).partial();

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

export function validateProfilePatch(input: ProfilePatch) {
  return profilePatchSchema.parse(input);
}
