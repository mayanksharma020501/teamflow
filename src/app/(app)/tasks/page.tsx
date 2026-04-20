"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { KanbanBoard } from "@/components/tasks/kanban-board";
import { TaskForm } from "@/components/tasks/task-form";
import { TaskDetailModal } from "@/components/tasks/task-detail-modal";
import { cn, statusLabel, priorityColor, formatRelativeDate } from "@/lib/utils";
import {
  LayoutGrid,
  List,
  Plus,
  Filter,
  Search,
  Calendar,
  CheckSquare,
  Zap,
  Trash2,
  ChevronDown,
  X,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { isToday, isYesterday, isTomorrow, isThisWeek, isPast, isFuture, startOfDay, addWeeks, isSameWeek, format, isSameDay, isSameMonth, subMonths } from "date-fns";
import { FilterDropdown } from "@/components/tasks/filter-dropdown";

type Task = {
  id: string;
  title: string;
  priority: string;
  status: string;
  type: "ONE_TIME" | "RECURRING";
  dueDate: string | null;
  isPersonal: boolean;
  creator: { id: string; name: string | null };
  assignees: { user: { id: string; name: string | null; image: string | null } }[];
  labels: { label: { id: string; name: string; color: string } }[];
  subtasks: { id: string; title: string; status: string }[];
  team?: { id: string; name: string; color: string } | null;
  _count?: { comments: number; attachments: number };
};

const STATUS_OPTIONS = [
  { label: "To Do", value: "TODO" },
  { label: "In Progress", value: "IN_PROGRESS" },
  { label: "Review", value: "REVIEW" },
  { label: "Done", value: "DONE" },
];

const PRIORITY_OPTIONS = [
  { label: "Low", value: "LOW" },
  { label: "Medium", value: "MEDIUM" },
  { label: "High", value: "HIGH" },
  { label: "Urgent", value: "URGENT" },
];

const DUE_DATE_OPTIONS = [
  { label: "Overdue", value: "OVERDUE" },
  { label: "Today", value: "TODAY" },
  { label: "Tomorrow", value: "TOMORROW" },
  { label: "This Week", value: "THIS_WEEK" },
  { label: "Next Week", value: "NEXT_WEEK" },
  { label: "This Month", value: "THIS_MONTH" },
  { label: "Last Month", value: "LAST_MONTH" },
  { label: "No Due Date", value: "NO_DATE" },
];


function TasksContent() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [view, setView] = useState<"board" | "list">("list");
  const [showForm, setShowForm] = useState(false);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [defaultStatus, setDefaultStatus] = useState<string | undefined>();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"ALL" | "ONE_TIME" | "RECURRING">("ALL");
  const [loading, setLoading] = useState(true);
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);

  // Column Filter State
  const [columnFilters, setColumnFilters] = useState({
    status: [] as string[],
    priority: [] as string[],
    assignees: [] as string[],
    dueDate: [] as string[],
    teams: [] as string[],
  });
  const [openFilterCol, setOpenFilterCol] = useState<string | null>(null);

  const handleBulkDelete = async () => {
    if (!selectedTasks.length || !confirm(`Are you sure you want to delete ${selectedTasks.length} task(s)?`)) return;
    
    setIsDeleting(true);
    try {
      const res = await fetch("/api/tasks/bulk", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskIds: selectedTasks }),
      });
      
      if (res.ok) {
        toast.success(`Deleted ${selectedTasks.length} task(s)`);
        setSelectedTasks([]);
        fetchTasks();
      } else {
        toast.error("Failed to delete tasks");
      }
    } catch {
      toast.error("Failed to delete tasks");
    } finally {
      setIsDeleting(false);
    }
  };

  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    if (searchParams.get("new") === "true") {
      setShowForm(true);
      // Clean up the URL so refreshing doesn't keep opening it
      router.replace("/tasks", { scroll: false });
    }
  }, [searchParams, router]);

  const fetchTasks = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      const res = await fetch(`/api/tasks?${params}`);
      if (res.ok) {
        const data = await res.json();
        setTasks(data);
      }
    } catch {
      toast.error("Failed to load tasks");
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchTasks();
    // Also trigger cron job to create any pending recurring tasks
    fetch("/api/cron/recurring").catch(() => {});
  }, [fetchTasks]);

  async function handleStatusChange(taskId: string, newStatus: string) {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (res.ok) {
        setTasks((prev) => prev.map((t) => (t.id === taskId ? data : t)));
        toast.success(`Moved to ${statusLabel(newStatus)}`);
      } else {
        toast.error(data.error || "Failed to update status");
        // Re-fetch to sync state
        fetchTasks();
      }
    } catch {
      toast.error("Failed to update status");
      fetchTasks();
    }
  }

  function handleNewTask(status?: string) {
    setDefaultStatus(status);
    setShowForm(true);
  }

  // Extract unique assignees from loaded tasks
  const assigneeOptions = [
    { label: "Unassigned", value: "UNASSIGNED" },
    ...Array.from(
      new Map(
        tasks.flatMap((t) => t.assignees.map((a) => [a.user.id, a.user.name || "Unknown User"]))
      )
    ).map(([value, label]) => ({ label, value }))
  ];

  const teamOptions = [
    { label: "Personal", value: "PERSONAL" },
    ...Array.from(
      new Map(
        tasks.filter(t => t.team).map(t => [t.team!.id, t.team!.name])
      )
    ).map(([value, label]) => ({ label, value }))
  ];

  const filteredTasks = tasks.filter((t) => {
    const matchesType = typeFilter === "ALL" || t.type === typeFilter;
    if (!matchesType) return false;

    // Column Filters
    if (columnFilters.status.length > 0 && !columnFilters.status.includes(t.status)) return false;
    if (columnFilters.priority.length > 0 && !columnFilters.priority.includes(t.priority)) return false;
    
    if (columnFilters.assignees.length > 0) {
      const isUnassignedSelected = columnFilters.assignees.includes("UNASSIGNED");
      const isAssignedToUser = t.assignees.some((a) => columnFilters.assignees.includes(a.user.id));
      if (!isAssignedToUser && !(isUnassignedSelected && t.assignees.length === 0)) return false;
    }

    if (columnFilters.teams.length > 0) {
      const isPersonalSelected = columnFilters.teams.includes("PERSONAL");
      const isTeamMatch = t.team && columnFilters.teams.includes(t.team.id);
      if (!isTeamMatch && !(isPersonalSelected && !t.team)) return false;
    }
    
    if (columnFilters.dueDate.length > 0) {
      const date = t.dueDate ? new Date(t.dueDate) : null;
      const matchesDate = columnFilters.dueDate.some((f) => {
        if (f === "NO_DATE") return !date;
        if (!date) return false;
        if (f === "OVERDUE") return isPast(date) && !isToday(date);
        if (f === "TODAY") return isToday(date);
        if (f === "TOMORROW") return isTomorrow(date);
        if (f === "THIS_WEEK") return isThisWeek(date, { weekStartsOn: 1 });
        if (f === "NEXT_WEEK") {
          const nextWeek = addWeeks(new Date(), 1);
          return isSameWeek(date, nextWeek, { weekStartsOn: 1 });
        }
        if (f === "THIS_MONTH") return isSameMonth(date, new Date());
        if (f === "LAST_MONTH") return isSameMonth(date, subMonths(new Date(), 1));
        if (f.startsWith("FROM:")) {
          const fromDate = new Date(f.replace("FROM:", ""));
          return date >= startOfDay(fromDate);
        }
        if (f.startsWith("TO:")) {
          const toDate = new Date(f.replace("TO:", ""));
          return date <= startOfDay(toDate);
        }
        return false;
      });
      if (!matchesDate) return false;
    }

    return true;
  });

  const hasActiveFilters = 
    columnFilters.status.length > 0 || 
    columnFilters.priority.length > 0 || 
    columnFilters.assignees.length > 0 || 
    columnFilters.dueDate.length > 0 ||
    columnFilters.teams.length > 0;

  return (
    <div>
      {/* Page Header */}
      <div className="flex flex-col gap-6 mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">My Tasks</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {typeFilter === "RECURRING" 
                ? filteredTasks.length 
                : filteredTasks.filter(t => t.status !== "DONE").length
              } {typeFilter === "RECURRING" ? "automation rules" : "active tasks"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* View Toggle */}
            <div className="flex items-center bg-accent/50 rounded-xl p-1 border border-border/50">
              <button
                onClick={() => setView("board")}
                className={cn(
                  "p-2 rounded-lg transition-all",
                  view === "board" ? "bg-card shadow-sm text-indigo-600" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <LayoutGrid size={18} />
              </button>
              <button
                onClick={() => setView("list")}
                className={cn(
                  "p-2 rounded-lg transition-all",
                  view === "list" ? "bg-card shadow-sm text-indigo-600" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <List size={18} />
              </button>
            </div>

            <button
              onClick={() => handleNewTask()}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 shadow-lg shadow-indigo-600/20 transition-all"
            >
              <Plus size={18} />
              {typeFilter === "RECURRING" ? "New Automation" : "New Task"}
            </button>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between bg-card/50 p-1.5 rounded-2xl border border-border/50 backdrop-blur-sm gap-2">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setTypeFilter("ONE_TIME")}
              className={cn(
                "flex-1 md:flex-none px-4 md:px-6 py-2 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2",
                typeFilter === "ONE_TIME" 
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20" 
                  : "text-muted-foreground hover:bg-accent"
              )}
            >
              <CheckSquare size={16} /> <span className="hidden sm:inline">To-Do Tasks</span><span className="sm:hidden">To-Do</span>
            </button>
            <button
              onClick={() => setTypeFilter("RECURRING")}
              className={cn(
                "flex-1 md:flex-none px-4 md:px-6 py-2 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2",
                typeFilter === "RECURRING" 
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20" 
                  : "text-muted-foreground hover:bg-accent"
              )}
            >
              <Zap size={16} /> <span className="hidden sm:inline">Automations</span><span className="sm:hidden">Auto</span>
            </button>
          </div>

          <div className="flex items-center justify-between lg:justify-end gap-2 px-2 pb-1 lg:pb-0">
            {hasActiveFilters && (
              <button
                onClick={() => setColumnFilters({ status: [], priority: [], assignees: [], dueDate: [], teams: [] })}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-all"
              >
                <X size={14} /> <span className="hidden sm:inline">Clear Filters</span>
              </button>
            )}
            <div className="relative flex-1 lg:flex-none">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search tasks..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-4 py-2 bg-transparent text-sm w-full lg:w-48 focus:outline-none lg:focus:w-64 transition-all"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Loading */}
      {loading ? (
        <div className="flex items-center justify-center py-32">
          <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
        </div>
      ) : view === "board" ? (
        <KanbanBoard
          tasks={filteredTasks}
          onStatusChange={handleStatusChange}
          onNewTask={handleNewTask}
          onTaskClick={setActiveTaskId}
        />
      ) : (
        <div className="bg-card rounded-xl border border-border/50 overflow-hidden">
          {selectedTasks.length > 0 && (
            <div className="bg-indigo-50 dark:bg-indigo-900/20 px-4 py-3 flex items-center justify-between border-b border-indigo-100 dark:border-indigo-800 animate-in slide-in-from-top-2">
              <span className="text-sm font-semibold text-indigo-700 dark:text-indigo-300">
                {selectedTasks.length} task(s) selected
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedTasks([])}
                  className="px-3 py-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-800/50 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBulkDelete}
                  disabled={isDeleting}
                  className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50 rounded-lg transition-colors disabled:opacity-50"
                >
                  <Trash2 size={14} />
                  {isDeleting ? "Deleting..." : "Delete Selected"}
                </button>
              </div>
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/50 text-[10px] text-muted-foreground uppercase tracking-wider">
                  <th className="w-12 py-4 px-4 text-center">
                    <input
                      type="checkbox"
                      checked={filteredTasks.length > 0 && selectedTasks.length === filteredTasks.length}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedTasks(filteredTasks.map((t) => t.id));
                        else setSelectedTasks([]);
                      }}
                      className="w-4 h-4 rounded border-border text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                  </th>
                  <th className="text-left py-4 px-4 font-bold">Task</th>
                  <th className="text-left py-4 px-4 font-bold">
                    <div className="flex items-center">
                      Team
                      <FilterDropdown
                        label="Team"
                        options={teamOptions}
                        selected={columnFilters.teams}
                        onChange={(v) => setColumnFilters((p) => ({ ...p, teams: v }))}
                        isOpen={openFilterCol === "teams"}
                        onToggle={() => setOpenFilterCol(openFilterCol === "teams" ? null : "teams")}
                      />
                    </div>
                  </th>
                  <th className="text-left py-4 px-4 font-bold">
                    <div className="flex items-center">
                      Status
                      <FilterDropdown
                        label="Status"
                        options={STATUS_OPTIONS}
                        selected={columnFilters.status}
                        onChange={(v) => setColumnFilters((p) => ({ ...p, status: v }))}
                        isOpen={openFilterCol === "status"}
                        onToggle={() => setOpenFilterCol(openFilterCol === "status" ? null : "status")}
                      />
                    </div>
                  </th>
                  <th className="text-left py-4 px-4 font-bold">
                    <div className="flex items-center">
                      Priority
                      <FilterDropdown
                        label="Priority"
                        options={PRIORITY_OPTIONS}
                        selected={columnFilters.priority}
                        onChange={(v) => setColumnFilters((p) => ({ ...p, priority: v }))}
                        isOpen={openFilterCol === "priority"}
                        onToggle={() => setOpenFilterCol(openFilterCol === "priority" ? null : "priority")}
                      />
                    </div>
                  </th>
                  <th className="text-left py-4 px-4 font-bold">
                    <div className="flex items-center">
                      Due Date
                      <FilterDropdown
                        label="Due Date"
                        options={DUE_DATE_OPTIONS}
                        selected={columnFilters.dueDate}
                        onChange={(v) => setColumnFilters((p) => ({ ...p, dueDate: v }))}
                        isOpen={openFilterCol === "dueDate"}
                        onToggle={() => setOpenFilterCol(openFilterCol === "dueDate" ? null : "dueDate")}
                      />
                    </div>
                  </th>
                  <th className="text-left py-4 px-4 font-bold">
                    <div className="flex items-center">
                      Assignees
                      <FilterDropdown
                        label="Assignees"
                        options={assigneeOptions}
                        selected={columnFilters.assignees}
                        onChange={(v) => setColumnFilters((p) => ({ ...p, assignees: v }))}
                        isOpen={openFilterCol === "assignees"}
                        onToggle={() => setOpenFilterCol(openFilterCol === "assignees" ? null : "assignees")}
                      />
                    </div>
                  </th>
                </tr>
              </thead>
            <tbody>
              {filteredTasks.map((task) => (
                <tr
                  key={task.id}
                  onClick={() => setActiveTaskId(task.id)}
                  className={cn(
                    "border-b border-border/30 hover:bg-accent/30 transition-all cursor-pointer group",
                    selectedTasks.includes(task.id) && "bg-indigo-50/50 dark:bg-indigo-900/10"
                  )}
                >
                  <td className="py-4 px-4" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedTasks.includes(task.id)}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedTasks((prev) => [...prev, task.id]);
                        else setSelectedTasks((prev) => prev.filter((id) => id !== task.id));
                      }}
                      className="w-4 h-4 rounded border-border text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-2 h-2 rounded-full flex-shrink-0",
                        task.status === "DONE" ? "bg-green-500" : "bg-muted-foreground/30"
                      )} />
                      <div className="flex flex-col gap-1 flex-1 min-w-0">
                        <span className={cn(
                          "text-sm font-semibold transition-colors group-hover:text-indigo-600 truncate",
                          task.status === "DONE" && "text-muted-foreground line-through decoration-2"
                        )}>
                          {task.title}
                        </span>
                        {task.subtasks?.length > 0 && (
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1 bg-accent rounded-full overflow-hidden max-w-[60px]">
                              <div 
                                className="h-full bg-indigo-500 transition-all duration-500" 
                                style={{ width: `${(task.subtasks.filter((s: any) => s.status === 'DONE').length / task.subtasks.length) * 100}%` }}
                              />
                            </div>
                            <span className="text-[9px] font-bold text-muted-foreground uppercase whitespace-nowrap">
                              {task.subtasks.filter((s: any) => s.status === 'DONE').length}/{task.subtasks.length}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    {task.team ? (
                      <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider shadow-sm border border-indigo-500/10">
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: task.team.color || '#4f46e5' }} />
                        {task.team.name}
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full bg-accent/50 text-[10px] font-bold text-muted-foreground uppercase tracking-wider italic">
                        Personal
                      </span>
                    )}
                  </td>
                  <td className="py-4 px-4">
                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-accent text-accent-foreground uppercase tracking-wider">
                      {statusLabel(task.status)}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <span className={cn(
                      "text-[10px] font-bold uppercase px-2.5 py-1 rounded-full tracking-wider shadow-sm",
                      priorityColor(task.priority)
                    )}>
                      {task.priority}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    {task.dueDate ? (
                      <span className={cn(
                        "flex items-center gap-1.5 text-xs font-medium",
                        isPast(new Date(task.dueDate)) && !isToday(new Date(task.dueDate)) && task.status !== "DONE" 
                          ? "text-red-500" 
                          : "text-muted-foreground"
                      )}>
                        <Calendar size={13} />
                        {formatRelativeDate(task.dueDate)}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground italic opacity-50">—</span>
                    )}
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex -space-x-1.5 overflow-hidden">
                      {task.assignees.slice(0, 3).map((a) => (
                        <div
                          key={a.user.id}
                          title={a.user.name || "User"}
                          className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-[10px] text-white font-bold flex items-center justify-center ring-2 ring-card shadow-sm"
                        >
                          {a.user.image ? (
                            <img src={a.user.image} alt="" className="w-full h-full rounded-full object-cover" />
                          ) : (
                            a.user.name?.[0]?.toUpperCase() || "?"
                          )}
                        </div>
                      ))}
                      {task.assignees.length > 3 && (
                        <div className="w-7 h-7 rounded-full bg-accent text-[9px] font-bold flex items-center justify-center ring-2 ring-card text-muted-foreground">
                          +{task.assignees.length - 3}
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredTasks.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-24 text-center text-muted-foreground">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-16 h-16 rounded-full bg-accent/50 flex items-center justify-center text-3xl">
                        🔍
                      </div>
                      <div>
                        <p className="text-lg font-bold text-foreground">No tasks match your filters</p>
                        <p className="text-sm">Try adjusting your filters or search query</p>
                      </div>
                      {hasActiveFilters && (
                        <button
                          onClick={() => setColumnFilters({ status: [], priority: [], assignees: [], dueDate: [], teams: [] })}
                          className="mt-2 text-indigo-600 font-semibold hover:underline"
                        >
                          Clear all filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Task Form Modal */}
      {showForm && (
        <TaskForm
          defaultStatus={defaultStatus}
          onClose={() => setShowForm(false)}
          onCreated={fetchTasks}
        />
      )}

      {/* Task Detail Modal */}
      {activeTaskId && (
        <TaskDetailModal
          taskId={activeTaskId}
          onClose={() => setActiveTaskId(null)}
          onUpdated={fetchTasks}
        />
      )}
    </div>
  );
}

import { Suspense } from "react";

export default function TasksPage() {
  return (
    <Suspense fallback={<div className="p-8">Loading tasks...</div>}>
      <TasksContent />
    </Suspense>
  );
}
