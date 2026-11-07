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
import { Link } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { useDocumentMeta } from "../lib/meta";
import {
  findRelevantMonth,
  formatDuration,
  getCurrentWeekStart,
  getMonthDateRange,
  getMonthLogs,
  getMonthTone,
  getMonthWeekSlots,
  getPlanStats,
  getReviewForWeek
} from "../lib/date";
import { cn } from "../lib/utils";
import { ProgressRing, StatusBadge } from "../components/UI";

export function DashboardPage() {
  const {
    bundle,
    canEdit,
    cloudMode,
    demoEditing,
    session,
    setDemoEditing
  } = useApp();
  useDocumentMeta("学习记录 · 成长管线", "20 个月成长档案：本月进度、每日打卡与每周复盘");
  if (!bundle) return null;

  const base = `/plans/${bundle.plan.slug}`;
  const stats = getPlanStats(bundle);
  const relevant = findRelevantMonth(bundle.months);
  const month = relevant.month;
  const phase = bundle.phases.find((item) => item.id === month.stageId);
  const monthLogs = getMonthLogs(bundle.dailyLogs, month.id);
  const monthMinutes = monthLogs.reduce((sum, log) => sum + log.minutes, 0);
  const nextMonths = bundle.months
    .filter((item) => item.sortOrder >= month.sortOrder)
    .slice(0, 4);
  const weekSlots = getMonthWeekSlots(
    month,
    bundle.plan.startDate,
    bundle.plan.endDate
  );
  const currentWeekStart = getCurrentWeekStart(month);
  const currentWeek = weekSlots.find(
    (slot) => slot.weekStart === currentWeekStart
  );
  const userId = session?.user.id ?? "local-demo";
  const currentReview = currentWeek
    ? getReviewForWeek(bundle.weeklyReviews, currentWeek.weekStart, userId)
    : null;
  const publishedPortfolio = bundle.portfolio.filter((item) => item.published);
  const portfolioPreview = (
    publishedPortfolio.length ? publishedPortfolio : bundle.portfolio
  ).slice(0, 2);
  const recentLogs = [...bundle.dailyLogs]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 4);

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
          <p className="eyebrow">Unity Technical Artist · 月度主线</p>
          <h1>
            一个月只做清楚：
            <br />
            学什么，做什么，达到什么。
          </h1>
          <p>{bundle.plan.stageGoal}</p>
          <div className="hero-actions">
            <Link
              to={`${base}/months/${month.monthKey}`}
              className="button button-primary"
            >
              打开 {month.month}
              <ArrowRight size={17} />
            </Link>
            <Link to={`${base}/roadmap`} className="button button-on-dark">
              查看全部月度
            </Link>
          </div>
        </div>
        <div className="hero-progress">
          <ProgressRing
            value={stats.completionPercent}
            label={`${stats.completedMonths}/${stats.totalMonths} 月`}
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
            <small>完成月份</small>
            <strong>{stats.completedMonths}</strong>
            <span>共 {stats.totalMonths} 个月</span>
          </div>
        </article>
        <article className="stat-card">
          <span className="stat-icon blue">
            <Layers3 size={20} />
          </span>
          <div>
            <small>周复盘</small>
            <strong>{stats.reviewCount}</strong>
            <span>已留下过程记录</span>
          </div>
        </article>
        <article className="stat-card">
          <span className="stat-icon amber">
            <Clock3 size={20} />
          </span>
          <div>
            <small>累计学习</small>
            <strong>{formatDuration(stats.totalMinutes)}</strong>
            <span>来自每日打卡</span>
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
                  {phase?.title ?? "当前阶段"} · {month.month}
                </p>
                <h2>{month.title}</h2>
                <p>{getMonthDateRange(month).range}</p>
              </div>
              <StatusBadge status={month.status} />
            </div>

            <div className="week-progress-line">
              <span>
                {getMonthTone(month)} · 本月已记录 {monthLogs.length} 天
              </span>
              <strong>{formatDuration(monthMinutes)}</strong>
              <div className="mini-progress">
                <span
                  style={{
                    width: `${Math.min(
                      100,
                      Math.round((monthLogs.length / 20) * 100)
                    )}%`
                  }}
                />
              </div>
            </div>

            <div className="month-focus-grid">
              <article>
                <span>学什么</span>
                <strong>{month.learning.length} 个核心主题</strong>
                <p>{month.learning.slice(0, 3).join("；")}</p>
              </article>
              <article>
                <span>做什么</span>
                <strong>{month.practice.length} 个实践任务</strong>
                <p>{month.practice.slice(0, 3).join("；")}</p>
              </article>
              <article>
                <span>达到什么</span>
                <strong>{month.acceptance.length} 条验收标准</strong>
                <p>{month.acceptance.slice(0, 2).join("；")}</p>
              </article>
            </div>

            <div className="current-week-footer">
              <span>
                <Clock3 size={16} />
                本月累计 {formatDuration(monthMinutes)}
              </span>
              <Link
                to={`${base}/months/${month.monthKey}`}
                className="text-link"
              >
                {canEdit ? "继续记录" : "查看月度计划"}
                <ArrowRight size={16} />
              </Link>
            </div>
          </section>

          <section className="panel">
            <div className="panel-heading compact">
              <div>
                <p className="eyebrow">月度节奏</p>
                <h2>接下来</h2>
              </div>
              <Link to={`${base}/roadmap`} className="text-link">
                全部月份 <ArrowRight size={16} />
              </Link>
            </div>
            <div className="week-strip">
              {nextMonths.map((item, index) => (
                <Link
                  className={cn(
                    "week-strip-item",
                    item.id === month.id && "week-strip-item-active"
                  )}
                  key={item.id}
                  to={`${base}/months/${item.monthKey}`}
                >
                  <span>{item.month}</span>
                  <strong>{item.title}</strong>
                  <small>{index === 0 ? "当前节点" : "月度目标"}</small>
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
            <p className="eyebrow">{phase?.range ?? "当前阶段"}</p>
            <h2>{phase?.title ?? bundle.plan.primaryFocus}</h2>
            <div className="phase-track-list">
              <div>
                <span className="track-dot" style={{ backgroundColor: "#58c4a6" }} />
                <p>{phase?.description}</p>
              </div>
            </div>
          </section>

          <section className="panel">
            <div className="panel-heading compact">
              <h2>本周复盘</h2>
              <BookOpen size={19} />
            </div>
            {currentWeek ? (
              <>
                <p className="quiet-copy">{currentWeek.label}</p>
                <div className="review-preview">
                  <strong>
                    {currentReview ? "本周已有复盘" : "本周还没有复盘"}
                  </strong>
                  <p>
                    {currentReview?.nextFocus ||
                      "记录本周完成、卡点和下周重点，不用于自动完成月份。"}
                  </p>
                </div>
                <Link
                  to={`${base}/months/${month.monthKey}?week=${currentWeek.weekStart}#weekly-reviews`}
                  className="text-link"
                >
                  {currentReview ? "继续修改" : "填写周复盘"}
                  <ArrowRight size={15} />
                </Link>
              </>
            ) : (
              <p className="quiet-copy">当前月份没有可填写的周复盘。</p>
            )}
          </section>

          <section className="panel">
            <div className="panel-heading compact">
              <h2>最近打卡</h2>
              <Link
                to={`${base}/months/${month.monthKey}`}
                className="icon-link"
                aria-label="打开月度记录"
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
        </aside>
      </div>
    </div>
  );
}
