import { type FormEvent, useMemo, useRef, useState } from "react";
import {
  ArrowUpRight,
  CheckCircle2,
  ExternalLink,
  Eye,
  EyeOff,
  GitBranch,
  LoaderCircle,
  Pencil,
  Sparkles,
  Upload
} from "lucide-react";
import { useApp } from "../context/AppContext";
import { WorkVisual } from "../components/WorkVisual";
import { useDocumentMeta } from "../lib/meta";
import type { EvidenceLevel, PortfolioItem, ProgressStatus } from "../types";
import {
  cn,
  evidenceLabels,
  evidenceOptions,
  statusLabels,
  statusOptions
} from "../lib/utils";
import {
  Button,
  FieldLabel,
  Modal,
  PageHeader,
  Select,
  StatusBadge,
  TextArea,
  TextInput
} from "../components/UI";

function EvidenceBadge({ level }: { level: EvidenceLevel }) {
  return (
    <span className={cn("evidence-badge", `evidence-${level}`)}>
      完成度：{evidenceLabels[level]}
    </span>
  );
}

function PortfolioCard({
  item,
  index,
  canEdit,
  onEdit
}: {
  item: PortfolioItem;
  index: number;
  canEdit: boolean;
  onEdit: () => void;
}) {
  return (
    <article className="portfolio-card">
      <div
        className={cn(
          "portfolio-card-art",
          item.coverUrl
            ? "portfolio-card-art-cover"
            : `portfolio-art-${(index % 4) + 1}`
        )}
      >
        {item.coverUrl ? (
          <img
            className="portfolio-card-cover"
            src={item.coverUrl}
            alt={item.title}
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover"
            }}
          />
        ) : /^作品\s*\d+/.test(item.code) ? (
          <WorkVisual
            code={item.code}
            index={index}
            title={item.title}
            className="portfolio-card-cover"
          />
        ) : (
          <>
            <div className="portfolio-card-grid" />
            <span>{item.code || "能力模块"}</span>
            <Sparkles size={35} />
          </>
        )}
        <small>{item.published ? "已公开" : "筹备中"}</small>
      </div>
      <div className="portfolio-card-body">
        <div className="portfolio-card-topline">
          <div
            className="portfolio-card-badges"
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              gap: 8
            }}
          >
            <span title="验收状态：是否通过本月验收">
              <StatusBadge status={item.status} />
            </span>
            <span title="完成度：脱离教程后的独立程度">
              <EvidenceBadge level={item.evidenceLevel} />
            </span>
            {item.aiAssisted && <span className="ai-badge">AI 辅助</span>}
          </div>
          {canEdit && (
            <button className="icon-button" onClick={onEdit} aria-label="编辑作品">
              <Pencil size={17} />
            </button>
          )}
        </div>
        <h2>{item.title}</h2>
        <p>{item.summary}</p>
        <div className="acceptance-box">
          <span>验收要求</span>
          <p>{item.acceptance}</p>
        </div>
        {item.perfNotes && (
          <div className="perf-notes">
            <span>性能记录</span>
            <p>{item.perfNotes}</p>
          </div>
        )}
        {item.techStack.length > 0 && (
          <div className="tech-stack">
            {item.techStack.map((tech) => (
              <span key={tech}>{tech}</span>
            ))}
          </div>
        )}
        {(item.demoUrl || item.repoUrl) && (
          <div className="portfolio-links">
            {item.demoUrl && (
              <a href={item.demoUrl} target="_blank" rel="noreferrer">
                <ExternalLink size={16} /> 演示
              </a>
            )}
            {item.repoUrl && (
              <a href={item.repoUrl} target="_blank" rel="noreferrer">
                <GitBranch size={16} /> 源码
              </a>
            )}
          </div>
        )}
      </div>
    </article>
  );
}

export function PortfolioPage() {
  const { bundle, canEdit, updatePortfolio, uploadProfileAsset } = useApp();
  const [editing, setEditing] = useState<PortfolioItem | null>(null);
  const [coverPreview, setCoverPreview] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState<ProgressStatus | "all">("all");
  const coverInput = useRef<HTMLInputElement>(null);
  const portfolio = bundle?.portfolio ?? [];
  const filtered = useMemo(
    () =>
      portfolio.filter(
        (item) => statusFilter === "all" || item.status === statusFilter
      ),
    [portfolio, statusFilter]
  );
  const finished = portfolio.filter((item) => item.status === "done").length;

  useDocumentMeta("作品集 · 成长管线", "Unity TA 作品集：完成度、AI 标注、性能记录与验收状态");

  if (!bundle) return null;

  const openEditor = (item: PortfolioItem) => {
    setEditing(item);
    setCoverPreview(item.coverUrl);
    setError("");
  };

  const closeEditor = () => {
    setEditing(null);
    setCoverPreview("");
    setBusy(false);
    setError("");
  };

  const onCoverFile = async (file: File) => {
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setError("封面仅支持 PNG / JPG / WebP。");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError("封面不能超过 2MB。");
      return;
    }
    if (!editing) return;
    setBusy(true);
    setError("");
    try {
      const url = await uploadProfileAsset("cover", file, editing.id);
      setCoverPreview(url);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "封面上传失败");
    } finally {
      setBusy(false);
    }
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editing) return;
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    try {
      await updatePortfolio(editing.id, {
        title: String(form.get("title") ?? "").trim(),
        status: String(form.get("status")) as ProgressStatus,
        summary: String(form.get("summary") ?? "").trim(),
        acceptance: String(form.get("acceptance") ?? "").trim(),
        notes: String(form.get("notes") ?? "").trim(),
        demoUrl: String(form.get("demoUrl") ?? "").trim(),
        repoUrl: String(form.get("repoUrl") ?? "").trim(),
        coverUrl: coverPreview.trim(),
        techStack: String(form.get("techStack") ?? "")
          .split(/[,，]/)
          .map((value) => value.trim())
          .filter(Boolean),
        evidenceLevel: String(form.get("evidenceLevel")) as EvidenceLevel,
        aiAssisted: form.get("aiAssisted") === "on",
        perfNotes: String(form.get("perfNotes") ?? "").trim(),
        completedOn:
          String(form.get("status")) === "done"
            ? String(form.get("completedOn") || new Date().toISOString().slice(0, 10))
            : null,
        published: form.get("published") === "on"
      });
      setEditing(null);
      setCoverPreview("");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "保存失败");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="作品集与能力验收"
        title="把学习结果变成可展示的证据"
        description="完成度表示独立程度（学习中 / 能跟做 / 能独立 / 可复用），验收状态表示是否通过本月验收；AI 辅助完成的部分单独标注。每个作品都需要可运行的工程、演示视频和技术说明。"
      />

      <section className="portfolio-summary">
        <div>
          <p className="eyebrow">整体完成</p>
          <strong>
            {finished}
            <span> / {bundle.portfolio.length}</span>
          </strong>
          <small>
            项作品或能力模块通过验收（验收状态 ≠ 完成度，完成度看独立程度）
          </small>
        </div>
        <div className="portfolio-progress">
          <span
            style={{
              width: `${(finished / Math.max(1, bundle.portfolio.length)) * 100}%`
            }}
          />
        </div>
        {canEdit && (
          <div className="portfolio-summary-note">
            <Eye size={18} />
            编辑项目卡片后，可单独标记为已公开。
          </div>
        )}
      </section>

      <div className="portfolio-toolbar">
        <div className="filter-tabs" role="tablist" aria-label="按状态筛选">
          <button
            className={cn(statusFilter === "all" && "filter-tab-active")}
            onClick={() => setStatusFilter("all")}
          >
            全部
          </button>
          {statusOptions.map((option) => (
            <button
              key={option.value}
              className={cn(
                statusFilter === option.value && "filter-tab-active"
              )}
              onClick={() => setStatusFilter(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
        <span className="quiet-pill">
          <CheckCircle2 size={15} />
          {statusLabels.done}以验收为准
        </span>
      </div>

      <div className="portfolio-grid">
        {filtered.map((item) => (
          <PortfolioCard
            key={item.id}
            item={item}
            index={bundle.portfolio.findIndex((source) => source.id === item.id)}
            canEdit={canEdit}
            onEdit={() => openEditor(item)}
          />
        ))}
      </div>

      <Modal
        open={Boolean(editing)}
        title={editing?.code ? `编辑 ${editing.code}` : "编辑能力模块"}
        onClose={closeEditor}
      >
        {editing && (
          <form className="stack-form edit-form" onSubmit={submit}>
            <div className="form-grid">
              <label className="field">
                <FieldLabel>名称</FieldLabel>
                <TextInput name="title" defaultValue={editing.title} required />
              </label>
              <label className="field">
                <FieldLabel>状态</FieldLabel>
                <Select name="status" defaultValue={editing.status}>
                  {statusOptions.map((option) => (
                    <option value={option.value} key={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </label>
            </div>
            <label className="field">
              <FieldLabel>简介</FieldLabel>
              <TextArea name="summary" defaultValue={editing.summary} rows={3} />
            </label>
            <label className="field">
              <FieldLabel>验收要求</FieldLabel>
              <TextArea
                name="acceptance"
                defaultValue={editing.acceptance}
                rows={3}
              />
            </label>
            <div className="form-grid">
              <label className="field">
                <FieldLabel hint="能否脱离教程独立完成">完成度</FieldLabel>
                <Select
                  name="evidenceLevel"
                  defaultValue={editing.evidenceLevel}
                >
                  {evidenceOptions.map((option) => (
                    <option value={option.value} key={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </label>
              <div className="field">
                <FieldLabel>AI 参与情况</FieldLabel>
                <label className="checkbox-row">
                  <input
                    type="checkbox"
                    name="aiAssisted"
                    defaultChecked={editing.aiAssisted}
                  />
                  <span>
                    <strong>AI 辅助完成</strong>
                    <small>如实标注有 AI 参与的部分。</small>
                  </span>
                </label>
              </div>
            </div>
            <label className="field">
              <FieldLabel hint="优化前后数据、帧率、Draw Call 等">
                性能记录
              </FieldLabel>
              <TextArea
                name="perfNotes"
                defaultValue={editing.perfNotes}
                rows={3}
                placeholder="例：优化后同场景 GPU 耗时从 8.2ms 降到 5.1ms"
              />
            </label>
            <div className="form-grid">
              <label className="field">
                <FieldLabel>完成日期</FieldLabel>
                <TextInput
                  type="date"
                  name="completedOn"
                  defaultValue={editing.completedOn ?? ""}
                />
              </label>
              <label className="field">
                <FieldLabel hint="逗号分隔">技术栈</FieldLabel>
                <TextInput
                  name="techStack"
                  defaultValue={editing.techStack.join(", ")}
                  placeholder="Unity, URP, HLSL"
                />
              </label>
            </div>
            <div className="form-grid">
              <label className="field">
                <FieldLabel>演示链接</FieldLabel>
                <TextInput
                  type="url"
                  name="demoUrl"
                  defaultValue={editing.demoUrl}
                  placeholder="https://"
                />
              </label>
              <label className="field">
                <FieldLabel>GitHub 链接</FieldLabel>
                <TextInput
                  type="url"
                  name="repoUrl"
                  defaultValue={editing.repoUrl}
                  placeholder="https://github.com/..."
                />
              </label>
            </div>
            <label className="field">
              <FieldLabel hint="PNG / JPG / WebP，≤2MB">
                封面图片链接
              </FieldLabel>
              <TextInput
                type="url"
                name="coverUrl"
                value={coverPreview}
                onChange={(event) => setCoverPreview(event.target.value)}
                placeholder="https://"
              />
              <div className="form-actions">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={busy}
                  onClick={() => coverInput.current?.click()}
                >
                  {busy ? (
                    <LoaderCircle className="spin" size={16} />
                  ) : (
                    <Upload size={16} />
                  )}
                  上传封面图
                </Button>
                <input
                  ref={coverInput}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  hidden
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void onCoverFile(file);
                    event.target.value = "";
                  }}
                />
              </div>
              {coverPreview && (
                <img
                  className="cover-preview"
                  src={coverPreview}
                  alt="封面预览"
                  style={{
                    width: "100%",
                    height: 120,
                    objectFit: "cover",
                    borderRadius: 10
                  }}
                />
              )}
            </label>
            <label className="field">
              <FieldLabel>补充说明</FieldLabel>
              <TextArea name="notes" defaultValue={editing.notes} rows={3} />
            </label>
            <label className="checkbox-row">
              <input
                type="checkbox"
                name="published"
                defaultChecked={editing.published}
              />
              <span>
                <strong>标记为已公开</strong>
                <small>作品集卡片会显示「已公开」，并优先出现在学习记录页的作品预览。</small>
              </span>
              {editing.published ? <Eye size={17} /> : <EyeOff size={17} />}
            </label>
            {error && <p className="form-error">{error}</p>}
            <div className="form-actions form-actions-end">
              <Button type="button" variant="ghost" onClick={closeEditor}>
                取消
              </Button>
              <Button disabled={busy}>
                {busy ? (
                  <LoaderCircle className="spin" size={17} />
                ) : (
                  <ArrowUpRight size={17} />
                )}
                保存作品资料
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
