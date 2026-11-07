export type ProgressStatus =
  | "not_started"
  | "in_progress"
  | "done"
  | "deferred";
export type PlanRole = "owner" | "editor" | "viewer";

export interface PlanPhase {
  id: string;
  title: string;
  range: string;
  description: string;
}

export interface PlanReference {
  label: string;
  href: string;
}

export interface Plan {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  periodLabel: string;
  primaryFocus: string;
  supportingFocus: string;
  stageGoal: string;
  principle: string;
  principles: string[];
  weeklyTargets: Array<{ label: string; value: string }>;
  startDate: string;
  endDate: string;
  isPublic: boolean;
}

export interface PlanMonth {
  id: string;
  month: string;
  monthKey: string;
  stageId: string;
  title: string;
  startDate: string;
  endDate: string;
  status: ProgressStatus;
  completedAt: string | null;
  sortOrder: number;
  learning: string[];
  practice: string[];
  weeklyFocus: string[];
  acceptance: string[];
  pitfalls: string[];
  references: PlanReference[];
  resumeEvidence: string[];
}

export interface DailyLog {
  id: string;
  planId: string;
  monthId: string;
  userId: string;
  logDate: string;
  minutes: number;
  note: string;
  authorName: string;
  createdAt: string;
}

export interface WeeklyReview {
  id: string;
  planId: string;
  userId: string;
  weekStart: string;
  weekEnd: string;
  completed: string;
  blockers: string;
  nextFocus: string;
  authorName: string;
  createdAt: string;
  updatedAt: string;
}

export interface Attachment {
  id: string;
  planId: string;
  monthId: string;
  storagePath: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  uploadedBy: string;
  url: string | null;
  createdAt: string;
}

export interface PortfolioItem {
  id: string;
  code: string;
  title: string;
  summary: string;
  acceptance: string;
  status: ProgressStatus;
  completedOn: string | null;
  notes: string;
  demoUrl: string;
  repoUrl: string;
  coverUrl: string;
  techStack: string[];
  published: boolean;
  sortOrder: number;
}

export interface PlanMember {
  planId: string;
  userId: string;
  email: string | null;
  displayName: string | null;
  role: PlanRole;
  createdAt: string;
}

export interface PlanBundle {
  plan: Plan;
  phases: PlanPhase[];
  months: PlanMonth[];
  dailyLogs: DailyLog[];
  weeklyReviews: WeeklyReview[];
  attachments: Attachment[];
  portfolio: PortfolioItem[];
}

export interface MonthPatch {
  status?: ProgressStatus;
  completedAt?: string | null;
  title?: string;
  learning?: string[];
  practice?: string[];
  weeklyFocus?: string[];
  acceptance?: string[];
  pitfalls?: string[];
  references?: PlanReference[];
  resumeEvidence?: string[];
}

export interface DailyLogInput {
  logDate: string;
  minutes: number;
  note: string;
}

export interface WeeklyReviewInput {
  weekStart: string;
  weekEnd: string;
  completed: string;
  blockers: string;
  nextFocus: string;
}

export interface PortfolioPatch {
  status?: ProgressStatus;
  title?: string;
  summary?: string;
  acceptance?: string;
  completedOn?: string | null;
  notes?: string;
  demoUrl?: string;
  repoUrl?: string;
  coverUrl?: string;
  techStack?: string[];
  published?: boolean;
}
