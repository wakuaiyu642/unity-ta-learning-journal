import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock3,
  Download,
  FileText,
  Link2,
  LoaderCircle,
  LockKeyhole,
  Paperclip,
  Save,
  Trash2,
  Upload
} from "lucide-react";
import {
  type ChangeEvent,
  type FormEvent,
  useEffect,
  useRef,
  useState
} from "react";
import { Link, useParams } from "react-router-dom";
import { useApp } from "../context/AppContext";
import type { PlanBundle } from "../types";
import {
  findRelevantWeek,
  formatDuration,
  formatLogDate,
  getDailyLogForDate,
  getLogsForWeek,
  getSuggestedLogDate,
  getWeekDateRange,
  getWeekProgress,
  getWeekTone
} from "../lib/date";
import { downloadLocalFile } from "../lib/local-files";
import {
  getTrackColor,
  statusOptions,
  validateAttachment,
  MAX_ATTACHMENTS_PER_WEEK
} from "../lib/utils";
import {
  Button,
  FieldLabel,
  PageHeader,
  ProgressRing,
  Select,
  StatusBadge,
  TextArea,
  TextInput
} from "../components/UI";

interface TaskRowProps {
  weekId: string;
  task: {
    id: string;
    trackKey: string;
    title: string;
    content: string;
  };
  trackColor: string;
  canEdit: boolean;
  onSave: (taskId: string, content: string) => Promise<void>;
}

function TaskRow({
  weekId,
  task,
  trackColor,
  canEdit,
  onSave
}: TaskRowProps) {
  const [content, setContent] = useState(task.content);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setContent(task.content);
  }, [task.content, weekId]);

  const save = async () => {
    if (content.trim() === task.content.trim()) return;
    setBusy(true);
    setError("");
    try {
      await onSave(task.id, content);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 1800);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "保存失败");
    } finally {
      setBusy(false);
    }
  };

  return (
    <article className="week-task-card">
      <span
        className="track-mark large"
        style={{ backgroundColor: trackColor }}
      />
      <div className="week-task-body">
        <div className="week-task-heading">
          <strong>{task.title}</strong>
          {canEdit && (
            <button
              className="inline-save"
              onClick={() => void save()}
              disabled={busy || content === task.content}
            >
              {busy ? (
                <LoaderCircle className="spin" size={15} />
              ) : saved ? (
                <Check size={15} />
              ) : (
                <Save size={15} />
              )}
              {saved ? "已保存" : "保存"}
            </button>
          )}
        </div>
        {canEdit ? (
          <TextArea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            rows={3}
            aria-label={`编辑 ${task.title} 内容`}
          />
        ) : (
          <p>{task.content}</p>
        )}
        {error && <p className="form-error">{error}</p>}
      </div>
    </article>
  );
}

export function WeekPage() {
  const { bundle } = useApp();
  if (!bundle) return null;
  return <WeekPageContent bundle={bundle} />;
}

function WeekPageContent({ bundle }: { bundle: PlanBundle }) {
  const {
    canEdit,
    cloudMode,
    session,
    updateWeek,
    updateTask,
    saveDailyLog,
    uploadAttachment,
    deleteAttachment,
    setDemoEditing
  } = useApp();
  const { weekNo } = useParams();
  const uploadRef = useRef<HTMLInputElement>(null);
  const [statusBusy, setStatusBusy] = useState(false);
  const [reflection, setReflection] = useState("");
  const [reflectionBusy, setReflectionBusy] = useState(false);
  const [dailyDate, setDailyDate] = useState("");
  const [minutes, setMinutes] = useState("");
  const [note, setNote] = useState("");
  const [dailyBusy, setDailyBusy] = useState(false);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const fallbackWeek = findRelevantWeek(bundle.weeks).week;
  const week =
    bundle.weeks.find((item) => item.weekNo.toLowerCase() === weekNo?.toLowerCase()) ??
    fallbackWeek;
  const weekIndex = bundle.weeks.findIndex((item) => item.id === week.id);
  const previousWeek = bundle.weeks[weekIndex - 1];
  const nextWeek = bundle.weeks[weekIndex + 1];
  const base = `/plans/${bundle.plan.slug}`;
  const stats = getWeekProgress(week);
  const weekLogs = getLogsForWeek(bundle.dailyLogs, week.id);
  const weekMinutes = weekLogs.reduce((sum, log) => sum + log.minutes, 0);
  const weekAttachments = bundle.attachments.filter(
    (attachment) => attachment.weekId === week.id
  );
  const currentUserId = session?.user.id ?? "local-demo";
  const suggestedDate = getSuggestedLogDate(week);
  const existingDailyLog = getDailyLogForDate(
    bundle.dailyLogs,
    week.id,
    dailyDate || suggestedDate,
    currentUserId
  );

  useEffect(() => {
    const draftKey = `ta-draft-reflection-${week.id}`;
    setReflection(
      window.localStorage.getItem(draftKey) ?? week.reflection ?? ""
    );
    setError("");
    setMessage("");
  }, [week.id, week.reflection]);

  useEffect(() => {
    setDailyDate(suggestedDate);
    setDailyBusy(false);
    setMessage("");
    setError("");
  }, [week.id, suggestedDate]);

  useEffect(() => {
    const ownLog = getDailyLogForDate(
      bundle.dailyLogs,
      week.id,
      dailyDate || suggestedDate,
      currentUserId
    );
    setMinutes(ownLog ? String(ownLog.minutes) : "");
    setNote(
      ownLog?.note ??
        window.localStorage.getItem(
          `ta-draft-daily-${week.id}-${dailyDate || suggestedDate}`
        ) ??
        ""
    );
  }, [
    bundle.dailyLogs,
    currentUserId,
    dailyDate,
    suggestedDate,
    week.id
  ]);

  const flash = (text: string) => {
    setMessage(text);
    window.setTimeout(() => setMessage(""), 2400);
  };

  const toggleDone = async () => {
    setStatusBusy(true);
    setError("");
    try {
      await updateWeek(week.id, {
        status: week.status === "done" ? "not_started" : "done"
      });
      flash(week.status === "done" ? "已取消本周完成状态" : "本周验收已完成");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "更新失败");
    } finally {
      setStatusBusy(false);
    }
  };

  const saveReflection = async () => {
    setReflectionBusy(true);
    setError("");
    try {
      await updateWeek(week.id, { reflection });
      window.localStorage.removeItem(`ta-draft-reflection-${week.id}`);
      flash("本周复盘已保存");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "保存失败");
    } finally {
      setReflectionBusy(false);
    }
  };

  const submitDaily = async (event: FormEvent) => {
    event.preventDefault();
    const numericMinutes = Number(minutes || 0);
    if (!Number.isFinite(numericMinutes) || numericMinutes < 0) {
      setError("学习时长需要是大于等于 0 的数字。");
      return;
    }
    setDailyBusy(true);
    setError("");
    try {
      await saveDailyLog(week.id, {
        logDate: dailyDate || suggestedDate,
        minutes: Math.round(numericMinutes),
        note: note.trim()
      });
      window.localStorage.removeItem(
        `ta-draft-daily-${week.id}-${dailyDate || suggestedDate}`
      );
      flash(existingDailyLog ? "今日记录已更新" : "今日打卡已写入");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "打卡失败");
    } finally {
      setDailyBusy(false);
    }
  };

  const uploadFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const validationError = validateAttachment(file);
    if (validationError) {
      setError(validationError);
      return;
    }
    if (weekAttachments.length >= MAX_ATTACHMENTS_PER_WEEK) {
      setError(`每周最多上传 ${MAX_ATTACHMENTS_PER_WEEK} 个附件。`);
      return;
    }
    setUploadBusy(true);
    setError("");
    try {
      await uploadAttachment(week.id, file);
      flash("附件已上传");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "上传失败");
    } finally {
      setUploadBusy(false);
    }
  };

  const removeAttachment = async (attachmentId: string) => {
    const attachment = weekAttachments.find((item) => item.id === attachmentId);
    if (!attachment) return;
    if (!window.confirm(`确定删除附件“${attachment.fileName}”吗？`)) return;
    setError("");
    try {
      await deleteAttachment(attachment);
      flash("附件已删除");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "删除失败");
    }
  };

  const openAttachment = async (attachmentId: string) => {
    const attachment = weekAttachments.find((item) => item.id === attachmentId);
    if (!attachment) return;
    if (attachment.url) {
      window.open(attachment.url, "_blank", "noopener,noreferrer");
      return;
    }
    try {
      await downloadLocalFile(attachment.storagePath, attachment.fileName);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "附件无法读取");
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow={`${bundle.plan.title} · 第 ${week.weekIndex} / ${bundle.weeks.length} 周`}
        title={`${week.weekNo} · ${week.theme}`}
        description={getWeekDateRange(week).range}
        actions={
          <div className="week-nav-actions">
            {previousWeek && (
              <Link
                className="icon-link bordered"
                to={`${base}/weeks/${previousWeek.weekNo}`}
                aria-label="上一周"
              >
                <ArrowLeft size={18} />
              </Link>
            )}
            <Select
              value={week.weekNo}
              onChange={(event) => {
                window.location.href = `${base}/weeks/${event.target.value}`;
              }}
              aria-label="选择周次"
            >
              {bundle.weeks.map((item) => (
                <option key={item.id} value={item.weekNo}>
                  {item.weekNo} · {item.theme}
                </option>
              ))}
            </Select>
            {nextWeek && (
              <Link
                className="icon-link bordered"
                to={`${base}/weeks/${nextWeek.weekNo}`}
                aria-label="下一周"
              >
                <ArrowRight size={18} />
              </Link>
            )}
          </div>
        }
      />

      {!canEdit && (
        <div className="mode-banner mode-banner-compact">
          <LockKeyhole size={18} />
          <div>
            <strong>公开查看</strong>
            <span>
              可以查看全部任务和记录。打卡、编辑与上传需要所有者或协作者权限。
            </span>
          </div>
          {!cloudMode && (
            <button
              className="button button-secondary button-small"
              onClick={() => setDemoEditing(true)}
            >
              本地演示编辑
            </button>
          )}
        </div>
      )}

      {message && <div className="toast-message">{message}</div>}
      {error && <div className="form-error form-error-banner">{error}</div>}

      <div className="week-layout">
        <div className="week-main">
          <section className="panel checkin-panel">
            <div className="checkin-summary">
              <ProgressRing
                value={stats.percent}
                size={120}
                label={`${stats.completed}/${stats.total} 项`}
              />
              <div>
                <p className="eyebrow">本周验收</p>
                <h2>{getWeekTone(week)}</h2>
                <p>
                  完成实践验收后再勾选。整周状态由你手动控制，不根据每日时长自动完成。
                </p>
              </div>
            </div>
            <div className="checkin-controls">
              <div>
                <FieldLabel>整周状态</FieldLabel>
                <Select
                  value={week.status}
                  disabled={!canEdit || statusBusy}
                  onChange={(event) =>
                    void updateWeek(week.id, {
                      status: event.target.value as typeof week.status
                    })
                  }
                >
                  {statusOptions.map((option) => (
                    <option value={option.value} key={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </div>
              <button
                className={`done-toggle ${week.status === "done" ? "done-toggle-active" : ""}`}
                type="button"
                onClick={() => void toggleDone()}
                disabled={!canEdit || statusBusy}
              >
                {statusBusy ? (
                  <LoaderCircle className="spin" size={20} />
                ) : (
                  <CheckCircle2 size={20} />
                )}
                <span>
                  <strong>
                    {week.status === "done" ? "本周已完成" : "标记本周完成"}
                  </strong>
                  <small>以实践验收为准</small>
                </span>
              </button>
            </div>
          </section>

          <section className="panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">本周清单</p>
                <h2>四条学习主线</h2>
              </div>
              <StatusBadge status={week.status} />
            </div>
            <div className="week-task-list">
              {week.tasks.map((task) => (
                <TaskRow
                  key={task.id}
                  weekId={week.id}
                  task={task}
                  trackColor={getTrackColor(task.trackKey, bundle.tracks)}
                  canEdit={canEdit}
                  onSave={(taskId, content) =>
                    updateTask(taskId, { content })
                  }
                />
              ))}
            </div>
          </section>

          <section className="panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">每日记录</p>
                <h2>今天投入了什么？</h2>
              </div>
              <span className="quiet-pill">
                <Clock3 size={15} />
                本周 {formatDuration(weekMinutes)}
              </span>
            </div>
            {canEdit ? (
              <form className="daily-form" onSubmit={submitDaily}>
                <div className="form-grid">
                  <label className="field">
                    <FieldLabel>日期</FieldLabel>
                    <TextInput
                      type="date"
                      value={dailyDate}
                      min={week.startDate}
                      max={week.endDate}
                      onChange={(event) => setDailyDate(event.target.value)}
                      required
                    />
                  </label>
                  <label className="field">
                    <FieldLabel hint="分钟">学习时长</FieldLabel>
                    <TextInput
                      type="number"
                      min="0"
                      max="1440"
                      inputMode="numeric"
                      value={minutes}
                      onChange={(event) => setMinutes(event.target.value)}
                      placeholder="60"
                    />
                  </label>
                </div>
                <label className="field">
                  <FieldLabel hint="会显示在公开记录中">今天做了什么 / 卡在哪里</FieldLabel>
                  <TextArea
                    rows={3}
                    value={note}
                    onChange={(event) => {
                      setNote(event.target.value);
                      window.localStorage.setItem(
                        `ta-draft-daily-${week.id}-${dailyDate || suggestedDate}`,
                        event.target.value
                      );
                    }}
                    placeholder="例如：完成了纹理采样实验，但切线空间还需要补一补。"
                  />
                </label>
                <div className="form-actions">
                  <span className="form-hint">
                    {existingDailyLog
                      ? "同一天再次保存会覆盖你原来的记录。"
                      : "打卡不会自动把整周标记为完成。"}
                  </span>
                  <Button disabled={dailyBusy}>
                    {dailyBusy ? (
                      <LoaderCircle className="spin" size={17} />
                    ) : (
                      <Check size={17} />
                    )}
                    {existingDailyLog ? "更新今日记录" : "今日打卡"}
                  </Button>
                </div>
              </form>
            ) : (
              <p className="read-only-copy">
                登录为所有者或编辑者后，可以记录每日投入。
              </p>
            )}

            {weekLogs.length > 0 && (
              <div className="daily-log-list">
                {weekLogs.map((log) => (
                  <article key={log.id} className="daily-log-item">
                    <div className="log-date-block">
                      <strong>{formatLogDate(log.logDate)}</strong>
                      <span>{formatDuration(log.minutes)}</span>
                    </div>
                    <div>
                      <p>{log.note || "完成今日学习记录"}</p>
                      <small>由 {log.authorName} 记录</small>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">周末复盘</p>
                <h2>留下可继续的线索</h2>
              </div>
            </div>
            {canEdit ? (
              <>
                <TextArea
                  rows={5}
                  value={reflection}
                  onChange={(event) => {
                    setReflection(event.target.value);
                    window.localStorage.setItem(
                      `ta-draft-reflection-${week.id}`,
                      event.target.value
                    );
                  }}
                  placeholder="记录没弄懂的概念、报错、需要补的知识，以及下周如何继续。"
                />
                <div className="form-actions form-actions-end">
                  <span className="form-hint">未保存内容会暂存在本机。</span>
                  <Button
                    type="button"
                    onClick={() => void saveReflection()}
                    disabled={reflectionBusy}
                  >
                    {reflectionBusy ? (
                      <LoaderCircle className="spin" size={17} />
                    ) : (
                      <Save size={17} />
                    )}
                    保存复盘
                  </Button>
                </div>
              </>
            ) : (
              <div className="reflection-readonly">
                {week.reflection ? (
                  <p>{week.reflection}</p>
                ) : (
                  <p>这一周还没有复盘。</p>
                )}
              </div>
            )}
          </section>
        </div>

        <aside className="week-side">
          <section className="panel attachment-panel">
            <div className="panel-heading compact">
              <div>
                <p className="eyebrow">成果附件</p>
                <h2>截图、笔记或 PDF</h2>
              </div>
              <Paperclip size={19} />
            </div>
            <p className="quiet-copy">
              单文件不超过 10MB，每周最多 {MAX_ATTACHMENTS_PER_WEEK} 个。视频请放外部链接。
            </p>
            {canEdit && (
              <>
                <input
                  ref={uploadRef}
                  className="visually-hidden"
                  type="file"
                  accept=".png,.jpg,.jpeg,.webp,.heic,.pdf,.md,.txt"
                  onChange={(event) => void uploadFile(event)}
                />
                <Button
                  type="button"
                  variant="secondary"
                  className="upload-button"
                  disabled={uploadBusy}
                  onClick={() => uploadRef.current?.click()}
                >
                  {uploadBusy ? (
                    <LoaderCircle className="spin" size={17} />
                  ) : (
                    <Upload size={17} />
                  )}
                  上传附件
                </Button>
              </>
            )}
            <div className="attachment-list">
              {weekAttachments.map((attachment) => (
                <div className="attachment-item" key={attachment.id}>
                  <span className="file-icon">
                    <FileText size={18} />
                  </span>
                  <div>
                    <strong title={attachment.fileName}>
                      {attachment.fileName}
                    </strong>
                    <small>
                      {(attachment.sizeBytes / 1024 / 1024).toFixed(2)} MB
                    </small>
                  </div>
                  <button
                    className="icon-button"
                    type="button"
                    onClick={() => void openAttachment(attachment.id)}
                    aria-label={`打开 ${attachment.fileName}`}
                  >
                    <Download size={16} />
                  </button>
                  {canEdit && (
                    <button
                      className="icon-button danger-icon"
                      type="button"
                      onClick={() => void removeAttachment(attachment.id)}
                      aria-label={`删除 ${attachment.fileName}`}
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))}
              {!weekAttachments.length && (
                <p className="quiet-empty-text">这一周还没有附件。</p>
              )}
            </div>
          </section>

          <section className="panel week-note-panel">
            <p className="eyebrow">本周提示</p>
            <h3>先自己做一次</h3>
            <p>
              看完视频或读完章节但无法独立重现，不算完成。AI
              可以解释和检查，但核心效果要保留一次不看教程的验收。
            </p>
            <Link to={`${base}/portfolio`} className="text-link">
              <Link2 size={16} />
              查看作品验收标准
            </Link>
          </section>
        </aside>
      </div>
    </div>
  );
}
