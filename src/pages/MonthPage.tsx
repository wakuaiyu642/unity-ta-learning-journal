import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  Clock3,
  Download,
  FileText,
  FlaskConical,
  Lightbulb,
  Link2,
  LoaderCircle,
  LockKeyhole,
  NotebookPen,
  Paperclip,
  Save,
  Sparkles,
  Target,
  Trash2,
  Upload
} from "lucide-react";
import {
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState
} from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { getLogPhotos } from "../lib/checkin";
import { useDocumentMeta } from "../lib/meta";
import {
  findRelevantMonth,
  formatDuration,
  formatLogDate,
  getMonthDateRange,
  getMonthLogs,
  getMonthTone,
  getMonthWeekSlots,
  getReviewForWeek,
  getSuggestedLogDate,
  isCheckInDate,
  todayInShanghai
} from "../lib/date";
import { downloadLocalFile } from "../lib/local-files";
import {
  MAX_ATTACHMENTS_PER_MONTH,
  cn,
  statusOptions,
  validateAttachment
} from "../lib/utils";
import type {
  PlanMonth,
  PlanReference,
  WeeklyReview
} from "../types";
import {
  Button,
  FieldLabel,
  PageHeader,
  ProgressRing,
  Select,
  TextArea
} from "../components/UI";
import { DailyCheckInCard } from "../components/DailyCheckInCard";
import { PhotoStrip } from "../components/PhotoStrip";

function SectionShell({
  eyebrow,
  title,
  icon,
  children,
  tone = "default"
}: {
  eyebrow: string;
  title: string;
  icon: ReactNode;
  children: ReactNode;
  tone?: "default" | "accent";
}) {
  return (
    <section className={`panel month-section month-section-${tone}`}>
      <div className="panel-heading compact">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h2>{title}</h2>
        </div>
        <span className="section-icon">{icon}</span>
      </div>
      {children}
    </section>
  );
}

function EditableList({
  monthId,
  value,
  canEdit,
  onSave
}: {
  monthId: string;
  value: string[];
  canEdit: boolean;
  onSave: (items: string[]) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value.join("\n"));
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setDraft(value.join("\n"));
  }, [monthId, value]);

  const save = async () => {
    setBusy(true);
    try {
      await onSave(
        draft
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean)
      );
      setEditing(false);
    } finally {
      setBusy(false);
    }
  };

  if (editing) {
    return (
      <div className="stack-form">
        <TextArea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          rows={Math.min(18, Math.max(7, value.length + 2))}
          aria-label="编辑本栏内容，每行一条"
        />
        <div className="form-actions form-actions-end">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setEditing(false)}
          >
            取消
          </Button>
          <Button type="button" onClick={() => void save()} disabled={busy}>
            {busy ? <LoaderCircle className="spin" size={17} /> : <Save size={17} />}
            保存
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <ol className="content-list">
        {value.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ol>
      {canEdit && (
        <button className="edit-section-button" onClick={() => setEditing(true)}>
          编辑本栏
        </button>
      )}
    </>
  );
}

function ReferenceList({
  monthId,
  value,
  canEdit,
  onSave
}: {
  monthId: string;
  value: PlanReference[];
  canEdit: boolean;
  onSave: (items: PlanReference[]) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(
    value.map((item) => `${item.label} | ${item.href}`).join("\n")
  );
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setDraft(value.map((item) => `${item.label} | ${item.href}`).join("\n"));
  }, [monthId, value]);

  const save = async () => {
    setBusy(true);
    try {
      await onSave(
        draft
          .split("\n")
          .map((line) => {
            const [label, ...href] = line.split("|");
            return { label: label.trim(), href: href.join("|").trim() };
          })
          .filter((item) => item.label)
      );
      setEditing(false);
    } finally {
      setBusy(false);
    }
  };

  if (editing) {
    return (
      <div className="stack-form">
        <p className="form-hint">每行格式：资料名称 | 链接，链接可以留空。</p>
        <TextArea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          rows={8}
        />
        <div className="form-actions form-actions-end">
          <Button variant="ghost" type="button" onClick={() => setEditing(false)}>
            取消
          </Button>
          <Button type="button" onClick={() => void save()} disabled={busy}>
            {busy ? <LoaderCircle className="spin" size={17} /> : <Save size={17} />}
            保存
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="reference-list">
        {value.map((reference) =>
          reference.href ? (
            <a
              key={`${reference.label}-${reference.href}`}
              href={reference.href}
              target="_blank"
              rel="noreferrer"
            >
              <Link2 size={16} />
              {reference.label}
            </a>
          ) : (
            <span key={reference.label}>
              <BookOpen size={16} />
              {reference.label}
            </span>
          )
        )}
      </div>
      {canEdit && (
        <button className="edit-section-button" onClick={() => setEditing(true)}>
          编辑参考资料
        </button>
      )}
    </>
  );
}

function WeeklyReviewEditor({
  planId,
  slot,
  review,
  canEdit,
  defaultOpen,
  onSave
}: {
  planId: string;
  slot: { weekStart: string; weekEnd: string; label: string };
  review: WeeklyReview | null;
  canEdit: boolean;
  defaultOpen: boolean;
  onSave: (input: {
    weekStart: string;
    weekEnd: string;
    completed: string;
    blockers: string;
    nextFocus: string;
  }) => Promise<void>;
}) {
  const [completed, setCompleted] = useState(review?.completed ?? "");
  const [blockers, setBlockers] = useState(review?.blockers ?? "");
  const [nextFocus, setNextFocus] = useState(review?.nextFocus ?? "");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setCompleted(review?.completed ?? "");
    setBlockers(review?.blockers ?? "");
    setNextFocus(review?.nextFocus ?? "");
  }, [review]);

  const save = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      await onSave({
        weekStart: slot.weekStart,
        weekEnd: slot.weekEnd,
        completed,
        blockers,
        nextFocus
      });
      setSaved(true);
      window.setTimeout(() => setSaved(false), 1800);
    } finally {
      setBusy(false);
    }
  };

  return (
    <details className="weekly-review-card" open={defaultOpen} id={planId}>
      <summary>
        <div>
          <strong>{slot.label}</strong>
          <small>{review ? "已复盘" : "待复盘"}</small>
        </div>
        <span>{review?.nextFocus || "记录过程，不改变月度完成状态"}</span>
      </summary>
      {canEdit ? (
        <form className="weekly-review-form" onSubmit={save}>
          <label className="field">
            <FieldLabel>本周完成</FieldLabel>
            <TextArea
              rows={3}
              value={completed}
              onChange={(event) => setCompleted(event.target.value)}
              placeholder="本周真正完成了什么？"
            />
          </label>
          <label className="field">
            <FieldLabel>卡点</FieldLabel>
            <TextArea
              rows={3}
              value={blockers}
              onChange={(event) => setBlockers(event.target.value)}
              placeholder="哪里没有理解，哪些实验失败？"
            />
          </label>
          <label className="field">
            <FieldLabel>下周重点</FieldLabel>
            <TextArea
              rows={2}
              value={nextFocus}
              onChange={(event) => setNextFocus(event.target.value)}
              placeholder="下周最重要的一件事"
            />
          </label>
          <div className="form-actions form-actions-end">
            <span className="form-hint">周复盘不会自动完成当月。</span>
            <Button disabled={busy}>
              {busy ? (
                <LoaderCircle className="spin" size={17} />
              ) : saved ? (
                <Check size={17} />
              ) : (
                <Save size={17} />
              )}
              {saved ? "已保存" : "保存周复盘"}
            </Button>
          </div>
        </form>
      ) : (
        <div className="weekly-review-readonly">
          <p><strong>本周完成：</strong>{review?.completed || "暂无"}</p>
          <p><strong>卡点：</strong>{review?.blockers || "暂无"}</p>
          <p><strong>下周重点：</strong>{review?.nextFocus || "暂无"}</p>
        </div>
      )}
    </details>
  );
}

export function MonthPage() {
  const { bundle } = useApp();
  if (!bundle) return null;
  return <MonthPageContent bundle={bundle} />;
}

function MonthPageContent({
  bundle
}: {
  bundle: NonNullable<ReturnType<typeof useApp>["bundle"]>;
}) {
  const {
    canEdit,
    cloudMode,
    session,
    setDemoEditing,
    updateMonth,
    saveWeeklyReview,
    uploadAttachment,
    deleteAttachment
  } = useApp();
  const { monthKey } = useParams();
  const [searchParams] = useSearchParams();
  const uploadRef = useRef<HTMLInputElement>(null);
  const month =
    bundle.months.find((item) => item.monthKey === monthKey) ??
    findRelevantMonth(bundle.months).month;
  const monthIndex = bundle.months.findIndex((item) => item.id === month.id);
  const previousMonth = bundle.months[monthIndex - 1];
  const nextMonth = bundle.months[monthIndex + 1];
  const base = `/plans/${bundle.plan.slug}`;
  useDocumentMeta(
    `${month.month} · ${month.title} · 成长管线`,
    `本月交付物：${month.deliverable}`
  );
  const monthLogs = getMonthLogs(bundle.dailyLogs, month.id);
  const monthMinutes = monthLogs.reduce((sum, log) => sum + log.minutes, 0);
  const attachments = bundle.attachments.filter(
    (attachment) => attachment.monthId === month.id
  );
  const userId = session?.user.id ?? "local-demo";
  const slots = getMonthWeekSlots(
    month,
    bundle.plan.startDate,
    bundle.plan.endDate
  );
  const selectedWeek = searchParams.get("week");
  const requestedDate = searchParams.get("date");
  const suggestedDate = getSuggestedLogDate(month);
  // 只有合法的 YYYY-MM-DD 且落在当前月份内时才采用 ?date=；
  // ?week= 等其它链接不传 date，继续保持默认日期。
  const validDateParam =
    requestedDate &&
    /^\d{4}-\d{2}-\d{2}$/.test(requestedDate) &&
    isCheckInDate(month, requestedDate)
      ? requestedDate
      : null;
  const [statusBusy, setStatusBusy] = useState(false);
  const [dailyDate, setDailyDate] = useState(
    () => validDateParam ?? suggestedDate
  );
  const [uploadBusy, setUploadBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setDailyDate(validDateParam ?? suggestedDate);
    setMessage("");
    setError("");
    // 只在切换月份或 ?date= 深链变化时重置，不覆盖用户手动选择的日期。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month.id, suggestedDate, validDateParam]);

  // 从打卡日历「在月度记录中查看」带 ?date= 进入时，滚动到每日记录区。
  useEffect(() => {
    if (!validDateParam) return;
    document
      .getElementById("daily-record")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [month.id, validDateParam]);

  const flash = (text: string) => {
    setMessage(text);
    window.setTimeout(() => setMessage(""), 2400);
  };

  const toggleDone = async () => {
    setStatusBusy(true);
    setError("");
    try {
      const nextDone = month.status !== "done";
      await updateMonth(month.id, {
        status: nextDone ? "done" : "not_started",
        completedAt: nextDone ? new Date().toISOString() : null
      });
      flash(nextDone ? "本月验收已完成" : "已取消本月完成状态");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "更新失败");
    } finally {
      setStatusBusy(false);
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
    if (attachments.length >= MAX_ATTACHMENTS_PER_MONTH) {
      setError(`每月最多上传 ${MAX_ATTACHMENTS_PER_MONTH} 个附件。`);
      return;
    }
    setUploadBusy(true);
    setError("");
    try {
      await uploadAttachment(month.id, file);
      flash("附件已上传");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "上传失败");
    } finally {
      setUploadBusy(false);
    }
  };

  const openAttachment = async (attachmentId: string) => {
    const attachment = attachments.find((item) => item.id === attachmentId);
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

  const removeAttachment = async (attachmentId: string) => {
    const attachment = attachments.find((item) => item.id === attachmentId);
    if (!attachment || !window.confirm(`确定删除“${attachment.fileName}”吗？`)) {
      return;
    }
    try {
      await deleteAttachment(attachment);
      flash("附件已删除");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "删除失败");
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow={`${bundle.plan.title} · 第 ${month.sortOrder} / ${bundle.months.length} 月`}
        title={`${month.month} · ${month.title}`}
        description={getMonthDateRange(month).range}
        actions={
          <div className="week-nav-actions">
            {previousMonth && (
              <Link
                className="icon-link bordered"
                to={`${base}/months/${previousMonth.monthKey}`}
                aria-label="上个月"
              >
                <ArrowLeft size={18} />
              </Link>
            )}
            <Select
              value={month.monthKey}
              onChange={(event) => {
                window.location.href = `${base}/months/${event.target.value}`;
              }}
              aria-label="选择月份"
            >
              {bundle.months.map((item) => (
                <option key={item.id} value={item.monthKey}>
                  {item.month} · {item.title}
                </option>
              ))}
            </Select>
            {nextMonth && (
              <Link
                className="icon-link bordered"
                to={`${base}/months/${nextMonth.monthKey}`}
                aria-label="下个月"
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
            <span>月度内容、打卡和周复盘均可查看；修改需要所有者或编辑者权限。</span>
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
                value={
                  month.status === "done"
                    ? 100
                    : Math.min(
                        90,
                        Math.round((monthLogs.length / 20) * 100)
                      )
                }
                size={120}
                label={`${monthLogs.length} 天记录`}
              />
              <div>
                <p className="eyebrow">月度验收</p>
                <h2>{getMonthTone(month)}</h2>
                <p>
                  每日打卡和周复盘只记录过程。达到验收标准后，由你手动完成本月。
                </p>
              </div>
            </div>
            <div className="checkin-controls">
              <div>
                <FieldLabel>整月状态</FieldLabel>
                <Select
                  value={month.status}
                  disabled={!canEdit || statusBusy}
                  onChange={(event) =>
                    void updateMonth(month.id, {
                      status: event.target.value as typeof month.status,
                      completedAt:
                        event.target.value === "done"
                          ? new Date().toISOString()
                          : null
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
                className={`done-toggle ${month.status === "done" ? "done-toggle-active" : ""}`}
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
                    {month.status === "done" ? "本月已完成" : "完成本月验收"}
                  </strong>
                  <small>以验收标准为准</small>
                </span>
              </button>
            </div>
          </section>

          <section className="panel deliverable-panel">
            <div className="panel-heading compact">
              <div>
                <p className="eyebrow">本月唯一交付物</p>
                <h2>{month.deliverable}</h2>
              </div>
              <span className="quiet-pill">
                <Clock3 size={15} />
                预计投入 {month.estimatedHours} 小时
              </span>
            </div>
            <div className="month-focus-grid">
              <article>
                <span>独立完成门槛</span>
                <strong>达不到就补，不进入下个月</strong>
                <p>{month.evidenceGate}</p>
              </article>
              <article>
                <span>本月预算</span>
                <strong>
                  已记录 {formatDuration(monthMinutes)} / 预算 {month.estimatedHours} 小时
                </strong>
                <p>打卡只记录过程，不自动完成月份；预算用于自查节奏，不强制凑满。</p>
              </article>
              <article>
                <span>写进简历</span>
                <strong>{month.resumeEvidence.length} 条能力证据</strong>
                <p>{month.resumeEvidence.join("；")}</p>
              </article>
            </div>
          </section>

          <SectionShell
            eyebrow="学什么"
            title={`${month.learning.length} 个核心主题`}
            icon={<BookOpen size={21} />}
          >
            <EditableList
              monthId={month.id}
              value={month.learning}
              canEdit={canEdit}
              onSave={(learning) => updateMonth(month.id, { learning })}
            />
          </SectionShell>

          <SectionShell
            eyebrow="做什么"
            title={`${month.practice.length} 个实践任务`}
            icon={<FlaskConical size={21} />}
          >
            <EditableList
              monthId={month.id}
              value={month.practice}
              canEdit={canEdit}
              onSave={(practice) => updateMonth(month.id, { practice })}
            />
          </SectionShell>

          <SectionShell
            eyebrow="达到什么水平"
            title={`${month.acceptance.length} 条本月验收`}
            icon={<Target size={21} />}
            tone="accent"
          >
            <EditableList
              monthId={month.id}
              value={month.acceptance}
              canEdit={canEdit}
              onSave={(acceptance) => updateMonth(month.id, { acceptance })}
            />
          </SectionShell>

          <div className="month-detail-grid">
            <details className="panel month-disclosure">
              <summary>
                <span><Sparkles size={19} /> 周重点建议</span>
                <small>只用来安排节奏</small>
              </summary>
              <EditableList
                monthId={month.id}
                value={month.weeklyFocus}
                canEdit={canEdit}
                onSave={(weeklyFocus) => updateMonth(month.id, { weeklyFocus })}
              />
            </details>
            <details className="panel month-disclosure">
              <summary>
                <span><Lightbulb size={19} /> 常见错误</span>
                <small>提前避开</small>
              </summary>
              <EditableList
                monthId={month.id}
                value={month.pitfalls}
                canEdit={canEdit}
                onSave={(pitfalls) => updateMonth(month.id, { pitfalls })}
              />
            </details>
            <details className="panel month-disclosure">
              <summary>
                <span><Link2 size={19} /> 参考资料</span>
                <small>官方文档与教材</small>
              </summary>
              <ReferenceList
                monthId={month.id}
                value={month.references}
                canEdit={canEdit}
                onSave={(references) => updateMonth(month.id, { references })}
              />
            </details>
            <details className="panel month-disclosure">
              <summary>
                <span><NotebookPen size={19} /> 简历能力映射</span>
                <small>作品与能力证据</small>
              </summary>
              <EditableList
                monthId={month.id}
                value={month.resumeEvidence}
                canEdit={canEdit}
                onSave={(resumeEvidence) =>
                  updateMonth(month.id, { resumeEvidence })
                }
              />
            </details>
          </div>

          <section className="panel" id="weekly-reviews">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">每周复盘</p>
                <h2>记录过程，不驱动完成状态</h2>
              </div>
              <span className="quiet-pill">{slots.length} 个自然周</span>
            </div>
            <div className="weekly-review-list">
              {slots.map((slot) => (
                <WeeklyReviewEditor
                  key={slot.weekStart}
                  planId={`review-${slot.weekStart}`}
                  slot={slot}
                  review={getReviewForWeek(
                    bundle.weeklyReviews,
                    slot.weekStart,
                    userId
                  )}
                  canEdit={canEdit}
                  defaultOpen={
                    selectedWeek === slot.weekStart ||
                    (todayInShanghai() >= slot.weekStart &&
                      todayInShanghai() <= slot.weekEnd)
                  }
                  onSave={saveWeeklyReview}
                />
              ))}
            </div>
          </section>

          <section className="panel" id="daily-record">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">每日记录</p>
                <h2>今天投入了什么？</h2>
              </div>
              <span className="quiet-pill">
                <Clock3 size={15} />
                本月 {formatDuration(monthMinutes)}
              </span>
            </div>
            <DailyCheckInCard
              month={month}
              date={dailyDate}
              showDateField
              onDateChange={setDailyDate}
              onMessage={flash}
              onError={setError}
            />

            {monthLogs.length > 0 && (
              <div className="daily-log-list">
                {monthLogs.map((log) => (
                  <article
                    key={log.id}
                    className={cn(
                      "daily-log-item",
                      log.logDate === dailyDate && "daily-log-item-active"
                    )}
                  >
                    <div className="log-date-block">
                      <strong>{formatLogDate(log.logDate)}</strong>
                      <span>{formatDuration(log.minutes)}</span>
                    </div>
                    <div>
                      <p>{log.note || "完成今日学习记录"}</p>
                      <small>由 {log.authorName} 记录</small>
                      <PhotoStrip
                        attachments={getLogPhotos(bundle.attachments, log.id)}
                        size="sm"
                        altPrefix={`${log.logDate} 打卡照片`}
                      />
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>

        <aside className="week-side">
          <section className="panel attachment-panel">
            <div className="panel-heading compact">
              <div>
                <p className="eyebrow">本月附件</p>
                <h2>截图、笔记或 PDF</h2>
              </div>
              <Paperclip size={19} />
            </div>
            <p className="quiet-copy">
              单文件不超过 10MB，每月最多 {MAX_ATTACHMENTS_PER_MONTH} 个。视频请放外部链接。
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
              {attachments.map((attachment) => (
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
              {!attachments.length && (
                <p className="quiet-empty-text">这个月还没有附件。</p>
              )}
            </div>
          </section>

          <section className="panel week-note-panel">
            <p className="eyebrow">执行提醒</p>
            <h3>验收没过，再补一轮</h3>
            <p>
              月度计划不是硬赶日期。没有达到本月验收水平时，先补基础或顺延，再进入下一阶段。
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
