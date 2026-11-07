import type { ProgressStatus } from "../types";

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

export function getInitials(value: string) {
  return value
    .split(/\s+|@/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}
