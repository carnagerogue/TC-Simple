"use client";

import { useState } from "react";
import { ParsedTaskItem } from "@/utils/parseTasks";

type Props = {
  tasks: ParsedTaskItem[];
  onChange: (tasks: ParsedTaskItem[]) => void;
};

export function ParsedTaskList({ tasks, onChange }: Props) {
  const [newTask, setNewTask] = useState("");

  const toggle = (id: string) => {
    onChange(tasks.map((t) => (t.id === id ? { ...t, included: !t.included } : t)));
  };

  const remove = (id: string) => {
    onChange(tasks.filter((t) => t.id !== id));
  };

  const add = () => {
    if (!newTask.trim()) return;
    onChange([
      ...tasks,
      { id: crypto.randomUUID(), label: newTask.trim(), included: true, source: "manual" },
    ]);
    setNewTask("");
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <input
          value={newTask}
          onChange={(e) => setNewTask(e.target.value)}
          placeholder="Add a manual task"
          className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
        />
        <button
          type="button"
          onClick={add}
          className="rounded-md bg-emerald-600 px-3 py-2 text-xs font-semibold text-white shadow hover:bg-emerald-500"
        >
          Add
        </button>
      </div>
      <p className="text-xs text-slate-500">
        Add your own task. We will not re-run AI automatically.
      </p>

      <div className="space-y-2">
        {tasks.map((task) => (
          <div
            key={task.id}
            className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2"
          >
            <label className="flex items-center gap-2 text-sm text-slate-800">
              <input
                type="checkbox"
                checked={task.included}
                onChange={() => toggle(task.id)}
                className="h-4 w-4 accent-emerald-600"
                aria-label={`Include ${task.label} in project`}
              />
              <span className={task.included ? "" : "text-slate-400"}>
                {task.label}
              </span>
            </label>
            <div className="flex items-center gap-2">
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                  task.source === "manual"
                    ? "bg-slate-100 text-slate-700"
                    : "bg-[#eaf2ff] text-[#1b4c96]"
                }`}
              >
                {task.source === "manual" ? "Manual" : "AI suggested"}
              </span>
              <button
                type="button"
                onClick={() => remove(task.id)}
                className="text-xs text-slate-500 hover:text-slate-700"
              >
                Remove
              </button>
            </div>
          </div>
        ))}
        {tasks.length === 0 ? (
          <p className="text-xs text-slate-500">No tasks yet. Add your own tasks.</p>
        ) : null}
      </div>
      {tasks.length > 0 ? (
        <p className="text-xs text-slate-500">
          Checked = include in project. Unchecked = exclude.
        </p>
      ) : null}
    </div>
  );
}

