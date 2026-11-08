import { ArrowRight, ChevronLeft, ChevronRight, Clock3 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { addDays, format, parseISO } from "date-fns";
import { useApp } from "../context/AppContext";
import { getLogPhotos } from "../lib/checkin";
import { formatLogDate, todayInShanghai } from "../lib/date";
import { cn } from "../lib/utils";
import type { Attachment, DailyLog, PlanMonth } from "../types";
import { PhotoStrip } from "./PhotoStrip";

interface CheckInCalendarProps {
  months: PlanMonth[];
  logs: DailyLog[];
  attachments: Attachment[];
  /** 默认展示的月份 id；之后由日历内部上下月切换。 */
  initialMonthId?: string;
}

type CalendarCell =
  | { kind: "blank"; key: string }
  | {
      kind: "day";
      key: string;
      date: string;
      dayNumber: number;
      minutes: number;
      checked: boolean;
      future: boolean;
      today: boolean;
      label: string;
    };

const WEEKDAYS = ["一", "二", "三", "四", "五", "六", "日"] as const;

function formatDayLabel(date: string) {
  const parsed = parseISO(date);
  return `${format(parsed, "yyyy")}年${format(parsed, "M")}月${format(
    parsed,
    "d"
  )}日`;
}

/**
 * 打卡日历：只渲染当前月计划范围（month.startDate..month.endDate，周一开头），
 * 今天描边、已打卡日带绿点、未来日期禁用；点击某天在下方显示当天打卡详情。
 */
export function CheckInCalendar({
  months,
  logs,
  attachments,
  initialMonthId
}: CheckInCalendarProps) {
  const { bundle } = useApp();
  const orderedMonths = useMemo(
    () => [...months].sort((a, b) => a.startDate.localeCompare(b.startDate)),
    [months]
  );
  const [monthId, setMonthId] = useState(
    () => initialMonthId ?? orderedMonths[0]?.id ?? ""
  );
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  useEffect(() => {
    if (initialMonthId) setMonthId(initialMonthId);
  }, [initialMonthId]);

  useEffect(() => {
    setSelectedDate(null);
  }, [monthId]);

  const monthIndex = orderedMonths.findIndex((item) => item.id === monthId);
  const month = orderedMonths[monthIndex] ?? orderedMonths[0];
  const logsByDate = useMemo(() => {
    const map = new Map<string, DailyLog[]>();
    for (const log of logs) {
      const dayLogs = map.get(log.logDate);
      if (dayLogs) dayLogs.push(log);
      else map.set(log.logDate, [log]);
    }
    return map;
  }, [logs]);
  const today = todayInShanghai();
  const cells = useMemo<CalendarCell[]>(() => {
    if (!month) return [];
    const result: CalendarCell[] = [];
    const first = parseISO(month.startDate);
    const last = parseISO(month.endDate);
    const leadingBlanks = (first.getDay() + 6) % 7;
    for (let index = 0; index < leadingBlanks; index += 1) {
      result.push({ kind: "blank", key: `blank-${index}` });
    }
    for (let cursor = first; cursor <= last; cursor = addDays(cursor, 1)) {
      const date = format(cursor, "yyyy-MM-dd");
      const dayLogs = logsByDate.get(date) ?? [];
      const minutes = dayLogs.reduce((sum, log) => sum + log.minutes, 0);
      const checked = dayLogs.length > 0;
      const future = date > today;
      const isToday = date === today;
      const label = checked
        ? `${formatDayLabel(date)}，已打卡，${minutes} 分钟`
        : future
          ? `${formatDayLabel(date)}，还没到这一天`
          : `${formatDayLabel(date)}，未打卡`;
      result.push({
        kind: "day",
        key: date,
        date,
        dayNumber: Number(format(cursor, "d")),
        minutes,
        checked,
        future,
        today: isToday,
        label
      });
    }
    return result;
  }, [month, logsByDate, today]);

  if (!month) return null;

  const selectedLogs = selectedDate
    ? logsByDate.get(selectedDate) ?? []
    : [];
  const selectedMinutes = selectedLogs.reduce(
    (sum, log) => sum + log.minutes,
    0
  );
  const slug = bundle?.plan.slug ?? "unity-ta";

  return (
    <section className="checkin-calendar" aria-label="打卡日历">
      <header className="checkin-calendar-head">
        <div>
          <p className="eyebrow">打卡日历</p>
          <h3>
            {month.month} · {month.title}
          </h3>
        </div>
        <div className="calendar-nav">
          <button
            type="button"
            className="icon-button"
            aria-label="上个月"
            disabled={monthIndex <= 0}
            onClick={() => setMonthId(orderedMonths[monthIndex - 1].id)}
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            className="icon-button"
            aria-label="下个月"
            disabled={
              monthIndex < 0 || monthIndex >= orderedMonths.length - 1
            }
            onClick={() => setMonthId(orderedMonths[monthIndex + 1].id)}
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </header>

      <p className="calendar-legend">
        <span className="calendar-legend-dot" aria-hidden="true" />
        绿点 = 已打卡
      </p>

      <div className="calendar-weekdays" aria-hidden="true">
        {WEEKDAYS.map((weekday) => (
          <span key={weekday}>{weekday}</span>
        ))}
      </div>

      <div className="calendar-grid">
        {cells.map((cell) =>
          cell.kind === "blank" ? (
            <span
              key={cell.key}
              className="calendar-blank"
              aria-hidden="true"
            />
          ) : (
            <button
              key={cell.key}
              type="button"
              className={cn(
                "calendar-day",
                cell.checked && "is-checked",
                cell.today && "is-today",
                selectedDate === cell.date && "is-selected"
              )}
              data-date={cell.date}
              aria-label={cell.label}
              aria-pressed={selectedDate === cell.date}
              disabled={cell.future && !cell.checked}
              onClick={() => setSelectedDate(cell.date)}
            >
              <span className="calendar-day-number">{cell.dayNumber}</span>
              {cell.checked && (
                <span className="calendar-day-dot" aria-hidden="true" />
              )}
            </button>
          )
        )}
      </div>

      {selectedDate && (
        <div className="checkin-day-detail" aria-live="polite">
          <div className="checkin-day-detail-head">
            <strong>{formatLogDate(selectedDate)}</strong>
            {selectedDate === today && <span>今天</span>}
            {selectedLogs.length > 0 && (
              <small>
                <Clock3 size={13} /> 当日 {selectedMinutes} 分钟
              </small>
            )}
          </div>
          {selectedLogs.length > 0 ? (
            selectedLogs.map((log) => (
              <article className="checkin-day-entry" key={log.id}>
                <div className="checkin-day-entry-head">
                  <strong>{log.minutes} 分钟</strong>
                  <small>由 {log.authorName} 记录</small>
                </div>
                <p>{log.note || "完成今日学习记录"}</p>
                <PhotoStrip
                  attachments={getLogPhotos(attachments, log.id)}
                  size="sm"
                  altPrefix={`${log.logDate} 打卡照片`}
                />
              </article>
            ))
          ) : (
            <p className="quiet-copy">这天还没有打卡记录</p>
          )}
          <Link
            className="text-link"
            to={`/plans/${slug}/months/${month.monthKey}?date=${selectedDate}#daily-record`}
          >
            在月度记录中查看 <ArrowRight size={15} />
          </Link>
        </div>
      )}
    </section>
  );
}
