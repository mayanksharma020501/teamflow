"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
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
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

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
  const [view, setView] = useState<"board" | "list">("board");
  const [showForm, setShowForm] = useState(false);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [defaultStatus, setDefaultStatus] = useState<string | undefined>();
  const [typeFilter, setTypeFilter] = useState<"ALL" | "ONE_TIME" | "RECURRING">("ALL");
  const [loading, setLoading] = useState(true);

  const filteredTasks = tasks.filter((t) => {
    return typeFilter === "ALL" || t.type === typeFilter;
  });

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
            <div className="flex -space-x-2 mr-2">
              {team.members.slice(0, 5).map((m) => (
                <div
                  key={m.id}
                  className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-xs font-bold text-white ring-2 ring-card shadow-sm"
                  title={m.user.name || m.user.email}
                >
                  {m.user.image ? (
                    <img src={m.user.image} alt="" className="w-8 h-8 rounded-full" />
                  ) : (
                    getInitials(m.user.name || m.user.email)
                  )}
                </div>
              ))}
            </div>

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

        <div className="flex items-center justify-start bg-card/50 p-1.5 rounded-2xl border border-border/50 backdrop-blur-sm">
          <button
            onClick={() => setTypeFilter("ONE_TIME")}
            className={cn(
              "px-6 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2",
              typeFilter === "ONE_TIME" 
                ? "bg-indigo-600 text-white shadow-lg" 
                : "text-muted-foreground hover:bg-accent"
            )}
          >
            <CheckSquare size={16} /> Team Tasks
          </button>
          <button
            onClick={() => setTypeFilter("RECURRING")}
            className={cn(
              "px-6 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2",
              typeFilter === "RECURRING" 
                ? "bg-indigo-600 text-white shadow-lg" 
                : "text-muted-foreground hover:bg-accent"
            )}
          >
            <Zap size={16} /> Team Automations
          </button>
        </div>
      </div>

      {/* Board / List */}
      {view === "board" ? (
        <KanbanBoard tasks={filteredTasks} onStatusChange={handleStatusChange} onNewTask={handleNewTask} onTaskClick={setActiveTaskId} />
      ) : (
        <div className="bg-card rounded-xl border border-border/50 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/50 text-xs text-muted-foreground uppercase">
                <th className="text-left py-3 px-4 font-semibold">Task</th>
                <th className="text-left py-3 px-4 font-semibold">Status</th>
                <th className="text-left py-3 px-4 font-semibold">Priority</th>
                <th className="text-left py-3 px-4 font-semibold">Due Date</th>
                <th className="text-left py-3 px-4 font-semibold">Assignees</th>
              </tr>
            </thead>
            <tbody>
              {filteredTasks.map((task) => (
                <tr key={task.id} onClick={() => setActiveTaskId(task.id)} className="border-b border-border/30 hover:bg-accent/30 transition-colors cursor-pointer">
                  <td className="py-3 px-4"><span className="text-sm font-medium">{task.title}</span></td>
                  <td className="py-3 px-4"><span className="text-xs font-medium px-2 py-1 rounded-md bg-accent">{statusLabel(task.status)}</span></td>
                  <td className="py-3 px-4"><span className={cn("text-xs font-bold uppercase px-2 py-1 rounded-md", priorityColor(task.priority))}>{task.priority}</span></td>
                  <td className="py-3 px-4">{task.dueDate ? <span className="text-xs text-muted-foreground">{formatRelativeDate(task.dueDate)}</span> : "—"}</td>
                  <td className="py-3 px-4">
                    <div className="flex -space-x-1">
                      {task.assignees.slice(0, 3).map((a) => (
                        <div key={a.user.id} className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 text-[9px] text-white font-bold flex items-center justify-center ring-2 ring-card">
                          {a.user.name?.[0]?.toUpperCase() || "?"}
                        </div>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
              {tasks.length === 0 && (
                <tr><td colSpan={5} className="py-16 text-center text-muted-foreground">No tasks yet. Create your first task!</td></tr>
              )}
            </tbody>
          </table>
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
    </div>
  );
}
