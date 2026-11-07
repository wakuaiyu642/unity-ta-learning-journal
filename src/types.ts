export type ProgressStatus =
  | "not_started"
  | "in_progress"
  | "done"
  | "deferred";
export type PlanRole = "owner" | "editor" | "viewer";

/** 作品/能力的真实完成度，用于面试时诚实标注。 */
export type EvidenceLevel = "learning" | "guided" | "independent" | "reusable";

/** 个人能力自评等级：以“能否脱离教程独立复现”为准。 */
export type ProfileSkillLevel =
  | "aware"
  | "guided"
  | "independent"
  | "explainable";

export interface ProfileSkill {
  name: string;
  level: ProfileSkillLevel;
  note: string;
}

export interface ProfileLink {
  githubUrl: string;
  email: string;
  resumeUrl: string;
  websiteUrl: string;
  showEmail: boolean;
}

export interface PlanProfile {
  planId: string;
  displayName: string;
  headline: string;
  avatarUrl: string;
  location: string;
  school: string;
  major: string;
  degree: string;
  grade: string;
  graduationYear: number | null;
  targetRole: string;
  targetCompanies: string;
  bio: string;
  selfPositioning: string;
  honestyNote: string;
  skills: ProfileSkill[];
  highlights: string[];
  links: ProfileLink;
  updatedAt: string;
}

export type ProfilePatch = Partial<
  Omit<PlanProfile, "planId" | "updatedAt">
>;

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
  /** 本月唯一交付物：必须可演示、可链接或可运行。 */
  deliverable: string;
  /** 独立完成门槛：无教程复现、口述讲解、Git 记录等。 */
  evidenceGate: string;
  /** 本月预计投入小时数（单月预算）。 */
  estimatedHours: number;
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
  evidenceLevel: EvidenceLevel;
  aiAssisted: boolean;
  perfNotes: string;
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
  profile: PlanProfile;
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
  evidenceLevel?: EvidenceLevel;
  aiAssisted?: boolean;
  perfNotes?: string;
  published?: boolean;
}
