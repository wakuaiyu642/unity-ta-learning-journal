import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock3,
  Flame,
  Layers3,
  LockKeyhole,
  Pencil,
  Sparkles
} from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { useApp } from "../context/AppContext";
import {
  findRelevantWeek,
  formatDuration,
  getPlanStats,
  getWeekDateRange,
  getWeekTone,
  getWeekProgress,
  todayInShanghai
} from "../lib/date";
import {
  cn,
  getDuplicateWeekThemes,
  getTrackColor,
  statusLabels
} from "../lib/utils";
import { ProgressRing, StatusBadge } from "../components/UI";

export function DashboardPage() {
  const { bundle, canEdit, cloudMode, demoEditing, setDemoEditing } = useApp();
  if (!bundle) return null;

  const base = `/plans/${bundle.plan.slug}`;
  const stats = getPlanStats(bundle);
  const relevant = findRelevantWeek(bundle.weeks);
  const week = relevant.week;
  const weekProgress = getWeekProgress(week);
  const weekLogs = bundle.dailyLogs.filter((log) => log.weekId === week.id);
  const weekMinutes = weekLogs.reduce((sum, log) => sum + log.minutes, 0);
  const nextWeeks = bundle.weeks
    .filter((item) => item.weekIndex >= week.weekIndex)
    .slice(0, 4);
  const currentMonth =
    bundle.months.find((month) => {
      const today = todayInShanghai().slice(0, 7).replace("-", ".");
      return month.month === today;
    }) ??
    bundle.months.find((month) => month.month >= todayInShanghai().slice(0, 7).replace("-", ".")) ??
    bundle.months.at(-1)!;
  const recentLogs = [...bundle.dailyLogs]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 4);
  const publishedPortfolio = bundle.portfolio.filter((item) => item.published);
  const portfolioPreview = (
    publishedPortfolio.length ? publishedPortfolio : bundle.portfolio
  ).slice(0, 2);
  const duplicateThemes = getDuplicateWeekThemes(bundle.weeks);

  return (
    <div className="dashboard">
      {!cloudMode && !demoEditing && (
        <div className="mode-banner">
          <LockKeyhole size={18} />
          <div>
            <strong>当前是公开浏览模式</strong>
            <span>
              数据保存在这个浏览器中。想体验编辑、打卡和上传，请打开右上角“本地演示编辑”。
            </span>
          </div>
          <button
            className="button button-secondary button-small"
            onClick={() => setDemoEditing(true)}
          >
            <Pencil size={15} />
            开始体验
          </button>
        </div>
      )}

      <section className="hero-panel">
        <div className="hero-grid-pattern" aria-hidden="true" />
        <div className="hero-copy">
          <p className="eyebrow">Unity Technical Artist · 2026—2028</p>
          <h1>
            把漫长的学习，
            <br />
            变成一周一周的进展。
          </h1>
          <p>
            {bundle.plan.stageGoal}
          </p>
          <div className="hero-actions">
            <Link
              to={`${base}/weeks/${week.weekNo}`}
              className="button button-primary"
            >
              打开 {week.weekNo}
              <ArrowRight size={17} />
            </Link>
            <Link to={`${base}/roadmap`} className="button button-on-dark">
              查看完整路线
            </Link>
          </div>
        </div>
        <div className="hero-progress">
          <ProgressRing
            value={stats.completionPercent}
            label={`${stats.completedWeeks}/${stats.totalWeeks} 周`}
            size={156}
          />
          <span>整体学习进度</span>
        </div>
      </section>

      <section className="stats-grid" aria-label="学习统计">
        <article className="stat-card">
          <span className="stat-icon mint">
            <CheckCircle2 size={20} />
          </span>
          <div>
            <small>完成周数</small>
            <strong>{stats.completedWeeks}</strong>
            <span>共 {stats.totalWeeks} 周</span>
          </div>
        </article>
        <article className="stat-card">
          <span className="stat-icon blue">
            <Layers3 size={20} />
          </span>
          <div>
            <small>进行中</small>
            <strong>{stats.inProgressWeeks}</strong>
            <span>保持持续投入</span>
          </div>
        </article>
        <article className="stat-card">
          <span className="stat-icon amber">
            <Clock3 size={20} />
          </span>
          <div>
            <small>累计学习</small>
            <strong>{formatDuration(stats.totalMinutes)}</strong>
            <span>来自每日记录</span>
          </div>
        </article>
        <article className="stat-card">
          <span className="stat-icon rose">
            <Flame size={20} />
          </span>
          <div>
            <small>连续打卡</small>
            <strong>{stats.streak} 天</strong>
            <span>{stats.streak ? "继续保持节奏" : "从今天开始"}</span>
          </div>
        </article>
      </section>

      <div className="dashboard-columns">
        <div className="dashboard-main-column">
          <section className="panel current-week-panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">
                  {relevant.state === "upcoming"
                    ? "下一周"
                    : relevant.state === "current"
                      ? "本周进行中"
                      : "最近一周"}
                </p>
                <h2>
                  {week.weekNo} · {week.theme}
                </h2>
                <p>{getWeekDateRange(week).range}</p>
              </div>
              <StatusBadge status={week.status} />
            </div>

            <div className="week-progress-line">
              <span>
                {getWeekTone(week)} · {statusLabels[week.status]}
              </span>
              <strong>{weekProgress.percent}%</strong>
              <div className="mini-progress">
                <span style={{ width: `${weekProgress.percent}%` }} />
              </div>
            </div>

            <div className="task-preview-list">
              {week.tasks.map((task) => (
                <div className="task-preview" key={task.id}>
                  <span
                    className="track-mark"
                    style={{
                      backgroundColor: getTrackColor(
                        task.trackKey,
                        bundle.tracks
                      )
                    }}
                  />
                  <div>
                    <strong>{task.title}</strong>
                    <p>{task.content}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="current-week-footer">
              <span>
                <Clock3 size={16} />
                本周累计 {formatDuration(weekMinutes)}
              </span>
              <Link
                to={`${base}/weeks/${week.weekNo}`}
                className="text-link"
              >
                {canEdit ? "继续记录" : "查看本周任务"}
                <ArrowRight size={16} />
              </Link>
            </div>
          </section>

          <section className="panel">
            <div className="panel-heading compact">
              <div>
                <p className="eyebrow">接下来</p>
                <h2>学习节奏</h2>
              </div>
              <Link to={`${base}/weeks`} className="text-link">
                全部周次 <ArrowRight size={16} />
              </Link>
            </div>
            <div className="week-strip">
              {nextWeeks.map((item, index) => (
                <Link
                  className={cn(
                    "week-strip-item",
                    item.id === week.id && "week-strip-item-active"
                  )}
                  key={item.id}
                  to={`${base}/weeks/${item.weekNo}`}
                >
                  <span>{item.weekNo}</span>
                  <strong>{item.theme}</strong>
                  <small>{index === 0 ? "当前节点" : item.dateLabel}</small>
                </Link>
              ))}
            </div>
          </section>

          <section className="panel portfolio-preview-panel">
            <div className="panel-heading compact">
              <div>
                <p className="eyebrow">作品与能力</p>
                <h2>用项目证明掌握</h2>
              </div>
              <Link to={`${base}/portfolio`} className="text-link">
                验收看板 <ArrowRight size={16} />
              </Link>
            </div>
            <div className="portfolio-preview-grid">
              {portfolioPreview.map((item, index) => (
                <article className="portfolio-mini-card" key={item.id}>
                  <div
                    className={cn(
                      "portfolio-mini-art",
                      index === 1 && "portfolio-mini-art-alt"
                    )}
                  >
                    <span>{item.code || "能力模块"}</span>
                    <Sparkles size={30} />
                  </div>
                  <div>
                    <StatusBadge status={item.status} />
                    <h3>{item.title}</h3>
                    <p>{item.summary}</p>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>

        <aside className="dashboard-side-column">
          <section className="panel phase-panel">
            <p className="eyebrow">当前阶段 · {currentMonth.month}</p>
            <h2>{currentMonth.phaseGoal}</h2>
            <div className="phase-track-list">
              {currentMonth.items.slice(0, 3).map((item) => (
                <div key={item.trackKey}>
                  <span
                    className="track-dot"
                    style={{
                      backgroundColor: getTrackColor(
                        item.trackKey,
                        bundle.tracks
                      )
                    }}
                  />
                  <p>{item.content}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="panel">
            <div className="panel-heading compact">
              <h2>每周投入</h2>
              <BookOpen size={19} />
            </div>
            <div className="target-list">
              {bundle.plan.weeklyTargets.map((target) => (
                <div key={target.label}>
                  <span>{target.label}</span>
                  <strong>{target.value}</strong>
                </div>
              ))}
            </div>
          </section>

          <section className="panel">
            <div className="panel-heading compact">
              <h2>最近打卡</h2>
              <Link
                to={`${base}/weeks/${week.weekNo}`}
                className="icon-link"
                aria-label="打开本周记录"
              >
                <ArrowRight size={18} />
              </Link>
            </div>
            {recentLogs.length ? (
              <div className="recent-log-list">
                {recentLogs.map((log) => (
                  <div key={log.id}>
                    <span className="log-dot" />
                    <div>
                      <strong>
                        {log.logDate} · {formatDuration(log.minutes)}
                      </strong>
                      <p>{log.note || "完成今日学习记录"}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="quiet-empty">
                <Flame size={22} />
                <p>还没有每日记录。今天投入了多少分钟？</p>
              </div>
            )}
          </section>

          {duplicateThemes.length > 0 && (
            <details className="data-note">
              <summary>数据说明 · {duplicateThemes.length} 组重复主题</summary>
              <p>
                原始规划中有部分周主题连续重复，可能与练习缓冲或内容设置有关。网页保留原始数据，没有自动合并：
              </p>
              <p>
                {duplicateThemes
                  .map((item) => `${item.weeks.join(" / ")} ${item.theme}`)
                  .join("；")}
              </p>
            </details>
          )}
        </aside>
      </div>
    </div>
  );
}
