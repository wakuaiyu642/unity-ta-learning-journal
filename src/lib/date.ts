import {
  addDays,
  differenceInCalendarDays,
  endOfWeek,
  format,
  parseISO,
  startOfWeek,
  subDays
} from "date-fns";
import type {
  DailyLog,
  PlanBundle,
  PlanMonth,
  WeeklyReview
} from "../types";

const shanghaiDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Shanghai",
  year: "numeric",
  month: "2-digit",
  day: "2-digit"
});

export const todayInShanghai = () => shanghaiDateFormatter.format(new Date());
export const compareIsoDate = (a: string, b: string) => a.localeCompare(b);

export function findRelevantMonth(
  months: PlanMonth[],
  reference = todayInShanghai()
): { month: PlanMonth; state: "upcoming" | "current" | "past" } {
  const current = months.find(
    (month) => month.startDate <= reference && month.endDate >= reference
  );
  if (current) return { month: current, state: "current" };
  const upcoming = months.find((month) => month.startDate > reference);
  if (upcoming) return { month: upcoming, state: "upcoming" };
  return { month: months.at(-1)!, state: "past" };
}

export function getMonthDateRange(month: PlanMonth) {
  const start = parseISO(month.startDate);
  const end = parseISO(month.endDate);
  return {
    start,
    end,
    range: `${format(start, "M月d日")} — ${format(end, "M月d日")}`
  };
}

export function getMonthTone(
  month: PlanMonth,
  reference = todayInShanghai()
) {
  const days = differenceInCalendarDays(
    parseISO(month.startDate),
    parseISO(reference)
  );
  if (month.status === "done") return "本月验收已完成";
  if (month.status === "deferred") return "本月已顺延";
  if (days > 0) return `${days} 天后开始`;
  if (month.endDate < reference) return "月份已结束，等待验收";
  return "正在推进本月计划";
}

export function getMonthWeekSlots(
  month: PlanMonth,
  planStart: string,
  planEnd: string
) {
  const slots: Array<{
    weekStart: string;
    weekEnd: string;
    label: string;
  }> = [];
  let cursor = startOfWeek(parseISO(month.startDate), { weekStartsOn: 1 });
  const limit = parseISO(month.endDate);

  while (cursor <= limit) {
    const weekStart = format(cursor, "yyyy-MM-dd");
    const weekEnd = format(endOfWeek(cursor, { weekStartsOn: 1 }), "yyyy-MM-dd");
    if (
      weekStart.slice(0, 7) === month.monthKey &&
      weekEnd >= planStart &&
      weekStart <= planEnd
    ) {
      slots.push({
        weekStart,
        weekEnd,
        label: `${format(cursor, "M月d日")} — ${format(
          parseISO(weekEnd),
          "M月d日"
        )}`
      });
    }
    cursor = addDays(cursor, 7);
  }
  return slots;
}

export function getMonthLogs(logs: DailyLog[], monthId: string) {
  return logs
    .filter((log) => log.monthId === monthId)
    .sort((a, b) => b.logDate.localeCompare(a.logDate));
}

export function getDailyLogForDate(
  logs: DailyLog[],
  monthId: string,
  date: string,
  userId = "local-demo"
) {
  return (
    logs.find(
      (log) =>
        log.monthId === monthId &&
        log.logDate === date &&
        log.userId === userId
    ) ?? null
  );
}

/**
 * 该月该日任意成员的第一条打卡；传 userId 时只看这名成员。
 * 用于公开只读视图（没有当前用户过滤条件时展示当天已有的打卡）。
 */
export function getAnyLogForDate(
  logs: DailyLog[],
  monthId: string,
  date: string,
  userId?: string
) {
  return (
    logs.find(
      (log) =>
        log.monthId === monthId &&
        log.logDate === date &&
        (userId === undefined || log.userId === userId)
    ) ?? null
  );
}

export function isDateInMonth(month: PlanMonth, date: string) {
  return date >= month.startDate && date <= month.endDate;
}

export function getReviewForWeek(
  reviews: WeeklyReview[],
  weekStart: string,
  userId = "local-demo"
) {
  return (
    reviews.find(
      (review) => review.weekStart === weekStart && review.userId === userId
    ) ?? null
  );
}

export function getSuggestedLogDate(month: PlanMonth) {
  const today = todayInShanghai();
  if (today < month.startDate) {
    // 首月开营前如果今天与该月同属一个自然月，允许先记录今天。
    return month.monthKey === today.slice(0, 7) ? today : month.startDate;
  }
  if (today > month.endDate) return month.endDate;
  return today;
}

/** 打卡日期下界：首月如果从月中开始，允许整个自然月提前记录（如计划 11-09 开始，11-08 也能先记）。 */
export function getCheckInDateFloor(month: PlanMonth) {
  const monthFirstDay = `${month.monthKey}-01`;
  if (
    month.startDate.slice(0, 7) === month.monthKey &&
    month.startDate > monthFirstDay
  ) {
    return monthFirstDay;
  }
  return month.startDate;
}

/** 打卡日期是否允许（下界到月末），用于月页 ?date= 与日期输入。 */
export function isCheckInDate(month: PlanMonth, date: string) {
  return date >= getCheckInDateFloor(month) && date <= month.endDate;
}

export function getCurrentWeekStart(month: PlanMonth) {
  const today = todayInShanghai();
  if (today < month.startDate) {
    return format(
      startOfWeek(parseISO(month.startDate), { weekStartsOn: 1 }),
      "yyyy-MM-dd"
    );
  }
  if (today > month.endDate) {
    return format(
      startOfWeek(parseISO(month.endDate), { weekStartsOn: 1 }),
      "yyyy-MM-dd"
    );
  }
  return format(startOfWeek(parseISO(today), { weekStartsOn: 1 }), "yyyy-MM-dd");
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

export function getPlanStats(bundle: PlanBundle) {
  const completedMonths = bundle.months.filter(
    (month) => month.status === "done"
  ).length;
  const inProgressMonths = bundle.months.filter(
    (month) => month.status === "in_progress"
  ).length;
  const deferredMonths = bundle.months.filter(
    (month) => month.status === "deferred"
  ).length;
  const totalMinutes = bundle.dailyLogs.reduce(
    (sum, log) => sum + log.minutes,
    0
  );

  return {
    totalMonths: bundle.months.length,
    completedMonths,
    inProgressMonths,
    deferredMonths,
    remainingMonths:
      bundle.months.length - completedMonths - deferredMonths,
    totalMinutes,
    reviewCount: bundle.weeklyReviews.length,
    completionPercent: bundle.months.length
      ? Math.round((completedMonths / bundle.months.length) * 100)
      : 0,
    streak: getCheckInStreak(bundle.dailyLogs)
  };
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

export function addDaysIso(date: string, days: number) {
  return format(addDays(parseISO(date), days), "yyyy-MM-dd");
}
