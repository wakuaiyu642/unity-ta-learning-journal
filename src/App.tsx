import {
  Component,
  lazy,
  type ErrorInfo,
  type ReactNode,
  Suspense
} from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { ErrorState, FullPageLoading } from "./components/Feedback";

const DashboardPage = lazy(() =>
  import("./pages/DashboardPage").then((module) => ({
    default: module.DashboardPage
  }))
);
const WeekPage = lazy(() =>
  import("./pages/WeekPage").then((module) => ({
    default: module.WeekPage
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

export function App() {
  return (
    <AppErrorBoundary>
      <Suspense fallback={<FullPageLoading />}>
        <Routes>
          <Route path="/" element={<Navigate to="/plans/unity-ta" replace />} />
          <Route path="/plans/:planSlug" element={<AppShell />}>
            <Route index element={<DashboardPage />} />
            <Route path="weeks/:weekNo?" element={<WeekPage />} />
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
