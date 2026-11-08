import { Camera, Check, Clock3, LoaderCircle } from "lucide-react";
import {
  type ChangeEvent,
  type FormEvent,
  useEffect,
  useRef,
  useState
} from "react";
import { useApp } from "../context/AppContext";
import {
  CHECKIN_PHOTO_ACCEPT,
  MAX_CHECKIN_PHOTOS,
  getLogPhotos,
  validateCheckInPhoto
} from "../lib/checkin";
import {
  formatDuration,
  formatLogDate,
  getAnyLogForDate,
  getCheckInDateFloor,
  getDailyLogForDate
} from "../lib/date";
import { cn } from "../lib/utils";
import type { Attachment, PlanMonth } from "../types";
import { PhotoStrip } from "./PhotoStrip";
import { Button, FieldLabel, TextArea, TextInput } from "./UI";

interface DailyCheckInCardProps {
  month: PlanMonth;
  /** YYYY-MM-DD，由调用方控制（首页用今天，月页用所选日期）。 */
  date: string;
  showDateField?: boolean;
  onDateChange?: (date: string) => void;
  onMessage?: (message: string) => void;
  onError?: (message: string) => void;
}

interface PendingPhoto {
  id: string;
  file: File;
  /** 仅为本地预览创建的 object URL，成功上传/移除/卸载时释放。 */
  url: string;
}

const MAX_MINUTES = 1440;

/**
 * 共享的每日打卡卡：首页（今天）和月页（可选日期）复用。
 *
 * - 可编辑：日期（可隐藏）/ 学习时长 / 今天做了什么 / 打卡照片（最多 3 张）；
 * - 只读：只展示记录、时长、笔记与照片，不出现 form 与删除按钮；
 * - 照片先随记录保存，再逐张上传；失败的留在待传列表里可以重点提交。
 */
export function DailyCheckInCard({
  month,
  date,
  showDateField = false,
  onDateChange,
  onMessage,
  onError
}: DailyCheckInCardProps) {
  const {
    bundle,
    canEdit,
    cloudMode,
    session,
    saveDailyLog,
    uploadDailyPhoto,
    deleteAttachment
  } = useApp();
  const [minutes, setMinutes] = useState("");
  const [note, setNote] = useState("");
  const [pendingPhotos, setPendingPhotos] = useState<PendingPhoto[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const pendingRef = useRef<PendingPhoto[]>([]);
  const pendingUrls = useRef(new Set<string>());

  const userId = session?.user.id ?? "local-demo";
  const draftKey = `ta-monthly-draft-${month.id}-${date}`;
  const ownLog = bundle
    ? getDailyLogForDate(bundle.dailyLogs, month.id, date, userId)
    : null;
  const existing = bundle
    ? canEdit
      ? ownLog
      : getAnyLogForDate(bundle.dailyLogs, month.id, date)
    : null;
  const existingPhotos =
    bundle && existing ? getLogPhotos(bundle.attachments, existing.id) : [];
  const remainingPhotoSlots = Math.max(
    0,
    MAX_CHECKIN_PHOTOS - existingPhotos.length - pendingPhotos.length
  );

  const updatePending = (next: PendingPhoto[]) => {
    pendingRef.current = next;
    setPendingPhotos(next);
  };

  const releasePendingPhoto = (photo: PendingPhoto) => {
    URL.revokeObjectURL(photo.url);
    pendingUrls.current.delete(photo.url);
  };

  /** 卸载时释放所有还没上传的预览 object URL。 */
  useEffect(() => {
    return () => {
      pendingUrls.current.forEach((url) => URL.revokeObjectURL(url));
      pendingUrls.current.clear();
      pendingRef.current = [];
    };
  }, []);

  /** 切换日期时清空待上传照片（同一次提交失败的照片会保留，见提交流程）。 */
  useEffect(() => {
    if (pendingRef.current.length) {
      pendingRef.current.forEach(releasePendingPhoto);
      updatePending([]);
    }
    // releasePendingPhoto/updatePending 只依赖 ref 与 setState，这里按日期触发即可。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  /**
   * 预填只在「日期 / 已有记录 id」变化时执行：
   * 实时刷新（订阅推送）只会让 bundle 变新，不会覆盖正在输入的内容。
   */
  useEffect(() => {
    setMinutes(existing ? String(existing.minutes) : "");
    setNote(
      existing?.note ?? window.localStorage.getItem(draftKey) ?? ""
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, existing?.id]);

  const showMessage = (text: string) => {
    if (onMessage) {
      onMessage(text);
      return;
    }
    setMessage(text);
    window.setTimeout(() => setMessage(""), 2600);
  };

  const showError = (text: string) => {
    if (onError) {
      onError(text);
      return;
    }
    setError(text);
  };

  const clearError = () => {
    if (!onError) setError("");
  };

  const handleFilesSelected = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!files.length) return;
    if (remainingPhotoSlots <= 0) {
      showError(`每次打卡最多 ${MAX_CHECKIN_PHOTOS} 张照片。`);
      return;
    }

    const accepted: PendingPhoto[] = [];
    let firstError: string | null = null;
    for (const file of files) {
      const validationError = validateCheckInPhoto(file);
      if (validationError) {
        firstError = firstError ?? validationError;
        continue;
      }
      if (accepted.length >= remainingPhotoSlots) {
        firstError = firstError ?? `每次打卡最多 ${MAX_CHECKIN_PHOTOS} 张照片。`;
        break;
      }
      const url = URL.createObjectURL(file);
      pendingUrls.current.add(url);
      accepted.push({ id: crypto.randomUUID(), file, url });
    }

    if (accepted.length) {
      updatePending([...pendingRef.current, ...accepted]);
    }
    if (firstError) {
      showError(firstError);
    } else {
      clearError();
    }
  };

  const removePendingPhoto = (photoId: string) => {
    const target = pendingRef.current.find((photo) => photo.id === photoId);
    if (target) releasePendingPhoto(target);
    updatePending(pendingRef.current.filter((photo) => photo.id !== photoId));
  };

  const removeExistingPhoto = async (attachment: Attachment) => {
    if (!window.confirm("确定删除这张打卡照片吗？")) return;
    clearError();
    try {
      await deleteAttachment(attachment);
      showMessage("照片已删除");
    } catch (nextError) {
      showError(
        nextError instanceof Error ? nextError.message : "照片删除失败"
      );
    }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const numericMinutes = Number(minutes || 0);
    if (!Number.isFinite(numericMinutes) || numericMinutes < 0) {
      showError("学习时长需要是大于等于 0 的数字。");
      return;
    }
    if (numericMinutes > MAX_MINUTES) {
      showError(`学习时长不能超过 ${MAX_MINUTES} 分钟。`);
      return;
    }

    const hadExisting = Boolean(existing);
    setBusy(true);
    clearError();
    try {
      const savedLog = await saveDailyLog(month.id, {
        logDate: date,
        minutes: Math.round(numericMinutes),
        note: note.trim()
      });
      window.localStorage.removeItem(draftKey);

      // 记录已落库，再逐张上传照片；失败的照片留在待传列表，可以重新提交。
      const failed: PendingPhoto[] = [];
      let firstPhotoError: string | null = null;
      for (const photo of pendingRef.current) {
        try {
          await uploadDailyPhoto(month.id, savedLog.id, photo.file);
          releasePendingPhoto(photo);
        } catch (nextError) {
          failed.push(photo);
          firstPhotoError =
            firstPhotoError ??
            (nextError instanceof Error ? nextError.message : "照片上传失败");
        }
      }
      updatePending(failed);
      showMessage(hadExisting ? "今日记录已更新" : "今日打卡已写入");
      if (firstPhotoError) {
        showError(
          `${failed.length} 张照片没传成功，已保留待重新提交：${firstPhotoError}`
        );
      }
    } catch (nextError) {
      showError(nextError instanceof Error ? nextError.message : "打卡失败");
    } finally {
      setBusy(false);
    }
  };

  const pendingAttachments: Attachment[] = pendingPhotos.map((photo) => ({
    id: photo.id,
    planId: bundle?.plan.id ?? "",
    monthId: month.id,
    storagePath: "",
    fileName: photo.file.name,
    mimeType: photo.file.type,
    sizeBytes: photo.file.size,
    uploadedBy: userId,
    url: photo.url,
    dailyLogId: null,
    createdAt: new Date().toISOString()
  }));

  if (!canEdit) {
    // 首页（无日期栏）说「今天」，月页（可选历史日期）说「这一天」。
    const emptyRecordText = showDateField
      ? "这一天还没有打卡记录"
      : "今天还没有打卡记录";
    const readonlyHint = showDateField
      ? "登录为所有者或编辑者后，可以记录每日投入。"
      : cloudMode
        ? "登录后可在首页打卡"
        : "打开右上角「演示编辑」后可在首页打卡";
    return (
      <div className="checkin-card checkin-card-readonly">
        {existing ? (
          <article className="checkin-readonly-record">
            <div className="checkin-readonly-meta">
              <strong>{formatLogDate(date)}</strong>
              <span>{existing.minutes} 分钟</span>
              <small>
                {formatDuration(existing.minutes)} · 由 {existing.authorName} 记录
              </small>
            </div>
            <p>{existing.note || "完成今日学习记录"}</p>
            <PhotoStrip
              attachments={existingPhotos}
              size="md"
              altPrefix={`${existing.logDate} 打卡照片`}
            />
          </article>
        ) : (
          <>
            <p className="read-only-copy">{emptyRecordText}</p>
            <p className="quiet-copy">{readonlyHint}</p>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="checkin-card">
      {message && (
        <div className="checkin-inline-toast" role="status">
          {message}
        </div>
      )}
      {error && <div className="form-error form-error-banner">{error}</div>}
      <form className="checkin-form" onSubmit={(event) => void submit(event)}>
        <div
          className={cn(
            "form-grid",
            "checkin-form-grid",
            !showDateField && "checkin-form-grid-single"
          )}
        >
          {showDateField && (
            <label className="field">
              <FieldLabel>日期</FieldLabel>
              <TextInput
                type="date"
                value={date}
                min={getCheckInDateFloor(month)}
                max={month.endDate}
                onChange={(event) => onDateChange?.(event.target.value)}
                required
              />
            </label>
          )}
          <label className="field">
            <FieldLabel hint="分钟">学习时长</FieldLabel>
            <TextInput
              type="number"
              min="0"
              max={MAX_MINUTES}
              inputMode="numeric"
              value={minutes}
              onChange={(event) => setMinutes(event.target.value)}
              placeholder="60"
            />
          </label>
        </div>

        <label className="field">
          <FieldLabel hint="会显示在公开记录中">
            今天做了什么 / 卡在哪里
          </FieldLabel>
          <TextArea
            rows={3}
            value={note}
            onChange={(event) => {
              setNote(event.target.value);
              window.localStorage.setItem(draftKey, event.target.value);
            }}
            placeholder="例如：完成了纹理采样实验，但切线空间还需要补一补。"
          />
        </label>

        <div className="field checkin-photo-field">
          <FieldLabel hint={`最多 ${MAX_CHECKIN_PHOTOS} 张，单张不超过 10MB`}>
            打卡照片
          </FieldLabel>
          <input
            ref={photoInputRef}
            className="visually-hidden"
            type="file"
            accept={CHECKIN_PHOTO_ACCEPT}
            multiple
            data-testid="checkin-photo-input"
            onChange={handleFilesSelected}
          />
          <div className="checkin-photo-picker">
            <Button
              type="button"
              variant="secondary"
              className="checkin-photo-button"
              disabled={remainingPhotoSlots <= 0}
              onClick={() => photoInputRef.current?.click()}
            >
              <Camera size={16} />
              {remainingPhotoSlots > 0
                ? "选择照片"
                : `最多 ${MAX_CHECKIN_PHOTOS} 张`}
            </Button>
            <span className="form-hint">
              还可以添加 {remainingPhotoSlots} 张
            </span>
          </div>
          {pendingAttachments.length > 0 && (
            <div className="checkin-photo-group">
              <span className="checkin-photo-label">待上传（提交后写入公开记录）</span>
              <PhotoStrip
                attachments={pendingAttachments}
                size="md"
                altPrefix={`${date} 待上传照片`}
                onRemove={(attachment) => removePendingPhoto(attachment.id)}
              />
            </div>
          )}
          {existingPhotos.length > 0 && (
            <div className="checkin-photo-group">
              <span className="checkin-photo-label">已上传照片</span>
              <PhotoStrip
                attachments={existingPhotos}
                size="md"
                altPrefix={`${date} 打卡照片`}
                onRemove={(attachment) => void removeExistingPhoto(attachment)}
              />
            </div>
          )}
        </div>

        <div className="form-actions">
          <span className="form-hint">
            {existing
              ? "同一天再次保存会更新你的原记录。"
              : "打卡和周复盘不会自动完成本月。"}
          </span>
          <Button disabled={busy}>
            {busy ? (
              <LoaderCircle className="spin" size={17} />
            ) : existing ? (
              <Clock3 size={17} />
            ) : (
              <Check size={17} />
            )}
            {existing ? "更新今日记录" : "今日打卡"}
          </Button>
        </div>
      </form>
      <p className="form-hint checkin-photo-note">
        照片会出现在公开记录中，可随时删除。
      </p>
    </div>
  );
}
