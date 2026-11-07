import type { ReactNode } from "react";
import { AlertCircle, LoaderCircle } from "lucide-react";

export function Spinner({ label = "加载中" }: { label?: string }) {
  return (
    <span className="spinner">
      <LoaderCircle size={17} className="spin" />
      <span>{label}</span>
    </span>
  );
}

export function FullPageLoading() {
  return (
    <div className="center-state">
      <span className="brand-glyph" aria-hidden="true">
        TA
      </span>
      <Spinner label="正在加载学习计划" />
    </div>
  );
}

export function ErrorState({
  title = "页面暂时无法加载",
  children
}: {
  title?: string;
  children: ReactNode;
}) {
  return (
    <div className="center-state center-state-error">
      <AlertCircle size={28} />
      <h1>{title}</h1>
      <p>{children}</p>
      <button className="button button-primary" onClick={() => location.reload()}>
        重新加载
      </button>
    </div>
  );
}

export function EmptyState({
  title,
  children
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="empty-state">
      <span aria-hidden="true">· · ·</span>
      <h3>{title}</h3>
      <p>{children}</p>
    </div>
  );
}
