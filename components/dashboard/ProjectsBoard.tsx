"use client";

import { useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

type ProjectCard = {
  id: string;
  name: string;
  updatedAt: string;
  status: string;
  isPrimary: boolean;
  tasks: { status: string }[];
};

type Props = {
  primary: ProjectCard[];
  active: ProjectCard[];
  completed: ProjectCard[];
};

type ColumnKey = "primary" | "active" | "completed";

const columnLabels: Record<ColumnKey, string> = {
  primary: "Primary Transaction",
  active: "Active Projects",
  completed: "Completed Projects",
};

export function ProjectsBoard({ primary, active, completed }: Props) {
  const router = useRouter();
  const [primaryList, setPrimaryList] = useState<ProjectCard[]>(primary);
  const [activeList, setActiveList] = useState<ProjectCard[]>(active);
  const [completedList, setCompletedList] = useState<ProjectCard[]>(completed);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<ColumnKey | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Define columns as a typed array to help TypeScript inference
  const columns: ColumnKey[] = ["primary", "active", "completed"];

  const columnData: Record<ColumnKey, ProjectCard[]> = useMemo(
    () => ({
      primary: primaryList,
      active: activeList,
      completed: completedList,
    }),
    [primaryList, activeList, completedList]
  );

  const setColumn = useCallback((key: ColumnKey, list: ProjectCard[]) => {
    if (key === "primary") setPrimaryList(list);
    else if (key === "active") setActiveList(list);
    else setCompletedList(list);
  }, []);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleMarkComplete = async (ids: string[]) => {
    try {
      await Promise.all(
        ids.map((id) =>
          fetch(`/api/projects/${id}/status`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "completed" }),
          })
        )
      );

      setSelected((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => next.delete(id));
        return next;
      });

      // Batch state updates for performance
      const movingProjects = [...primaryList, ...activeList]
        .filter((p) => ids.includes(p.id))
        .map((p) => ({
          ...p,
          status: "completed",
          tasks: p.tasks.map((t) => ({ ...t, status: "completed" }))
        }));

      setPrimaryList((prev) => prev.filter((p) => !ids.includes(p.id)));
      setActiveList((prev) => prev.filter((p) => !ids.includes(p.id)));
      setCompletedList((prev) => [...prev, ...movingProjects]);
      
      router.refresh();
    } catch (e) {
      console.error("Failed to mark complete", e);
    }
  };

  const handleDelete = async (ids: string[]) => {
    try {
      await Promise.all(ids.map((id) => fetch(`/api/projects/${id}`, { method: "DELETE" })));
      setSelected((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => next.delete(id));
        return next;
      });
      setPrimaryList((prev) => prev.filter((p) => !ids.includes(p.id)));
      setActiveList((prev) => prev.filter((p) => !ids.includes(p.id)));
      setCompletedList((prev) => prev.filter((p) => !ids.includes(p.id)));
      router.refresh();
    } catch (e) {
      console.error("Failed to delete", e);
    }
  };

  const handleDrop = async (target: ColumnKey) => {
    if (!draggingId) return;

    let sourceCol: ColumnKey | null = null;
    let targetProject: ProjectCard | null = null;

    // Search for the project in columns
    for (const key of columns) {
      const found = columnData[key].find((p) => p.id === draggingId);
      if (found) {
        sourceCol = key;
        targetProject = found;
        break;
      }
    }

    if (!targetProject || !sourceCol) {
      setDraggingId(null);
      setDragOver(null);
      return;
    }

    const isPrimary = target === "primary";
    const status = target === "completed" ? "completed" : "active";

    try {
      await fetch(`/api/projects/${targetProject.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, isPrimary }),
      });

      // Senior Fix: Use local variables to avoid closure-related type issues
      const currentSourceItems = [...columnData[sourceCol]];
      const nextSourceList = currentSourceItems.filter((p) => p.id !== draggingId);
      setColumn(sourceCol, nextSourceList);

      const updatedProject: ProjectCard = { 
        ...targetProject, 
        status, 
        isPrimary 
      };

      if (target === "completed") {
        updatedProject.tasks = updatedProject.tasks.map((t) => ({ ...t, status: "completed" }));
      }

      if (isPrimary) {
        setPrimaryList([updatedProject]);
        setActiveList((prev) => prev.map((p) => ({ ...p, isPrimary: false })));
        setCompletedList((prev) => prev.map((p) => ({ ...p, isPrimary: false })));
      } else {
        // If it was primary and is moving out, primaryList is now empty
        if (sourceCol === "primary") {
          setPrimaryList([]);
        }
        const currentTargetItems = [...columnData[target]].filter(p => p.id !== draggingId);
        setColumn(target, [...currentTargetItems, updatedProject]);
      }

      router.refresh();
    } catch (e) {
      console.error("Failed to move project", e);
    } finally {
      setDraggingId(null);