import {
  Component,
  lazy,
  type ErrorInfo,
  type ReactNode,
  Suspense
} from "react";
import { Navigate, Route, Routes, useParams } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { ErrorState, FullPageLoading } from "./components/Feedback";

const DashboardPage = lazy(() =>
  import("./pages/DashboardPage").then((module) => ({
    default: module.DashboardPage
  }))
);
const MonthPage = lazy(() =>
  import("./pages/MonthPage").then((module) => ({
    default: module.MonthPage
  }))
);
const RoadmapPage = lazy(() =>
  import("./pages/RoadmapPage").then((module) => ({
    default: module.RoadmapPage
  }))
);
const PortfolioPage = lazy(() =>
  import("./pages/PortfolioPage").then((module) => ({
    default: module.PortfolioPage
  }))
);
const CollaboratorsPage = lazy(() =>
  import("./pages/CollaboratorsPage").then((module) => ({
    default: module.CollaboratorsPage
  }))
);

class AppErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <ErrorState>
          页面遇到意外错误：{this.state.error.message}
        </ErrorState>
      );
    }
    return this.props.children;
  }
}

function LegacyWeekRedirect() {
  const { planSlug = "unity-ta", weekNo = "W01" } = useParams();
  const number = Number(weekNo.replace(/\D/g, "")) || 1;
  const date = new Date("2026-11-09T00:00:00Z");
  date.setUTCDate(date.getUTCDate() + (number - 1) * 7);
  const monthKey = date.toISOString().slice(0, 7);
  return (
    <Navigate
      to={`/plans/${planSlug}/months/${monthKey}`}
      replace
    />
  );
}

export function App() {
  return (
    <AppErrorBoundary>
      <Suspense fallback={<FullPageLoading />}>
        <Routes>
          <Route path="/" element={<Navigate to="/plans/unity-ta" replace />} />
          <Route path="/plans/:planSlug" element={<AppShell />}>
            <Route index element={<DashboardPage />} />
            <Route path="months/:monthKey" element={<MonthPage />} />
            <Route path="weeks/:weekNo?" element={<LegacyWeekRedirect />} />
            <Route path="roadmap" element={<RoadmapPage />} />
            <Route path="portfolio" element={<PortfolioPage />} />
            <Route path="collaborators" element={<CollaboratorsPage />} />
          </Route>
          <Route
            path="*"
            element={<Navigate to="/plans/unity-ta" replace />}
          />
        </Routes>
      </Suspense>
    </AppErrorBoundary>
  );
}
