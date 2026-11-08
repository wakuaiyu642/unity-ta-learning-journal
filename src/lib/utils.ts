import type {
  EvidenceLevel,
  ProfileSkillLevel,
  ProgressStatus
} from "../types";

export const statusLabels: Record<ProgressStatus, string> = {
  not_started: "未开始",
  in_progress: "进行中",
  done: "已完成",
  deferred: "已顺延"
};

export const statusOptions: Array<{ value: ProgressStatus; label: string }> = [
  { value: "not_started", label: "未开始" },
  { value: "in_progress", label: "进行中" },
  { value: "done", label: "已完成" },
  { value: "deferred", label: "已顺延" }
];

export const skillLevelLabels: Record<ProfileSkillLevel, string> = {
  aware: "了解",
  guided: "能跟做",
  independent: "能独立",
  explainable: "能讲原理"
};

export const skillLevelOptions: Array<{
  value: ProfileSkillLevel;
  label: string;
}> = [
  { value: "aware", label: "了解" },
  { value: "guided", label: "能跟做" },
  { value: "independent", label: "能独立" },
  { value: "explainable", label: "能讲原理" }
];

export const evidenceLabels: Record<EvidenceLevel, string> = {
  learning: "学习中",
  guided: "能跟做",
  independent: "能独立",
  reusable: "可复用"
};

export const evidenceOptions: Array<{ value: EvidenceLevel; label: string }> = [
  { value: "learning", label: "学习中" },
  { value: "guided", label: "能跟做" },
  { value: "independent", label: "能独立" },
  { value: "reusable", label: "可复用" }
];

export const ALLOWED_ATTACHMENT_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/heic",
  "application/pdf",
  "text/markdown",
  "text/plain"
];

export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
export const MAX_ATTACHMENTS_PER_MONTH = 20;

export function validateAttachment(file: File) {
  if (!ALLOWED_ATTACHMENT_TYPES.includes(file.type)) {
    return "仅支持 PNG、JPG、WebP、HEIC、PDF、Markdown 和文本文件。";
  }
  if (file.size > MAX_ATTACHMENT_BYTES) {
    return "附件不能超过 10MB。";
  }
  return null;
}

export function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function safeFileName(name: string) {
  return name
    .normalize("NFKD")
    .replace(/[^\w.\-\u4e00-\u9fa5]+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 120);
}

/**
 * Supabase Storage 的对象 key 不接受中文/空格等字符（会报 Invalid key）。
 * 上传路径只保留安全扩展名，原始文件名继续存 DB 用于展示。
 */
export function storageFileExtension(name: string) {
  const extension = (name.split(".").pop() || "").trim().toLowerCase();
  return /^[a-z0-9]{1,10}$/.test(extension) ? extension : "bin";
}

export function getInitials(value: string) {
  return value
    .split(/\s+|@/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}
