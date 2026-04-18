"use client";

import { useState, useEffect } from "react";
import { cn, formatDate, priorityColor } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  addMonths,
  subMonths,
} from "date-fns";

type Task = {
  id: string;
  title: string;
  priority: string;
  status: string;
  type: "ONE_TIME" | "RECURRING";
  dueDate: string | null;
  team?: { name: string; color: string } | null;
};

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<"ONE_TIME" | "RECURRING" | "ALL">("ALL");

  useEffect(() => {
    async function fetchTasks() {
      try {
        const res = await fetch("/api/tasks");
        if (res.ok) setTasks(await res.json());
      } catch { /* ignore */ } finally {
        setLoading(false);
      }
    }
    fetchTasks();
  }, []);

  const filteredTasks = tasks.filter((t) => {
    return typeFilter === "ALL" || t.type === typeFilter;
  });

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calStart = startOfWeek(monthStart);
  const calEnd = endOfWeek(monthEnd);
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  function getTasksForDay(day: Date) {
    return filteredTasks.filter((t) => t.dueDate && isSameDay(new Date(t.dueDate), day));
  }

  return (
    <div>
      <div className="flex flex-col gap-6 mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Calendar</h1>
            <p className="text-sm text-muted-foreground mt-0.5">View tasks and automations by date</p>
          </div>
          <div className="flex items-center bg-card/50 p-1 rounded-2xl border border-border/50">
            <button
              onClick={() => setTypeFilter("ALL")}
              className={cn(
                "px-4 py-1.5 rounded-xl text-xs font-bold transition-all",
                typeFilter === "ALL" ? "bg-indigo-600 text-white" : "text-muted-foreground hover:bg-accent"
              )}
            >
              All
            </button>
            <button
              onClick={() => setTypeFilter("ONE_TIME")}
              className={cn(
                "px-4 py-1.5 rounded-xl text-xs font-bold transition-all",
                typeFilter === "ONE_TIME" ? "bg-indigo-600 text-white" : "text-muted-foreground hover:bg-accent"
              )}
            >
              To-Do
            </button>
            <button
              onClick={() => setTypeFilter("RECURRING")}
              className={cn(
                "px-4 py-1.5 rounded-xl text-xs font-bold transition-all",
                typeFilter === "RECURRING" ? "bg-indigo-600 text-white" : "text-muted-foreground hover:bg-accent"
              )}
            >
              Automations
            </button>
          </div>
        </div>
      </div>

      {/* Month Navigation */}
      <div className="bg-card rounded-xl border border-border/50 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/50">
          <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="p-2 rounded-lg hover:bg-accent"><ChevronLeft size={18} /></button>
          <h2 className="text-lg font-bold">{format(currentDate, "MMMM yyyy")}</h2>
          <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="p-2 rounded-lg hover:bg-accent"><ChevronRight size={18} /></button>
        </div>

        {/* Day Headers */}
        <div className="grid grid-cols-7 border-b border-border/50">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div key={d} className="py-2 text-center text-xs font-semibold text-muted-foreground uppercase">{d}</div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7">
          {days.map((day, i) => {
            const dayTasks = getTasksForDay(day);
            return (
              <div
                key={i}
                className={cn(
                  "min-h-[100px] border-b border-r border-border/30 p-2 transition-colors hover:bg-accent/30",
                  !isSameMonth(day, currentDate) && "opacity-30",
                )}
              >
                <div className={cn(
                  "text-sm font-medium mb-1 w-7 h-7 flex items-center justify-center rounded-full",
                  isToday(day) && "bg-indigo-500 text-white",
                )}>
                  {format(day, "d")}
                </div>
                <div className="space-y-1">
                  {dayTasks.slice(0, 3).map((task) => (
                    <div
                      key={task.id}
                      className={cn(
                        "text-[10px] font-medium px-1.5 py-0.5 rounded truncate cursor-pointer flex items-center gap-1",
                        task.type === "RECURRING" 
                          ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800" 
                          : priorityColor(task.priority)
                      )}
                      title={task.title}
                    >
                      {task.type === "RECURRING" && <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0 animate-pulse" />}
                      {task.title}
                    </div>
                  ))}
                  {dayTasks.length > 3 && (
                    <div className="text-[10px] text-muted-foreground px-1.5">+{dayTasks.length - 3} more</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
