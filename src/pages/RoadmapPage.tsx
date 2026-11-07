import { useMemo, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  CalendarRange,
  CheckCircle2,
  Search,
  Target
} from "lucide-react";
import { Link } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { useDocumentMeta } from "../lib/meta";
import { todayInShanghai } from "../lib/date";
import { cn } from "../lib/utils";
import { PageHeader, StatusBadge } from "../components/UI";

export function RoadmapPage() {
  const { bundle } = useApp();
  useDocumentMeta("成长路线 · 成长管线", "20 个月、5 个阶段的 Unity TA 成长路线");
  const [query, setQuery] = useState("");

  const filteredPhases = useMemo(() => {
    const months = bundle?.months ?? [];
    const phases = bundle?.phases ?? [];
    const keyword = query.trim().toLowerCase();
    return phases.map((phase) => ({
      ...phase,
      months: months.filter(
        (month) =>
          month.stageId === phase.id &&
          (!keyword ||
            [
              month.month,
              month.title,
              ...month.learning,
              ...month.practice,
              ...month.acceptance
            ]
              .join(" ")
              .toLowerCase()
              .includes(keyword))
      )
    }));
  }, [bundle, query]);

  if (!bundle) return null;
  const completed = bundle.months.filter(
    (month) => month.status === "done"
  ).length;
  const currentMonthKey = todayInShanghai().slice(0, 7);

  return (
    <div>
      <PageHeader
        eyebrow="完整月度路线"
        title="20 个月，围绕能力而不是堆积名词"
        description={`${bundle.plan.periodLabel} · 5 个阶段 · 每月回答“学什么、做什么、达到什么水平”`}
      />

      <section className="roadmap-overview">
        <article className="roadmap-stat">
          <CalendarRange size={22} />
          <div>
            <strong>{bundle.months.length}</strong>
            <span>计划月份</span>
          </div>
        </article>
        <article className="roadmap-stat">
          <Target size={22} />
          <div>
            <strong>{bundle.phases.length}</strong>
            <span>能力阶段</span>
          </div>
        </article>
        <article className="roadmap-stat">
          <CheckCircle2 size={22} />
          <div>
            <strong>{completed}</strong>
            <span>已验收月份</span>
          </div>
        </article>
      </section>

      <div className="roadmap-toolbar">
        <label className="search-field">
          <Search size={18} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索月份、知识点、实践或验收"
          />
        </label>
        <span className="quiet-pill">
          <BookOpen size={15} />
          周重点只作节奏建议
        </span>
      </div>

      <section className="monthly-roadmap">
        {filteredPhases.map((phase) =>
          phase.months.length ? (
            <div className="roadmap-phase" key={phase.id}>
              <div className="roadmap-phase-heading">
                <div>
                  <p className="eyebrow">{phase.range}</p>
                  <h2>{phase.title}</h2>
                  <p>{phase.description}</p>
                </div>
              </div>
              <div className="roadmap-month-grid">
                {phase.months.map((month) => {
                  const isCurrent = month.monthKey === currentMonthKey;
                  return (
                    <Link
                      className={cn(
                        "roadmap-month-card",
                        isCurrent && "roadmap-month-card-current"
                      )}
                      key={month.id}
                      to={`/plans/${bundle.plan.slug}/months/${month.monthKey}`}
                    >
                      <div className="roadmap-month-top">
                        <span>{month.month}</span>
                        <StatusBadge status={month.status} />
                      </div>
                      <h3>{month.title}</h3>
                      <p>{month.learning.slice(0, 3).join(" · ")}</p>
                      <div className="roadmap-month-meta">
                        <span>{month.learning.length} 个主题</span>
                        <span>{month.practice.length} 项实践</span>
                        <ArrowRight size={16} />
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          ) : null
        )}
      </section>

      {!filteredPhases.some((phase) => phase.months.length) && (
        <div className="empty-state">
          <h3>没有匹配的月份</h3>
          <p>换一个关键词再试一次。</p>
        </div>
      )}

      <section className="principles-panel panel">
        <div>
          <p className="eyebrow">执行原则</p>
          <h2>这份路线如何避免学成半成品</h2>
        </div>
        <div className="principles-grid">
          {bundle.plan.principles.map((principle, index) => (
            <div key={principle}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <p>{principle}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
