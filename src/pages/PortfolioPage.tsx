import { type FormEvent, useMemo, useState } from "react";
import {
  ArrowUpRight,
  CheckCircle2,
  ExternalLink,
  Eye,
  EyeOff,
  GitBranch,
  LoaderCircle,
  Pencil,
  Sparkles
} from "lucide-react";
import { useApp } from "../context/AppContext";
import type { PortfolioItem, ProgressStatus } from "../types";
import { cn, statusLabels, statusOptions } from "../lib/utils";
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
          `portfolio-art-${(index % 4) + 1}`
        )}
      >
        <div className="portfolio-card-grid" />
        <span>{item.code || "能力模块"}</span>
        <Sparkles size={35} />
        <small>{item.published ? "已公开" : "筹备中"}</small>
      </div>
      <div className="portfolio-card-body">
        <div className="portfolio-card-topline">
          <StatusBadge status={item.status} />
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
  const { bundle, canEdit, updatePortfolio } = useApp();
  const [editing, setEditing] = useState<PortfolioItem | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState<ProgressStatus | "all">("all");
  const portfolio = bundle?.portfolio ?? [];
  const filtered = useMemo(
    () =>
      portfolio.filter(
        (item) => statusFilter === "all" || item.status === statusFilter
      ),
    [portfolio, statusFilter]
  );
  const finished = portfolio.filter((item) => item.status === "done").length;

  if (!bundle) return null;

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
        coverUrl: String(form.get("coverUrl") ?? "").trim(),
        techStack: String(form.get("techStack") ?? "")
          .split(/[,，]/)
          .map((value) => value.trim())
          .filter(Boolean),
        completedOn:
          String(form.get("status")) === "done"
            ? String(form.get("completedOn") || new Date().toISOString().slice(0, 10))
            : null,
        published: form.get("published") === "on"
      });
      setEditing(null);
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
        description="每个作品都需要可运行的工程、演示视频、技术说明和一次独立复写验收。"
      />

      <section className="portfolio-summary">
        <div>
          <p className="eyebrow">整体完成</p>
          <strong>
            {finished}
            <span> / {bundle.portfolio.length}</span>
          </strong>
          <small>项作品或能力模块通过验收</small>
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
            编辑项目卡片后，可单独打开“公开到首页”。
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
            onEdit={() => setEditing(item)}
          />
        ))}
      </div>

      <Modal
        open={Boolean(editing)}
        title={editing?.code ? `编辑 ${editing.code}` : "编辑能力模块"}
        onClose={() => setEditing(null)}
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
              <FieldLabel>封面图片链接</FieldLabel>
              <TextInput
                type="url"
                name="coverUrl"
                defaultValue={editing.coverUrl}
                placeholder="https://"
              />
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
                <strong>公开到首页</strong>
                <small>公开页面仍可查看完整验收看板。</small>
              </span>
              {editing.published ? <Eye size={17} /> : <EyeOff size={17} />}
            </label>
            {error && <p className="form-error">{error}</p>}
            <div className="form-actions form-actions-end">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setEditing(null)}
              >
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
