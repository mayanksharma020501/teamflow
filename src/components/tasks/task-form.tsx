"use client";

import { useState, useEffect } from "react";
import { X, Calendar as CalendarIcon } from "lucide-react";
import { toast } from "sonner";

interface TaskFormProps {
  defaultStatus?: string;
  teamId?: string;
  onClose: () => void;
  onCreated: () => void;
}

const PRIORITIES = [
  { value: "LOW", label: "Low", color: "bg-slate-200 text-slate-700" },
  { value: "MEDIUM", label: "Medium", color: "bg-blue-100 text-blue-700" },
  { value: "HIGH", label: "High", color: "bg-orange-100 text-orange-700" },
  { value: "URGENT", label: "Urgent", color: "bg-red-100 text-red-700" },
];

export function TaskForm({ defaultStatus, teamId, onClose, onCreated }: TaskFormProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("MEDIUM");
  const [status, setStatus] = useState(defaultStatus || "TODO");
  const [dueDate, setDueDate] = useState("");
  const [isPersonal, setIsPersonal] = useState(!teamId);
  const [restrictStatusUpdates, setRestrictStatusUpdates] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState(teamId || "");
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [teams, setTeams] = useState<any[]>([]);
  const [type, setType] = useState<"ONE_TIME" | "RECURRING">("ONE_TIME");
  const [frequency, setFrequency] = useState<"DAILY" | "WEEKLY" | "MONTHLY" | "INTERVAL">("DAILY");
  const [interval, setIntervalValue] = useState(1);
  const [leadTime, setLeadTime] = useState(0);
  const [loading, setLoading] = useState(false);

  // Fetch user's teams to populate dropdown
  useEffect(() => {
    async function fetchTeams() {
      try {
        const res = await fetch("/api/teams");
        if (res.ok) {
          const data = await res.json();
          setTeams(data);
        }
      } catch {
        // ignore
      }
    }
    fetchTeams();
  }, []);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Task title is required");
      return;
    }

    if (!dueDate) {
      toast.error("Due date is required");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          priority,
          status,
          type,
          isPersonal,
          restrictStatusUpdates,
          dueDate: dueDate ? new Date(dueDate).toISOString() : null,
          teamId: isPersonal ? null : (selectedTeamId || null),
          assigneeIds: isPersonal ? [] : assigneeIds,
          // Recurring fields
          frequency: type === "RECURRING" ? frequency : undefined,
          interval: type === "RECURRING" ? interval : undefined,
          leadTime: type === "RECURRING" ? leadTime : undefined,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to create task");
      }

      toast.success("Task created! 🎉");
      
      // Trigger cron immediately to spawn instances if due
      if (type === "RECURRING") {
        fetch("/api/cron/recurring").catch(() => {});
      }

      onCreated();
      onClose();
    } catch (error: any) {
      toast.error(error.message || "Failed to create task");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-card rounded-2xl border border-border shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <form onSubmit={handleSubmit} className="flex flex-col max-h-[85vh]">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border/50">
            <h2 className="text-lg font-bold text-foreground">Create New Task</h2>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-5">
            {/* Type Toggle */}
            <div className="flex bg-accent/50 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setType("ONE_TIME")}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                  type === "ONE_TIME" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                One-time Task
              </button>
              <button
                type="button"
                onClick={() => setType("RECURRING")}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                  type === "RECURRING" ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Recurring / Automation
              </button>
            </div>

            {/* Title */}
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase mb-2">
                Task Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                autoFocus
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={type === "RECURRING" ? "Automation Rule Name..." : "Task title"}
                className="w-full text-xl font-bold bg-transparent border-none outline-none placeholder:text-muted-foreground/50"
              />
            </div>

            {/* Description */}
            <div>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add a description..."
                rows={3}
                className="w-full text-sm bg-accent/30 border border-border/50 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Priority */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase mb-2">
                  Priority
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase mb-2">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="TODO">To Do</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="REVIEW">Review</option>
                  <option value="DONE">Done</option>
                </select>
              </div>
            </div>

            {/* Date / Schedule Section */}
            <div className="space-y-4">
              <label className="block text-xs font-semibold text-muted-foreground uppercase">
                {type === "RECURRING" ? "Start / First Due Date" : "Due Date"} <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <CalendarIcon
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              {type === "RECURRING" && (
                <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30 space-y-4 animate-in slide-in-from-top-2 duration-300">
                  <div className="space-y-2">
                    <label className="block text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase">
                      Repeat Pattern
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { id: "DAILY", label: "Every Day" },
                        { id: "WEEKDAY", label: "Mon - Fri" },
                        { id: "WEEKLY", label: "Every Week" },
                        { id: "MONTHLY", label: "Every Month" },
                        { id: "INTERVAL", label: "Every X Days" },
                      ].map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setFrequency(p.id as any)}
                          className={`px-3 py-2 rounded-lg text-xs font-medium transition-all border ${
                            frequency === p.id
                              ? "bg-indigo-600 border-indigo-600 text-white shadow-sm"
                              : "bg-background border-indigo-100 dark:border-indigo-900/50 text-muted-foreground hover:border-indigo-300"
                          }`}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {frequency === "INTERVAL" && (
                    <div className="flex items-center gap-3">
                      <label className="text-xs font-medium text-muted-foreground shrink-0">Repeat every</label>
                      <input
                        type="number"
                        min={1}
                        value={interval}
                        onChange={(e) => setIntervalValue(parseInt(e.target.value))}
                        className="w-16 rounded-lg border border-indigo-200 dark:border-indigo-800 bg-background px-3 py-1.5 text-sm focus:outline-none text-center"
                      />
                      <span className="text-xs font-medium text-muted-foreground">days</span>
                    </div>
                  )}

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="block text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase">
                        Lead Time (Pre-create task)
                      </label>
                      <span className="text-xs font-bold text-indigo-600">{leadTime} days</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={14}
                      value={leadTime}
                      onChange={(e) => setLeadTime(parseInt(e.target.value))}
                      className="w-full accent-indigo-600 h-1.5 bg-indigo-200 dark:bg-indigo-900/50 rounded-lg appearance-none cursor-pointer"
                    />
                    <p className="text-[10px] text-muted-foreground italic">
                      Instance will be created {leadTime === 0 ? "on the due date" : `${leadTime} days before the due date`}.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Team / Personal Selection */}
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase mb-2">
                Workspace
              </label>
              <select
                value={isPersonal ? "personal" : (selectedTeamId || "")}
                onChange={(e) => {
                  if (e.target.value === "personal") {
                    setIsPersonal(true);
                    setSelectedTeamId("");
                    setAssigneeIds([]);
                  } else {
                    setIsPersonal(false);
                    setSelectedTeamId(e.target.value);
                    setAssigneeIds([]);
                  }
                }}
                className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="personal">Personal (Only visible to me)</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    Team: {t.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Assignees (Only show if a team is selected) */}
            {!isPersonal && selectedTeamId && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-2">
                    Assignees
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {teams
                      .find((t) => t.id === selectedTeamId)
                      ?.members?.map((m: any) => (
                        <button
                          key={m.userId}
                          type="button"
                          onClick={() => {
                            setAssigneeIds((prev) =>
                              prev.includes(m.userId)
                                ? prev.filter((id) => id !== m.userId)
                                : [...prev, m.userId]
                            );
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                            assigneeIds.includes(m.userId)
                              ? "border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300"
                              : "border-border bg-background text-muted-foreground hover:bg-accent"
                          }`}
                        >
                          {m.user.name || m.user.email}
                        </button>
                      ))}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="restrictStatusUpdates"
                    checked={restrictStatusUpdates}
                    onChange={(e) => setRestrictStatusUpdates(e.target.checked)}
                    className="w-4 h-4 rounded border-border text-indigo-600 focus:ring-indigo-500"
                  />
                  <label htmlFor="restrictStatusUpdates" className="text-sm text-foreground">
                    Only I and assignees can change status (everyone can if unassigned)
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="p-4 border-t border-border/50 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:bg-accent transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm font-semibold hover:shadow-lg hover:shadow-indigo-500/25 transition-all disabled:opacity-50"
            >
              {loading ? "Creating..." : "Create Task"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
