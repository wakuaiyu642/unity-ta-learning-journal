import { useState } from "react";
import {
  BookOpenCheck,
  CalendarDays,
  Compass,
  Home,
  LockKeyhole,
  LogIn,
  LogOut,
  Menu,
  Pencil,
  Settings2,
  Shapes,
  X
} from "lucide-react";
import { NavLink, Outlet, useParams } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { cn } from "../lib/utils";
import { AuthDialog } from "./AuthDialog";
import { ErrorState, FullPageLoading } from "./Feedback";
import { findRelevantMonth } from "../lib/date";

const navItems = [
  { to: "", label: "概览", icon: Home, end: true },
  { to: "months", label: "本月", icon: CalendarDays },
  { to: "roadmap", label: "路线", icon: Compass },
  { to: "portfolio", label: "作品集", icon: Shapes },
  { to: "collaborators", label: "协作者", icon: Settings2 }
];

export function AppShell() {
  const { planSlug = "unity-ta" } = useParams();
  const {
    bundle,
    isLoading,
    loadError,
    cloudMode,
    session,
    role,
    canEdit,
    demoEditing,
    setDemoEditing,
    signOut
  } = useApp();
  const [authOpen, setAuthOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (isLoading) return <FullPageLoading />;
  if (loadError) {
    return (
      <ErrorState title="学习计划加载失败">
        {loadError}
        {!cloudMode && (
          <span className="block-note">
            如果没有配置 Supabase，页面会使用浏览器本地数据。
          </span>
        )}
      </ErrorState>
    );
  }
  if (!bundle) return null;

  const base = `/plans/${planSlug}`;
  const currentMonthKey = findRelevantMonth(bundle.months).month.monthKey;
  const routeFor = (path: string) =>
    path === "months"
      ? `${base}/months/${currentMonthKey}`
      : path
        ? `${base}/${path}`
        : base;
  const accountLabel = cloudMode
    ? session
      ? role === "owner"
        ? "所有者"
        : role === "editor"
          ? "编辑者"
          : "已登录"
      : "登录"
    : demoEditing
      ? "演示编辑"
      : "公开浏览";

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <NavLink to={base} className="brand">
          <span className="brand-glyph">TA</span>
          <span>
            <strong>My TA Journey</strong>
            <small>Learn · build · ship</small>
          </span>
        </NavLink>

        <nav className="side-nav" aria-label="主要导航">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={routeFor(item.to)}
              end={item.end}
              className={({ isActive }) =>
                cn("nav-item", isActive && "nav-item-active")
              }
            >
              <item.icon size={19} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className={cn("env-pill", cloudMode ? "env-cloud" : "env-local")}>
            <span className="live-dot" />
            {cloudMode ? "云端同步" : "本地演示"}
          </div>
          <p>
            {cloudMode
              ? "进度会同步到你的 Supabase 项目。"
              : "当前修改只保存在这个浏览器中。"}
          </p>
        </div>
      </aside>

      <div className="app-main">
        <header className="topbar">
          <button
            className="icon-button mobile-menu-button"
            onClick={() => setMobileMenuOpen((open) => !open)}
            aria-label={mobileMenuOpen ? "关闭菜单" : "打开菜单"}
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
          <NavLink to={base} className="mobile-brand">
            <span className="brand-glyph small">TA</span>
            <strong>My TA Journey</strong>
          </NavLink>
          <div className="topbar-spacer" />

          {!cloudMode && (
            <button
              className={cn(
                "account-chip",
                demoEditing && "account-chip-active"
              )}
              type="button"
              onClick={() => setDemoEditing(!demoEditing)}
              title={
                demoEditing ? "退出演示编辑模式" : "进入本地演示编辑模式"
              }
            >
              {demoEditing ? <Pencil size={16} /> : <LockKeyhole size={16} />}
              <span>{accountLabel}</span>
            </button>
          )}

          {cloudMode && !session && (
            <button
              className="account-chip"
              type="button"
              onClick={() => setAuthOpen(true)}
            >
              <LogIn size={16} />
              <span>登录编辑</span>
            </button>
          )}

          {cloudMode && session && (
            <div className="account-session">
              <span className="account-avatar">
                {session.user.email?.[0]?.toUpperCase() ?? "U"}
              </span>
              <span className="account-copy">
                <strong>{accountLabel}</strong>
                <small>{session.user.email}</small>
              </span>
              <button
                className="icon-button"
                onClick={() => void signOut()}
                title="退出登录"
                aria-label="退出登录"
              >
                <LogOut size={17} />
              </button>
            </div>
          )}

          {canEdit && (
            <span className="edit-mode-pill">
              <BookOpenCheck size={15} />
              可编辑
            </span>
          )}
        </header>

        {mobileMenuOpen && (
          <nav className="mobile-drawer" aria-label="移动端导航">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={routeFor(item.to)}
                end={item.end}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  cn("nav-item", isActive && "nav-item-active")
                }
              >
                <item.icon size={19} />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>
        )}

        <main className="page-content">
          <Outlet />
        </main>

        <nav className="bottom-nav" aria-label="移动端主要导航">
          {navItems.slice(0, 4).map((item) => (
            <NavLink
              key={item.to}
              to={routeFor(item.to)}
              end={item.end}
              className={({ isActive }) =>
                cn("bottom-nav-item", isActive && "bottom-nav-item-active")
              }
            >
              <item.icon size={21} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
      <AuthDialog open={authOpen} onClose={() => setAuthOpen(false)} />
    </div>
  );
}
