"use client";

import { useCallback, useMemo, useState } from "react";

type CalendarTask = {
  id: string;
  title: string;
  dueDate: string | null;
  status: string;
  priority?: boolean;
};

type Props = {
  tasks: CalendarTask[];
  onOpenTask: (task: CalendarTask) => void;
  onSetDueDate: (taskId: string, nextDate: string) => void;
};

const toDateKey = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const parseDueDate = (value: string | null) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export function ProjectMiniCalendar({ tasks, onOpenTask, onSetDueDate }: Props) {
  const today = useMemo(() => new Date(), []);
  const [currentMonth, setCurrentMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date(today));

  const tasksByDate = useMemo(() => {
    const map = new Map<string, CalendarTask[]>();
    tasks.forEach((task) => {
      const due = parseDueDate(task.dueDate);
      if (!due) return;
      const key = toDateKey(due);
      const list = map.get(key) || [];
      list.push(task);
      map.set(key, list);
    });
    return map;
  }, [tasks]);

  const monthLabel = useMemo(
    () => currentMonth.toLocaleDateString(undefined, { month: "long", year: "numeric" }),
    [currentMonth]
  );

  const calendarDays = useMemo(() => {
    const start = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const startOffset = start.getDay();
    start.setDate(start.getDate() - startOffset);
    return Array.from({ length: 42 }, (_, idx) => {
      const day = new Date(start);
      day.setDate(start.getDate() + idx);
      return day;
    });
  }, [currentMonth]);

  const selectedKey = useMemo(() => toDateKey(selectedDate), [selectedDate]);
  const todayKey = useMemo(() => toDateKey(today), [today]);

  const selectedTasks = useMemo(() => tasksByDate.get(selectedKey) || [], [tasksByDate, selectedKey]);
  const allTasks = useMemo(
    () =>
      [...tasks].sort((a, b) => {
        const priorityDiff = Number(Boolean(b.priority)) - Number(Boolean(a.priority));
        if (priorityDiff !== 0) return priorityDiff;
        return a.title.localeCompare(b.title);
      }),
    [tasks]
  );

  const goPrevMonth = useCallback(() => {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  }, []);

  const goNextMonth = useCallback(() => {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  }, []);

  const goToday = useCallback(() => {
    const now = new Date();
    setCurrentMonth(new Date(now.getFullYear(), now.getMonth(), 1));
    setSelectedDate(now);
  }, []);

  const handleDayClick = useCallback((day: Date) => {
    setSelectedDate(day);
    if (day.getMonth() !== currentMonth.getMonth() || day.getFullYear() !== currentMonth.getFullYear()) {
      setCurrentMonth(new Date(day.getFullYear(), day.getMonth(), 1));
    }
  }, [currentMonth]);

  const renderTaskRow = (task: CalendarTask, targetKey: string) => {
    const taskKey = task.dueDate ? toDateKey(new Date(task.dueDate)) : null;
    const isOnDate = taskKey === targetKey;
    return (
      <div
        key={task.id}
        className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs"
      >
        <button
          type="button"
          onClick={() => onOpenTask(task)}
          className="flex-1 text-left"
        >
          <p className="font-semibold text-slate-800">{task.title}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
            <span className="rounded-full bg-slate-100 px-2 py-0.5 font-semibold">{task.status}</span>
            {task.priority ? (
              <span className="rounded-full bg-amber-50 px-2 py-0.5 font-semibold text-amber-600">
                Priority
              </span>
            ) : null}
          </div>
        </button>
        <button
          type="button"
          onClick={() => onSetDueDate(task.id, targetKey)}
          disabled={isOnDate}
          className="rounded-md border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
        >
          {isOnDate ? "On date" : "Set due"}
        </button>
      </div>
    );
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Project calendar</p>
          <h3 className="text-lg font-semibold text-slate-900">{monthLabel}</h3>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <button
            type="button"
            onClick={goPrevMonth}
            className="rounded-md border border-slate-200 px-2 py-1 font-semibold text-slate-600 hover:bg-slate-50"
          >
            Prev
          </button>
          <button
            type="button"
            onClick={goToday}
            className="rounded-md border border-slate-200 px-2 py-1 font-semibold text-slate-600 hover:bg-slate-50"
          >
            Today
          </button>
          <button
            type="button"
            onClick={goNextMonth}
            className="rounded-md border border-slate-200 px-2 py-1 font-semibold text-slate-600 hover:bg-slate-50"
          >
            Next
          </button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-7 gap-1 text-[11px] text-slate-500">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((label) => (
          <div key={label} className="text-center font-semibold">
            {label}
          </div>
        ))}
      </div>

      <div className="mt-2 grid grid-cols-7 gap-1 text-xs">
        {calendarDays.map((day) => {
          const key = toDateKey(day);
          const count = tasksByDate.get(key)?.length ?? 0;
          const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
          const isToday = key === todayKey;
          const isSelected = key === selectedKey;
          return (
            <button
              type="button"
              key={key}
              onClick={() => handleDayClick(day)}
              className={`relative rounded-lg border px-2 py-2 text-center transition ${
                isSelected
                  ? "border-[#9bc4ff] bg-[#eaf2ff] text-slate-900"
                  : "border-transparent hover:border-slate-200"
              } ${isCurrentMonth ? "text-slate-800" : "text-slate-400"} ${
                isToday ? "ring-1 ring-[#9bc4ff]" : ""
              }`}
            >
              <div className="text-[12px] font-semibold">{day.getDate()}</div>
              {count > 0 ? (
                <span className="absolute right-1 top-1 rounded-full bg-[#9bc4ff] px-1.5 text-[10px] font-semibold text-white">
                  {count}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="mt-4 space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>
            {selectedDate.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
          </span>
          {selectedTasks.length ? (
            <span>{selectedTasks.length} due</span>
          ) : (
            <span>No tasks due</span>
          )}
        </div>

        {selectedTasks.length ? (
          <div className="space-y-2">{selectedTasks.map((task) => renderTaskRow(task, selectedKey))}</div>
        ) : (
          <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
            No tasks due on this date. Choose a task below to set a due date.
          </div>
        )}

        {selectedTasks.length === 0 ? (
          <div className="space-y-2">
            {allTasks.map((task) => renderTaskRow(task, selectedKey))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
