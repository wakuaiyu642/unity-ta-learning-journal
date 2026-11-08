import { todayInShanghai } from "./date";
import type { Attachment, Plan } from "../types";

/** 每次打卡最多上传的照片数量。 */
export const MAX_CHECKIN_PHOTOS = 3;
/** 打卡照片文件选择器接受的 MIME 类型。 */
export const CHECKIN_PHOTO_ACCEPT =
  "image/png,image/jpeg,image/webp,image/heic";
/** 单张打卡照片的大小上限：10MB（与 learning-files bucket 一致）。 */
export const MAX_CHECKIN_PHOTO_BYTES = 10 * 1024 * 1024;

const CHECKIN_PHOTO_TYPES = CHECKIN_PHOTO_ACCEPT.split(",");

/** 部分系统给 HEIC 等照片的 MIME 为空，用扩展名兜底判断。 */
const EXTENSION_TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  heic: "image/heic",
  heif: "image/heic"
};

export type CheckInState = "before_start" | "active" | "ended";

function resolvePhotoType(file: File) {
  if (file.type) return file.type.toLowerCase();
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  return EXTENSION_TYPES[extension] ?? "";
}

/** 校验单张打卡照片，返回中文错误文案；通过时返回 null。 */
export function validateCheckInPhoto(file: File): string | null {
  const type = resolvePhotoType(file);
  if (!CHECKIN_PHOTO_TYPES.includes(type)) {
    return "打卡照片仅支持 PNG、JPG、WebP、HEIC 格式。";
  }
  if (file.size > MAX_CHECKIN_PHOTO_BYTES) {
    return "单张打卡照片不能超过 10MB。";
  }
  return null;
}

/** 某条打卡记录关联的照片，最新上传的排在前面。 */
export function getLogPhotos(attachments: Attachment[], logId: string) {
  return attachments
    .filter((attachment) => attachment.dailyLogId === logId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** 计划相对今天的打卡窗口状态。 */
export function getCheckInState(
  plan: Pick<Plan, "startDate" | "endDate">,
  today = todayInShanghai()
): CheckInState {
  if (today < plan.startDate) return "before_start";
  if (today > plan.endDate) return "ended";
  return "active";
}
