"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { KanbanBoard } from "@/components/tasks/kanban-board";
import { TaskForm } from "@/components/tasks/task-form";
import { TaskDetailModal } from "@/components/tasks/task-detail-modal";
import { cn, statusLabel, priorityColor, formatRelativeDate, getInitials } from "@/lib/utils";
import {
  LayoutGrid,
  List,
  Plus,
  Users,
  Settings,
  Mail,
  ArrowLeft,
  CheckSquare,
  Calendar,
  UserPlus,
  X,
  FileSpreadsheet,
  Zap,
  Trash2,
  Shield,
  User,
  Search,
  Filter,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { isToday, isYesterday, isTomorrow, isThisWeek, isPast, isFuture, startOfDay, addWeeks, isSameWeek } from "date-fns";
import { FilterDropdown } from "@/components/tasks/filter-dropdown";

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
];

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
  _count?: { comments: number; attachments: number };
};

type Team = {
  id: string;
  name: string;
  description: string | null;
  color: string;
  members: {
    id: string;
    role: string;
    user: { id: string; name: string | null; email: string; image: string | null };
  }[];
};

export default function TeamDetailPage() {
  const params = useParams();
  const teamId = params.teamId as string;
  const [team, setTeam] = useState<Team | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [view, setView] = useState<"board" | "list">("list");
  const [showForm, setShowForm] = useState(false);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [defaultStatus, setDefaultStatus] = useState<string | undefined>();
  const [typeFilter, setTypeFilter] = useState<"ALL" | "ONE_TIME" | "RECURRING">("ALL");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [deleteTasksOption, setDeleteTasksOption] = useState(true);
  const [deleting, setDeleting] = useState(false);

  // Column Filter State
  const [columnFilters, setColumnFilters] = useState({
    status: [] as string[],
    priority: [] as string[],
    assignees: [] as string[],
    dueDate: [] as string[],
  });
  const [openFilterCol, setOpenFilterCol] = useState<string | null>(null);
  const router = useRouter();
  const { data: session } = useSession();

  const currentMember = team?.members?.find(m => m.user.id === session?.user?.id);
  const isOwner = currentMember?.role === "ADMIN";

  // Extract unique assignees from loaded tasks
  const assigneeOptions = [
    { label: "Unassigned", value: "UNASSIGNED" },
    ...Array.from(
      new Map(
        tasks.flatMap((t) => t.assignees?.map((a) => [a.user.id, a.user.name || "Unknown User"]) || [])
      )
    ).map(([value, label]) => ({ label, value }))
  ];

  const filteredTasks = tasks.filter((t) => {
    const matchesType = typeFilter === "ALL" || t.type === typeFilter;
    if (!matchesType) return false;

    // Search
    if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;

    // Column Filters
    if (columnFilters.status.length > 0 && !columnFilters.status.includes(t.status)) return false;
    if (columnFilters.priority.length > 0 && !columnFilters.priority.includes(t.priority)) return false;
    
    if (columnFilters.assignees.length > 0) {
      const isUnassignedSelected = columnFilters.assignees.includes("UNASSIGNED");
      const isAssignedToUser = t.assignees.some((a) => columnFilters.assignees.includes(a.user.id));
      if (!isAssignedToUser && !(isUnassignedSelected && t.assignees.length === 0)) return false;
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
    columnFilters.dueDate.length > 0;

  const fetchData = useCallback(async () => {
    try {
      const [teamRes, tasksRes] = await Promise.all([
        fetch(`/api/teams/${teamId}`),
        fetch(`/api/tasks?teamId=${teamId}`),
      ]);
      if (teamRes.ok) setTeam(await teamRes.json());
      if (tasksRes.ok) setTasks(await tasksRes.json());
    } catch {
      toast.error("Failed to load team data");
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function handleStatusChange(taskId: string, newStatus: string) {
    await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    try {
      const res = await fetch(`/api/teams/${teamId}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.directAdd ? `${inviteEmail} added to team!` : `Invite sent to ${inviteEmail}`);
        setInviteEmail("");
        setShowInvite(false);
      } else {
        toast.error(data.error || "Failed to send invite");
      }
    } catch { toast.error("Failed to send invite"); }
  }

  async function handleDeleteTeam() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/teams/${teamId}?deleteTasks=${deleteTasksOption}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("Team deleted successfully");
        router.push("/teams");
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to delete team");
      }
    } catch {
      toast.error("Failed to delete team");
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  }

  function handleNewTask(status?: string) {
    setDefaultStatus(status);
    setShowForm(true);
  }

  const [syncing, setSyncing] = useState(false);

  async function handleSync() {
    setSyncing(true);
    try {
      const res = await fetch(`/api/teams/${teamId}/sync`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        toast.success(`Synced ${data.rowCount} tasks to Google Sheets!`);
        if (data.sheetUrl) window.open(data.sheetUrl, "_blank");
      }
    } catch {
      toast.error("Failed to sync with Google Sheets");
    } finally {
      setSyncing(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!team) return <p className="text-muted-foreground py-12 text-center">Team not found</p>;

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col gap-6 mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/teams" className="p-2 rounded-lg hover:bg-accent transition-colors">
              <ArrowLeft size={18} />
            </Link>
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg"
              style={{ backgroundColor: team.color }}
            >
              {team.name[0]?.toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                {team.name}
              </h1>
              <p className="text-sm text-muted-foreground">{team.description || "No description"}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={() => setShowMembers(true)}
              className="flex -space-x-2 mr-2 p-1 rounded-xl hover:bg-accent transition-all group"
              title="View team members"
            >
              {team.members.slice(0, 5).map((m) => (
                <div
                  key={m.id}
                  className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-xs font-bold text-white ring-2 ring-card shadow-sm group-hover:ring-accent"
                  title={m.user.name || m.user.email}
                >
                  {m.user.image ? (
                    <img src={m.user.image} alt="" className="w-8 h-8 rounded-full" />
                  ) : (
                    getInitials(m.user.name || m.user.email)
                  )}
                </div>
              ))}
              {team.members.length > 5 && (
                <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-[10px] font-bold text-muted-foreground ring-2 ring-card">
                  +{team.members.length - 5}
                </div>
              )}
            </button>

            <button
              onClick={() => setShowInvite(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border text-sm font-medium hover:bg-accent transition-all"
            >
              <UserPlus size={14} /> Invite
            </button>

            <button
              onClick={handleSync}
              disabled={syncing}
              className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border text-sm font-medium hover:bg-accent transition-all disabled:opacity-50"
            >
              <FileSpreadsheet size={14} className={cn(syncing && "animate-pulse text-green-500")} />
              {syncing ? "Syncing..." : "Sync"}
            </button>

            {isOwner && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="p-2.5 rounded-xl border border-red-200 dark:border-red-900/30 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-all"
                title="Delete Team"
              >
                <Trash2 size={16} />
              </button>
            )}

            <div className="flex items-center bg-accent/50 rounded-xl p-1 border border-border/50">
              <button onClick={() => setView("board")} className={cn("p-2 rounded-lg transition-all", view === "board" ? "bg-card shadow-sm text-indigo-600" : "text-muted-foreground")}>
                <LayoutGrid size={18} />
              </button>
              <button onClick={() => setView("list")} className={cn("p-2 rounded-lg transition-all", view === "list" ? "bg-card shadow-sm text-indigo-600" : "text-muted-foreground")}>
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
              <CheckSquare size={16} /> <span className="hidden sm:inline">Team Tasks</span><span className="sm:hidden">Tasks</span>
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
              <Zap size={16} /> <span className="hidden sm:inline">Team Automations</span><span className="sm:hidden">Auto</span>
            </button>
          </div>

          <div className="flex items-center justify-between lg:justify-end gap-2 px-2 pb-1 lg:pb-0">
            {hasActiveFilters && (
              <button
                onClick={() => setColumnFilters({ status: [], priority: [], assignees: [], dueDate: [] })}
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

      {/* Board / List */}
      {view === "board" ? (
        <KanbanBoard tasks={filteredTasks} onStatusChange={handleStatusChange} onNewTask={handleNewTask} onTaskClick={setActiveTaskId} />
      ) : (
        <div className="bg-card rounded-xl border border-border/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/50 text-[10px] text-muted-foreground uppercase tracking-wider">
                  <th className="text-left py-4 px-4 font-bold">Task</th>
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
                    className="border-b border-border/30 hover:bg-accent/30 transition-all cursor-pointer group"
                  >
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
                    <td colSpan={5} className="py-24 text-center text-muted-foreground">
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
                            onClick={() => setColumnFilters({ status: [], priority: [], assignees: [], dueDate: [] })}
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

      {/* Task Form */}
      {showForm && (
        <TaskForm
          defaultStatus={defaultStatus}
          teamId={teamId}
          onClose={() => setShowForm(false)}
          onCreated={fetchData}
        />
      )}

      {/* Task Detail Modal */}
      {activeTaskId && (
        <TaskDetailModal
          taskId={activeTaskId}
          onClose={() => setActiveTaskId(null)}
          onUpdated={fetchData}
        />
      )}

      {/* Invite Modal */}
      {showInvite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowInvite(false)} />
          <div className="relative w-full max-w-sm bg-card rounded-2xl border border-border shadow-2xl p-6 mx-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Invite Member</h2>
              <button onClick={() => setShowInvite(false)} className="p-1 rounded-lg hover:bg-accent"><X size={18} /></button>
            </div>
            <form onSubmit={handleInvite} className="space-y-4">
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="email"
                  placeholder="teammate@email.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  autoFocus
                />
              </div>
              <button type="submit" className="w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm font-semibold">
                Send Invite
              </button>
            </form>
          </div>
        </div>
      )}
      {/* Member List Modal */}
      {showMembers && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowMembers(false)} />
          <div className="relative w-full max-w-md bg-card rounded-[32px] border border-border shadow-2xl p-8 mx-4 overflow-hidden">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Team Members</h2>
              <button onClick={() => setShowMembers(false)} className="p-2 rounded-xl hover:bg-accent transition-all">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {team.members.map((member) => (
                <div 
                  key={member.id}
                  className="flex items-center gap-4 p-4 rounded-2xl bg-accent/30 border border-border/50 transition-all hover:bg-accent/50"
                >
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">
                    {member.user.image ? (
                      <img src={member.user.image} alt="" className="w-12 h-12 rounded-2xl" />
                    ) : (
                      getInitials(member.user.name || member.user.email)
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold truncate">{member.user.name || "Unknown User"}</p>
                      {member.role === "ADMIN" && (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-500 text-[10px] font-black uppercase tracking-tighter ring-1 ring-indigo-500/20">
                          <Shield size={10} /> Owner
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{member.user.email}</p>
                  </div>
                  
                  <div className="text-muted-foreground">
                    <User size={16} className={cn(member.role === 'ADMIN' && "text-indigo-500")} />
                  </div>
                </div>
              ))}
            </div>

            <button 
              onClick={() => setShowMembers(false)}
              className="w-full mt-6 py-3.5 rounded-2xl bg-accent hover:bg-accent/80 font-bold text-sm transition-all"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Delete Team Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowDeleteConfirm(false)} />
          <div className="relative w-full max-w-md bg-card rounded-[32px] border border-border shadow-2xl p-8 mx-4 overflow-hidden">
            {/* Warning Glow */}
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-red-500/10 blur-[60px] rounded-full" />
            
            <div className="relative z-10 text-center">
              <div className="w-16 h-16 rounded-2xl bg-red-50 dark:bg-red-950/30 flex items-center justify-center mx-auto mb-6">
                <Trash2 className="w-8 h-8 text-red-500" />
              </div>
              
              <h2 className="text-2xl font-black mb-2 tracking-tight">Delete Team?</h2>
              <p className="text-muted-foreground text-sm mb-8">
                This action is permanent. You are about to delete <span className="text-foreground font-bold">{team.name}</span>.
              </p>

              <div className="bg-accent/30 rounded-2xl p-5 mb-8 border border-border/50 text-left">
                <div className="flex items-start gap-3">
                  <div className="mt-1">
                    <input 
                      type="checkbox" 
                      id="deleteTasks"
                      checked={deleteTasksOption}
                      onChange={(e) => setDeleteTasksOption(e.target.checked)}
                      className="w-4 h-4 rounded border-border text-red-500 focus:ring-red-500/20 cursor-pointer"
                    />
                  </div>
                  <label htmlFor="deleteTasks" className="flex-1 cursor-pointer">
                    <p className="text-sm font-bold text-foreground">Delete all team tasks</p>
                    <p className="text-[11px] text-muted-foreground leading-relaxed mt-0.5">
                      {deleteTasksOption 
                        ? "Every task, comment, and attachment in this team will be permanently deleted." 
                        : "Tasks will be kept but converted to personal tasks."}
                    </p>
                  </label>
                </div>
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 py-3.5 rounded-2xl border border-border text-sm font-bold hover:bg-accent transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleDeleteTeam}
                  disabled={deleting}
                  className="flex-1 py-3.5 rounded-2xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 shadow-lg shadow-red-600/20 transition-all active:scale-95 disabled:opacity-50"
                >
                  {deleting ? "Deleting..." : "Delete Team"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
