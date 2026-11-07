export type WeekStatus = "not_started" | "in_progress" | "done" | "deferred";
export type PlanRole = "owner" | "editor" | "viewer";

export interface WeeklyTarget {
  label: string;
  value: string;
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
  weeklyTargets: WeeklyTarget[];
  startDate: string;
  endDate: string;
  isPublic: boolean;
}

export interface PlanTrack {
  id: string;
  key: string;
  label: string;
  shortLabel: string;
  color: string;
  icon: string;
  sortOrder: number;
}

export interface PlanMonthItem {
  id?: string;
  trackKey: string;
  content: string;
}

export interface PlanMonth {
  id: string;
  month: string;
  phaseGoal: string;
  items: PlanMonthItem[];
  sortOrder: number;
}

export interface PlanWeekTask {
  id: string;
  trackKey: string;
  title: string;
  content: string;
  sortOrder: number;
}

export interface PlanWeek {
  id: string;
  weekNo: string;
  weekIndex: number;
  startDate: string;
  endDate: string;
  dateLabel: string;
  theme: string;
  tasks: PlanWeekTask[];
  status: WeekStatus;
  reflection: string;
  updatedAt: string | null;
}

export interface DailyLog {
  id: string;
  planId: string;
  weekId: string;
  userId: string;
  logDate: string;
  minutes: number;
  note: string;
  authorName: string;
  createdAt: string;
}

export interface Attachment {
  id: string;
  planId: string;
  weekId: string;
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
  status: WeekStatus;
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
  tracks: PlanTrack[];
  months: PlanMonth[];
  weeks: PlanWeek[];
  dailyLogs: DailyLog[];
  attachments: Attachment[];
  portfolio: PortfolioItem[];
}

export interface WeekPatch {
  status?: WeekStatus;
  theme?: string;
  reflection?: string;
}

export interface DailyLogInput {
  logDate: string;
  minutes: number;
  note: string;
}

export interface PortfolioPatch {
  status?: WeekStatus;
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

export interface TaskPatch {
  content: string;
}
