import {
  addDays,
  differenceInCalendarDays,
  format,
  parseISO,
  startOfWeek,
  subDays
} from "date-fns";
import type { DailyLog, PlanBundle, PlanWeek } from "../types";

const shanghaiDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Shanghai",
  year: "numeric",
  month: "2-digit",
  day: "2-digit"
});

export const todayInShanghai = () => shanghaiDateFormatter.format(new Date());

export const compareIsoDate = (a: string, b: string) => a.localeCompare(b);

export function findRelevantWeek(
  weeks: PlanWeek[],
  reference = todayInShanghai()
): { week: PlanWeek; state: "upcoming" | "current" | "past" } {
  const current = weeks.find(
    (week) => week.startDate <= reference && week.endDate >= reference
  );
  if (current) return { week: current, state: "current" };
  const upcoming = weeks.find((week) => week.startDate > reference);
  if (upcoming) return { week: upcoming, state: "upcoming" };
  return { week: weeks.at(-1)!, state: "past" };
}

export function getWeekDateRange(week: PlanWeek) {
  const start = parseISO(week.startDate);
  const end = parseISO(week.endDate);
  return {
    start,
    end,
    range: `${format(start, "M月d日")} — ${format(end, "M月d日")}`
  };
}

export function getWeekProgress(week: PlanWeek) {
  const total = Math.max(1, week.tasks.length);
  const statusValue =
    week.status === "done"
      ? total
      : week.status === "in_progress"
        ? Math.min(total - 1, Math.max(1, Math.round(total / 2)))
        : 0;
  return {
    total,
    completed: statusValue,
    percent: Math.round((statusValue / total) * 100)
  };
}

export function getPlanStats(bundle: PlanBundle) {
  const totalWeeks = bundle.weeks.length;
  const completedWeeks = bundle.weeks.filter(
    (week) => week.status === "done"
  ).length;
  const inProgressWeeks = bundle.weeks.filter(
    (week) => week.status === "in_progress"
  ).length;
  const deferredWeeks = bundle.weeks.filter(
    (week) => week.status === "deferred"
  ).length;
  const totalMinutes = bundle.dailyLogs.reduce(
    (sum, log) => sum + log.minutes,
    0
  );
  const remainingWeeks = totalWeeks - completedWeeks - deferredWeeks;
  const completionPercent = totalWeeks
    ? Math.round((completedWeeks / totalWeeks) * 100)
    : 0;

  return {
    totalWeeks,
    completedWeeks,
    inProgressWeeks,
    deferredWeeks,
    remainingWeeks,
    totalMinutes,
    completionPercent,
    streak: getCheckInStreak(bundle.dailyLogs)
  };
}

export function getCheckInStreak(logs: DailyLog[]) {
  if (!logs.length) return 0;
  const dates = new Set(logs.map((log) => log.logDate));
  const today = todayInShanghai();
  let cursor = dates.has(today) ? parseISO(today) : subDays(parseISO(today), 1);
  let streak = 0;

  while (dates.has(format(cursor, "yyyy-MM-dd"))) {
    streak += 1;
    cursor = subDays(cursor, 1);
  }

  return streak;
}

export function formatDuration(minutes: number) {
  if (!minutes) return "0 小时";
  const hours = minutes / 60;
  return `${Number.isInteger(hours) ? hours : hours.toFixed(1)} 小时`;
}

export function formatLogDate(date: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "short",
    day: "numeric",
    weekday: "short"
  }).format(parseISO(date));
}

export function getLogsForWeek(logs: DailyLog[], weekId: string) {
  return logs
    .filter((log) => log.weekId === weekId)
    .sort((a, b) => b.logDate.localeCompare(a.logDate));
}

export function getDailyLogForDate(
  logs: DailyLog[],
  weekId: string,
  date: string,
  userId = "local-demo"
) {
  return (
    logs.find(
      (log) =>
        log.weekId === weekId &&
        log.logDate === date &&
        log.userId === userId
    ) ?? null
  );
}

export function getWeekTone(
  week: PlanWeek,
  reference = todayInShanghai()
) {
  const diff = differenceInCalendarDays(parseISO(week.startDate), parseISO(reference));
  if (week.status === "done") return "已于本周完成验收";
  if (week.status === "deferred") return "已顺延，按自己的节奏继续";
  if (diff > 7) return `${diff} 天后开始`;
  if (diff > 0) return `${diff} 天后开始`;
  if (week.endDate < reference) return "这一周已经过去";
  return "正在推进";
}

export function getSuggestedLogDate(week: PlanWeek) {
  const today = todayInShanghai();
  if (today < week.startDate) return week.startDate;
  if (today > week.endDate) return week.endDate;
  return today;
}

export function getMonday(date: string) {
  return format(startOfWeek(parseISO(date), { weekStartsOn: 1 }), "yyyy-MM-dd");
}

export function addDaysIso(date: string, days: number) {
  return format(addDays(parseISO(date), days), "yyyy-MM-dd");
}
