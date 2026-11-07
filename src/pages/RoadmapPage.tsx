import { useMemo, useState } from "react";
import {
  CalendarRange,
  CheckCircle2,
  ChevronRight,
  Search,
  Target
} from "lucide-react";
import { useApp } from "../context/AppContext";
import { todayInShanghai } from "../lib/date";
import { cn, getTrackColor } from "../lib/utils";
import { PageHeader, StatusBadge } from "../components/UI";

export function RoadmapPage() {
  const { bundle } = useApp();
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<string[]>([]);
  const months = bundle?.months ?? [];
  const todayMonth = todayInShanghai().slice(0, 7).replace("-", ".");
  const filteredMonths = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return months;
    return months.filter((month) =>
      [
        month.month,
        month.phaseGoal,
        ...month.items.map((item) => item.content)
      ]
        .join(" ")
        .toLowerCase()
        .includes(keyword)
    );
  }, [months, query]);
  const projectMilestones = months.filter(
    (month) =>
      month.phaseGoal.includes("作品") ||
      month.phaseGoal.includes("投递") ||
      month.phaseGoal.includes("就业")
  );

  if (!bundle) return null;

  const toggleMonth = (monthId: string) => {
    setExpanded((current) =>
      current.includes(monthId)
        ? current.filter((id) => id !== monthId)
        : [...current, monthId]
    );
  };

  return (
    <div>
      <PageHeader
        eyebrow="完整学习路线"
        title="从基础原理到可展示的作品"
        description={`${bundle.plan.periodLabel} · ${bundle.months.length} 个阶段月 · ${bundle.weeks.length} 个学习周`}
      />

      <section className="roadmap-overview">
        <article className="roadmap-stat">
          <CalendarRange size={22} />
          <div>
            <strong>{bundle.months.length}</strong>
            <span>阶段月</span>
          </div>
        </article>
        <article className="roadmap-stat">
          <Target size={22} />
          <div>
            <strong>{projectMilestones.length}</strong>
            <span>关键节点</span>
          </div>
        </article>
        <article className="roadmap-stat">
          <CheckCircle2 size={22} />
          <div>
            <strong>
              {bundle.portfolio.filter((item) => item.status === "done").length}
            </strong>
            <span>已验收能力</span>
          </div>
        </article>
      </section>

      <div className="roadmap-toolbar">
        <label className="search-field">
          <Search size={18} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索月份、主题或知识点"
          />
        </label>
        <div className="track-legend">
          {bundle.tracks.map((track) => (
            <span key={track.key}>
              <i style={{ backgroundColor: track.color }} />
              {track.shortLabel}
            </span>
          ))}
        </div>
      </div>

      <section className="timeline" aria-label="月度学习路线">
        {filteredMonths.map((month) => {
          const isCurrent = month.month === todayMonth;
          const isExpanded = expanded.includes(month.id) || isCurrent;
          return (
            <article
              className={cn(
                "timeline-item",
                isCurrent && "timeline-item-current"
              )}
              key={month.id}
            >
              <div className="timeline-marker">
                <span>{month.month.split(".")[1]}</span>
                <small>{month.month.split(".")[0]}</small>
              </div>
              <div className="timeline-card">
                <button
                  type="button"
                  className="timeline-heading"
                  onClick={() => toggleMonth(month.id)}
                  aria-expanded={isExpanded}
                >
                  <div>
                    <span className="month-label">
                      {month.month}
                      {isCurrent && <em>当前阶段</em>}
                    </span>
                    <h2>{month.phaseGoal}</h2>
                  </div>
                  <ChevronRight
                    size={21}
                    className={cn(
                      "timeline-chevron",
                      isExpanded && "timeline-chevron-open"
                    )}
                  />
                </button>
                {isExpanded && (
                  <div className="timeline-details">
                    {month.items.map((item) => {
                      const track = bundle.tracks.find(
                        (candidate) => candidate.key === item.trackKey
                      );
                      return (
                        <div className="timeline-track-row" key={item.trackKey}>
                          <span
                            className="track-dot"
                            style={{
                              backgroundColor: getTrackColor(
                                item.trackKey,
                                bundle.tracks
                              )
                            }}
                          />
                          <strong>{track?.label ?? item.trackKey}</strong>
                          <p>{item.content}</p>
                        </div>
                      );
                    })}
                    <div className="timeline-deliverable">
                      <span>当月验收</span>
                      <p>
                        {
                          month.items.find(
                            (item) => item.trackKey === "practice"
                          )?.content
                        }
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </section>

      {!filteredMonths.length && (
        <div className="empty-state">
          <h3>没有匹配的阶段</h3>
          <p>换一个关键词再试一次。</p>
        </div>
      )}

      <section className="principles-panel panel">
        <div>
          <p className="eyebrow">执行原则</p>
          <h2>这份路线如何保持可执行</h2>
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
