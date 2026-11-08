import {
  ArrowRight,
  CalendarCheck,
  CalendarDays,
  Compass,
  ExternalLink,
  FileText,
  GitBranch,
  GraduationCap,
  Layers3,
  LockKeyhole,
  Mail,
  MapPin,
  Pencil,
  Target
} from "lucide-react";
import { differenceInCalendarDays, format, parseISO } from "date-fns";
import { Link } from "react-router-dom";
import { CheckInCalendar } from "../components/CheckInCalendar";
import { DailyCheckInCard } from "../components/DailyCheckInCard";
import { useApp } from "../context/AppContext";
import { getCheckInState } from "../lib/checkin";
import { SITE } from "../lib/config";
import {
  findRelevantMonth,
  formatDuration,
  getCheckInStreak,
  getMonthLogs,
  getPlanStats,
  todayInShanghai
} from "../lib/date";
import { useDocumentMeta } from "../lib/meta";
import { cn, getInitials, skillLevelLabels } from "../lib/utils";
import type { PlanBundle, ProfileSkillLevel } from "../types";

function SkillBadge({ level }: { level: ProfileSkillLevel }) {
  return (
    <span className={cn("level-badge", `level-${level}`)}>
      {skillLevelLabels[level]}
    </span>
  );
}

export function HomePage() {
  const { bundle } = useApp();
  if (!bundle) return null;
  return <HomePageContent bundle={bundle} />;
}

function HomePageContent({ bundle }: { bundle: PlanBundle }) {
  const {
    canEdit,
    cloudMode,
    demoEditing,
    setDemoEditing
  } = useApp();
  const profile = bundle.profile;
  const base = `/plans/${bundle.plan.slug}`;
  const relevant = findRelevantMonth(bundle.months);
  const month = relevant.month;
  const phase = bundle.phases.find((item) => item.id === month.stageId);
  const stats = getPlanStats(bundle);
  const today = todayInShanghai();
  const checkInState = getCheckInState(bundle.plan);
  const streak = getCheckInStreak(bundle.dailyLogs);
  const todayMinutes = bundle.dailyLogs
    .filter((log) => log.logDate === today)
    .reduce((sum, log) => sum + log.minutes, 0);
  const monthLogs = getMonthLogs(bundle.dailyLogs, month.id);
  const monthCheckInDays = new Set(monthLogs.map((log) => log.logDate)).size;
  const monthMinutes = monthLogs.reduce((sum, log) => sum + log.minutes, 0);
  const daysUntilStart = Math.max(
    0,
    differenceInCalendarDays(parseISO(bundle.plan.startDate), parseISO(today))
  );
  const heroCheckInLine =
    checkInState === "before_start"
      ? `打卡从 ${format(parseISO(bundle.plan.startDate), "M月d日")} 开始 · 还有 ${daysUntilStart} 天`
      : checkInState === "ended"
        ? `计划已结束 · 累计投入 ${formatDuration(stats.totalMinutes)}`
        : todayMinutes > 0
          ? `今天已打卡 ${todayMinutes} 分钟${streak > 0 ? ` · 连续 ${streak} 天` : ""}`
          : `今天还没打卡${streak > 0 ? ` · 连续 ${streak} 天` : ""}`;
  const contactEmail = profile.links.showEmail ? profile.links.email : "";
  const initials =
    profile.displayName.length > 0 && profile.displayName.length <= 2
      ? profile.displayName
      : getInitials(profile.displayName || SITE.glyph);

  useDocumentMeta(
    `${profile.displayName} · ${SITE.name}`,
    profile.headline || profile.bio
  );

  return (
    <div className="home-page">
      {!cloudMode && !demoEditing && (
        <div className="mode-banner">
          <LockKeyhole size={18} />
          <div>
            <strong>当前是公开浏览模式</strong>
            <span>
              首页资料保存在这个浏览器中。想体验编辑个人资料，请打开右上角开关进入演示编辑。
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

      <section className="home-hero">
        <div className="home-hero-grid" aria-hidden="true" />
        <div
          className="home-hero-texture"
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: `url(${import.meta.env.BASE_URL}media/hero-texture.svg)`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            opacity: 0.35,
            pointerEvents: "none"
          }}
        />
        <div className="home-hero-avatar">
          {profile.avatarUrl ? (
            <img src={profile.avatarUrl} alt={`${profile.displayName} 的头像`} />
          ) : (
            <span>{initials}</span>
          )}
        </div>
        <div className="home-hero-main">
          <p className="eyebrow">
            {SITE.englishName} · {SITE.tagline}
          </p>
          <h1>{profile.displayName}</h1>
          <p className="home-headline">{profile.headline}</p>
          <p className="home-bio">{profile.bio}</p>
          <div className="home-hero-actions">
            <Link to={`${base}/portfolio`} className="button button-primary">
              查看作品集 <ArrowRight size={17} />
            </Link>
            <a className="button button-on-dark" href="#daily-checkin">
              <CalendarCheck size={16} /> 去打卡
            </a>
            {profile.links.resumeUrl && (
              <a
                className="button button-on-dark"
                href={profile.links.resumeUrl}
                target="_blank"
                rel="noreferrer"
              >
                <FileText size={16} /> 下载简历
              </a>
            )}
            {canEdit && (
              <Link to={`${base}/profile/edit`} className="button button-ghost-light">
                <Pencil size={16} /> 编辑资料
              </Link>
            )}
          </div>
          <div className="home-contact">
            {profile.links.githubUrl && (
              <a href={profile.links.githubUrl} target="_blank" rel="noreferrer">
                <GitBranch size={16} /> GitHub
              </a>
            )}
            {contactEmail && (
              <a href={`mailto:${contactEmail}`}>
                <Mail size={16} /> {contactEmail}
              </a>
            )}
            {profile.location && (
              <span>
                <MapPin size={16} /> {profile.location}
              </span>
            )}
            <span className={cn("env-pill", cloudMode ? "env-cloud" : "env-local")}>
              <span className="live-dot" />
              {cloudMode ? "云端同步" : "本地演示"}
            </span>
          </div>
        </div>
        <div className="home-hero-side">
          <div className="home-focus-card">
            <p className="eyebrow">核心能力速览</p>
            <div className="tech-stack">
              {profile.skills.slice(0, 3).map((skill) => (
                <span key={skill.name}>
                  {skill.name} · {skillLevelLabels[skill.level]}
                </span>
              ))}
            </div>
            <div className="home-focus-month">
              <CalendarDays size={16} />
              <span>
                当前：{month.month} · {month.title}
              </span>
            </div>
            <div className="home-focus-progress">
              <span>{phase?.title ?? "成长计划"}</span>
              <strong>{stats.completionPercent}%</strong>
            </div>
            <a className="home-focus-checkin" href="#daily-checkin">
              <CalendarDays size={16} />
              <span>{heroCheckInLine}</span>
            </a>
            <div className="form-actions">
              <Link to={`${base}/portfolio`} className="text-link">
                作品集 <ArrowRight size={15} />
              </Link>
              <Link to={`${base}/journal`} className="text-link">
                学习记录 <ArrowRight size={15} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="panel home-checkin" id="daily-checkin">
        <div className="home-checkin-heading">
          <div>
            <p className="eyebrow">每日打卡</p>
            <h2>今天学了多少，留下证据</h2>
            <p className="home-checkin-lede">
              每天记录学习时长、卡点和打卡照片。打卡只记录过程，不会自动完成本月。
            </p>
          </div>
          <div className="home-checkin-stats">
            <span>
              <strong>{streak}</strong> 连续天数
            </span>
            <span>
              <strong>{monthCheckInDays}</strong> 本月打卡
            </span>
            <span>
              <strong>{formatDuration(monthMinutes)}</strong> 本月时长
            </span>
          </div>
        </div>
        <div className="home-checkin-grid">
          {checkInState === "active" ? (
            <DailyCheckInCard month={month} date={today} />
          ) : (
            <div
              className={cn(
                "checkin-locked",
                checkInState === "ended" && "checkin-locked-ended"
              )}
            >
              {checkInState === "before_start" ? (
                <>
                  <span className="checkin-locked-icon">
                    <CalendarDays size={22} />
                  </span>
                  <p className="eyebrow">开营倒计时</p>
                  <h3>
                    计划 {format(parseISO(bundle.plan.startDate), "M月d日")} 开始
                  </h3>
                  <div className="checkin-locked-count">
                    <strong>{daysUntilStart}</strong>
                    <span>天后开营</span>
                  </div>
                  <p>开营前可以先回顾计划，打卡表单会在开营后出现。</p>
                  <p className="quiet-copy">
                    日历已经可以查看：开营后每天都能在这里留下记录。
                  </p>
                </>
              ) : (
                <>
                  <span className="checkin-locked-icon">
                    <LockKeyhole size={22} />
                  </span>
                  <p className="eyebrow">只读</p>
                  <h3>计划已结束</h3>
                  <p>
                    计划周期已走完，打卡记录和照片保留为只读，不再接受新的打卡。
                  </p>
                  <p className="quiet-copy">
                    累计投入 {formatDuration(stats.totalMinutes)}，完成{" "}
                    {stats.completedMonths} / {stats.totalMonths} 个月验收。
                  </p>
                </>
              )}
            </div>
          )}
          <CheckInCalendar
            months={bundle.months}
            logs={bundle.dailyLogs}
            attachments={bundle.attachments}
            initialMonthId={month.id}
          />
        </div>
      </section>

      <section className="panel home-about">
        <div className="panel-heading compact">
          <div>
            <p className="eyebrow">关于我</p>
            <h2>背景与求职方向</h2>
          </div>
          <GraduationCap size={20} />
        </div>
        <div className="home-about-grid">
          <div>
            <span className="home-about-label">学校 / 专业</span>
            <strong>
              {profile.school ? `${profile.school} · ${profile.major}` : profile.major}
            </strong>
            <span className="home-about-label">年级 / 毕业年份</span>
            <strong>
              {profile.grade}
              {profile.graduationYear ? ` · ${profile.graduationYear} 届` : ""}
              {profile.degree ? ` · ${profile.degree}` : ""}
            </strong>
          </div>
          <div>
            <span className="home-about-label">求职方向</span>
            <strong>{profile.targetRole}</strong>
            {profile.targetCompanies && (
              <>
                <span className="home-about-label">目标公司 / 团队</span>
                <strong>{profile.targetCompanies}</strong>
              </>
            )}
            <span className="home-about-label">当前专注</span>
            <strong>{bundle.plan.primaryFocus}</strong>
            <span className="home-about-label">同时补</span>
            <strong>{bundle.plan.supportingFocus}</strong>
          </div>
        </div>
        <div className="honesty-note">
          <Target size={18} />
          <p>
            <strong>自我定位：</strong>
            {profile.selfPositioning}
          </p>
        </div>
      </section>

      <section className="panel home-skills">
        <div className="panel-heading compact">
          <div>
            <p className="eyebrow">能力自评</p>
            <h2>按“能否独立复现”标注</h2>
          </div>
          <Layers3 size={20} />
        </div>
        <p className="home-skills-legend">
          等级含义：{skillLevelLabels.aware} → {skillLevelLabels.guided} →{" "}
          {skillLevelLabels.independent} → {skillLevelLabels.explainable}。
          {profile.honestyNote}
        </p>
        <div className="skills-grid">
          {profile.skills.map((skill) => (
            <article className="skill-card" key={skill.name}>
              <div className="skill-card-top">
                <strong>{skill.name}</strong>
                <SkillBadge level={skill.level} />
              </div>
              <p>{skill.note}</p>
            </article>
          ))}
        </div>
        {profile.highlights.length > 0 && (
          <div className="home-highlights">
            <span className="home-about-label">学习亮点</span>
            <ul>
              {profile.highlights.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className="panel home-roadmap">
        <div className="panel-heading compact">
          <div>
            <p className="eyebrow">成长路线</p>
            <h2>5 阶段成长规划</h2>
          </div>
          <Link to={`${base}/roadmap`} className="text-link">
            完整路线 <ArrowRight size={16} />
          </Link>
        </div>
        <div className="home-phase-list">
          {bundle.phases.map((item, index) => {
            const active = item.id === phase?.id;
            return (
              <div
                className={cn("home-phase-item", active && "home-phase-item-active")}
                key={item.id}
              >
                <span className="home-phase-index">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div>
                  <strong>{item.title}</strong>
                  <small>{item.range}</small>
                  <p>{item.description}</p>
                </div>
                {active && <span className="home-phase-current">当前</span>}
              </div>
            );
          })}
        </div>
        <div className="home-roadmap-footer">
          <Link to={`${base}/journal`} className="text-link">
            <Compass size={16} /> 学习记录与月度复盘
          </Link>
          <span className="quiet-pill">周复盘只记录过程，不自动完成月份</span>
        </div>
      </section>

      <footer className="home-footer">
        <div>
          <strong>
            {SITE.name} · {SITE.englishName}
          </strong>
          <p>
            {profile.honestyNote} 本站用于记录学习过程与作品，不代表已达到岗位要求。
          </p>
        </div>
        <div className="home-footer-links">
          {profile.links.githubUrl && (
            <a href={profile.links.githubUrl} target="_blank" rel="noreferrer">
              <GitBranch size={16} /> GitHub
            </a>
          )}
          {profile.links.websiteUrl && (
            <a href={profile.links.websiteUrl} target="_blank" rel="noreferrer">
              <ExternalLink size={16} /> 个人网站
            </a>
          )}
          {contactEmail && (
            <a href={`mailto:${contactEmail}`}>
              <Mail size={16} /> 联系我
            </a>
          )}
          {canEdit && (
            <Link to={`${base}/profile/edit`}>
              <Pencil size={16} /> 编辑资料
            </Link>
          )}
        </div>
      </footer>
    </div>
  );
}
