import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes
} from "react";
import { X } from "lucide-react";
import type { ProgressStatus } from "../types";
import { cn, statusLabels } from "../lib/utils";

export function StatusBadge({ status }: { status: ProgressStatus }) {
  return (
    <span className={cn("status-badge", `status-${status}`)}>
      <span className="status-dot" />
      {statusLabels[status]}
    </span>
  );
}

export function ProgressRing({
  value,
  size = 112,
  label
}: {
  value: number;
  size?: number;
  label?: string;
}) {
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;
  return (
    <div className="progress-ring-wrap" style={{ width: size, height: size }}>
      <svg className="progress-ring" viewBox="0 0 100 100" aria-hidden="true">
        <circle className="progress-ring-track" cx="50" cy="50" r={radius} />
        <circle
          className="progress-ring-value"
          cx="50"
          cy="50"
          r={radius}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="progress-ring-label">
        <strong>{value}%</strong>
        {label && <small>{label}</small>}
      </div>
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="page-header">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {description && <p className="page-description">{description}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </header>
  );
}

export function Button({
  variant = "primary",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
}) {
  return (
    <button
      className={cn("button", `button-${variant}`, className)}
      {...props}
    />
  );
}

export function FieldLabel({
  children,
  hint
}: {
  children: ReactNode;
  hint?: string;
}) {
  return (
    <span className="field-label">
      <span>{children}</span>
      {hint && <small>{hint}</small>}
    </span>
  );
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input className="text-input" {...props} />;
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className="text-input text-area" {...props} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className="text-input select-input" {...props} />;
}

export function Modal({
  open,
  title,
  children,
  onClose
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="modal-heading">
          <h2 id="modal-title">{title}</h2>
          <button
            className="icon-button"
            type="button"
            aria-label="关闭"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}
