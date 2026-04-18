"use client";

import { useState, useEffect } from "react";
import { X, Calendar, CheckSquare, Tag, Paperclip, MoreHorizontal, MessageSquare, Plus, History, Trash2 } from "lucide-react";
import { formatRelativeDate, cn, statusLabel, priorityColor } from "@/lib/utils";
import { CommentThread } from "@/components/comments/comment-thread";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

interface TaskDetailModalProps {
  taskId: string;
  onClose: () => void;
  onUpdated: () => void;
}

export function TaskDetailModal({ taskId, onClose, onUpdated }: TaskDetailModalProps) {
  const { data: session } = useSession();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [task, setTask] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"details" | "comments" | "attachments" | "activity">("details");
  const [activity, setActivity] = useState<any[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(false);

  useEffect(() => {
    async function fetchTask() {
      try {
        const res = await fetch(`/api/tasks/${taskId}`);
        if (res.ok) {
          setTask(await res.json());
        } else {
          toast.error("Task not found");
          onClose();
        }
      } catch {
        toast.error("Failed to load task");
      } finally {
        setLoading(false);
      }
    }
    fetchTask();
  }, [taskId, onClose]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  useEffect(() => {
    if (activeTab === "activity") {
      async function fetchActivity() {
        setLoadingActivity(true);
        try {
          const res = await fetch(`/api/tasks/${taskId}/activity`);
          if (res.ok) setActivity(await res.json());
        } finally {
          setLoadingActivity(false);
        }
      }
      fetchActivity();
    }
  }, [activeTab, taskId]);

  async function updateField(field: string, value: unknown) {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });
      const data = await res.json();
      if (res.ok) {
        setTask(data);
        onUpdated();
        toast.success("Task updated");
      } else {
        toast.error(data.error || "Failed to update task");
        // Re-fetch to reset UI to actual server state
        const refreshRes = await fetch(`/api/tasks/${taskId}`);
        if (refreshRes.ok) setTask(await refreshRes.json());
      }
    } catch {
      toast.error("Failed to update task");
    }
  }

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
        <div className="relative w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!task) return null;

  const completedSubtasks = task.subtasks?.filter((s: { status: string }) => s.status === "DONE").length || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full h-full md:max-w-3xl md:h-[85vh] bg-card md:rounded-2xl border-none md:border border-border shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border/50">
          <div className="flex items-center gap-3">
            <select
              value={task.status}
              onChange={(e) => updateField("status", e.target.value)}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-border bg-accent focus:outline-none"
            >
              <option value="TODO">To Do</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="REVIEW">Review</option>
              <option value="DONE">Done</option>
            </select>
            <select
              value={task.priority}
              onChange={(e) => updateField("priority", e.target.value)}
              className={cn("text-xs font-bold uppercase px-3 py-1.5 rounded-lg border-none focus:outline-none", priorityColor(task.priority))}
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={async () => {
                if (confirm("Are you sure you want to delete this task?")) {
                  try {
                    const res = await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
                    if (res.ok) {
                      toast.success("Task deleted");
                      onUpdated();
                      onClose();
                    } else {
                      toast.error("Failed to delete task");
                    }
                  } catch {
                    toast.error("Failed to delete task");
                  }
                }
              }}
              className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-red-500 transition-colors"
              title="Delete Task"
            >
              <Trash2 size={18} />
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground transition-colors"><X size={18} /></button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto flex flex-col md:flex-row">
          {/* Main Content */}
          <div className="flex-1 p-4 md:p-6 border-b md:border-b-0 md:border-r border-border/50">
            {task.type === "RECURRING" && (
              <div className="mb-4 p-4 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shrink-0 shadow-lg shadow-indigo-500/20">
                    <History size={18} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider">Automation Rule Settings</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div>
                    <label className="block text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase mb-1">Repeat Pattern</label>
                    <select
                      value={task.recurringRule?.frequency || "DAILY"}
                      onChange={(e) => updateField("frequency", e.target.value)}
                      className="w-full rounded-lg border border-indigo-200 dark:border-indigo-800 bg-background px-3 py-1.5 text-xs focus:outline-none"
                    >
                      <option value="DAILY">Every Day</option>
                      <option value="WEEKDAY">Mon - Fri</option>
                      <option value="WEEKLY">Every Week</option>
                      <option value="MONTHLY">Every Month</option>
                      <option value="INTERVAL">Every X Days</option>
                    </select>
                  </div>
                  
                  {task.recurringRule?.frequency === "INTERVAL" && (
                    <div>
                      <label className="block text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase mb-1">Interval (Days)</label>
                      <input
                        type="number"
                        min={1}
                        defaultValue={task.recurringRule?.interval || 1}
                        onBlur={(e) => parseInt(e.target.value) !== task.recurringRule?.interval && updateField("interval", parseInt(e.target.value))}
                        className="w-full rounded-lg border border-indigo-200 dark:border-indigo-800 bg-background px-3 py-1.5 text-xs focus:outline-none"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase mb-1">Lead Time (Pre-create task)</label>
                    <select
                      value={task.recurringRule?.leadTime || 0}
                      onChange={(e) => updateField("leadTime", parseInt(e.target.value))}
                      className="w-full rounded-lg border border-indigo-200 dark:border-indigo-800 bg-background px-3 py-1.5 text-xs focus:outline-none"
                    >
                      {[0, 1, 2, 3, 5, 7, 14].map((days) => (
                        <option key={days} value={days}>
                          {days === 0 ? "On due date" : `${days} days before`}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {task.recurringTaskId && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white shrink-0">
                  <CheckSquare size={18} />
                </div>
                <div>
                  <p className="text-xs font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">Generated Instance</p>
                  <p className="text-[10px] text-emerald-600/70 dark:text-emerald-400/70">
                    Created by automation rule.
                  </p>
                </div>
              </div>
            )}

            <input
              type="text"
              defaultValue={task.title}
              onBlur={(e) => e.target.value !== task.title && updateField("title", e.target.value)}
              className="w-full text-2xl font-bold bg-transparent border-none outline-none mb-6"
            />
            
            {/* Description */}
            <div className="mb-8">
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                Description
              </h3>
              <textarea
                defaultValue={task.description || ""}
                onBlur={(e) => e.target.value !== task.description && updateField("description", e.target.value)}
                placeholder="Add a more detailed description..."
                className="w-full min-h-[100px] text-sm bg-accent/30 border border-border/50 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500/20 resize-y"
              />
            </div>

            {/* Subtasks */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <CheckSquare size={16} className="text-muted-foreground" />
                  Subtasks
                </h3>
                <span className="text-xs text-muted-foreground">
                  {completedSubtasks} / {task.subtasks?.length || 0}
                </span>
              </div>
              <div className="space-y-2 mb-3">
                {task.subtasks?.map((subtask: any) => (
                  <div key={subtask.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent/50 group">
                    <input
                      type="checkbox"
                      checked={subtask.status === "DONE"}
                      readOnly
                      className="w-4 h-4 rounded border-border text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className={cn("text-sm flex-1", subtask.status === "DONE" && "line-through text-muted-foreground")}>
                      {subtask.title}
                    </span>
                  </div>
                ))}
              </div>
              <button className="text-xs font-semibold text-indigo-600 flex items-center gap-1 hover:underline">
                <Plus size={14} /> Add subtask
              </button>
            </div>
          </div>

          {/* Sidebar */}
          <div className="w-full md:w-64 bg-accent/10 p-4 md:p-6 flex flex-col">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-4">Properties</h4>
            
            <div className="space-y-4">
              {/* Creator */}
              {task.creator && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Creator</label>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-[10px] font-bold text-white">
                      {task.creator.image ? (
                        <img src={task.creator.image} alt="" className="w-6 h-6 rounded-full" />
                      ) : (
                        task.creator.name?.[0]?.toUpperCase() || "?"
                      )}
                    </div>
                    <span className="text-sm font-medium">{task.creator.name || task.creator.email}</span>
                  </div>
                </div>
              )}
              {/* Assignees */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Assignees</label>
                <div className="flex flex-wrap gap-2">
                  {task.assignees?.length === 0 ? (
                    <span className="text-sm text-muted-foreground italic">Unassigned</span>
                  ) : (
                    task.assignees?.map((a: any) => (
                      <div key={a.userId} className="flex items-center gap-2 bg-accent/50 px-2 py-1 rounded-lg border border-border/50" title={a.user.name || a.user.email}>
                        <div className="w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center text-[10px] font-bold text-white">
                          {a.user.image ? <img src={a.user.image} alt="" className="w-5 h-5 rounded-full" /> : a.user.name?.[0]?.toUpperCase() || "?"}
                        </div>
                        <span className="text-xs font-medium truncate max-w-[80px]">{a.user.name || "User"}</span>
                      </div>
                    ))
                  )}
                  <button className="w-8 h-8 rounded-lg border border-dashed border-border flex items-center justify-center text-muted-foreground hover:bg-accent transition-colors">
                    <Plus size={14} />
                  </button>
                </div>
              </div>

              {/* Due Date */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Due Date</label>
                <div className="flex items-center gap-2 text-sm bg-card border border-border/50 px-3 py-2 rounded-lg">
                  <Calendar size={14} className="text-muted-foreground" />
                  {task.dueDate ? formatRelativeDate(task.dueDate) : "None"}
                </div>
              </div>

              {/* Permissions */}
              {session?.user?.id === task.creatorId && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Permissions</label>
                  <div className="flex items-start gap-2 mt-2">
                    <input
                      type="checkbox"
                      id="restrictStatus"
                      checked={task.restrictStatusUpdates}
                      onChange={(e) => updateField("restrictStatusUpdates", e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded border-border text-indigo-600 focus:ring-indigo-500"
                    />
                    <label htmlFor="restrictStatus" className="text-xs text-muted-foreground leading-tight cursor-pointer">
                      Only creator and assignees can change status (everyone can if unassigned)
                    </label>
                  </div>
                </div>
              )}

              {/* Labels */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Labels</label>
                <div className="flex flex-wrap gap-1.5">
                  {task.labels?.map((l: any) => (
                    <span key={l.label.id} className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: `${l.label.color}20`, color: l.label.color }}>
                      {l.label.name}
                    </span>
                  ))}
                  <button className="text-[10px] font-semibold px-2 py-0.5 rounded-full border border-dashed border-border text-muted-foreground hover:bg-accent">
                    + Add
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs for Bottom Panel */}
        <div className="border-t border-border/50 flex flex-col h-[38%] min-h-[320px]">
          <div className="flex items-center border-b border-border/50 px-4">
            <button
              onClick={() => setActiveTab("comments")}
              className={cn("px-4 py-3 text-sm font-medium border-b-2 transition-colors", activeTab === "comments" ? "border-indigo-500 text-foreground" : "border-transparent text-muted-foreground hover:text-foreground")}
            >
              <div className="flex items-center gap-2">
                <MessageSquare size={16} /> Comments
                <span className="bg-muted px-1.5 rounded-full text-xs">{task.comments?.length || 0}</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab("attachments")}
              className={cn("px-4 py-3 text-sm font-medium border-b-2 transition-colors", activeTab === "attachments" ? "border-indigo-500 text-foreground" : "border-transparent text-muted-foreground hover:text-foreground")}
            >
              <div className="flex items-center gap-2">
                <Paperclip size={16} /> Attachments
              </div>
            </button>
            <button
              onClick={() => setActiveTab("activity")}
              className={cn("px-4 py-3 text-sm font-medium border-b-2 transition-colors", activeTab === "activity" ? "border-indigo-500 text-foreground" : "border-transparent text-muted-foreground hover:text-foreground")}
            >
              <div className="flex items-center gap-2">
                <History size={16} /> Activity
              </div>
            </button>
          </div>

          <div className="flex-1 p-4 overflow-hidden">
            {activeTab === "comments" && (
              <CommentThread 
                taskId={taskId} 
                comments={task.comments || []} 
                currentUserId={session?.user?.id as string} 
                teamMembers={task.team?.members || [
                  { userId: task.creatorId, user: task.creator },
                  ...(task.assignees?.map((a: any) => ({ userId: a.userId, user: a.user })) || [])
                ]}
              />
            )}
            {activeTab === "attachments" && (
              <div className="h-full flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold">Attachments</h3>
                  <button
                    onClick={async () => {
                      // Simulated Google Drive Picker
                      const mockFile = {
                        id: `drive-${Math.random().toString(36).substr(2, 9)}`,
                        name: "Google Drive File.pdf",
                        url: "https://drive.google.com/file/d/placeholder",
                        mimeType: "application/pdf",
                        size: 2048576,
                        driveId: "placeholder",
                      };
                      try {
                        const res = await fetch(`/api/tasks/${taskId}/attachments`, {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify(mockFile),
                        });
                        if (res.ok) {
                          const newAttachment = await res.json();
                          setTask((prev: any) => ({
                            ...prev,
                            attachments: [newAttachment, ...(prev.attachments || [])],
                          }));
                          toast.success("File attached from Google Drive");
                        }
                      } catch {
                        toast.error("Failed to attach file");
                      }
                    }}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border text-xs font-medium hover:bg-accent transition-colors"
                  >
                    <Paperclip size={14} className="text-indigo-500" />
                    Attach from Drive
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-2">
                  {task.attachments?.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-muted-foreground py-12">
                      <Paperclip size={32} className="mb-2 opacity-50" />
                      <p className="text-sm">No attachments yet</p>
                    </div>
                  ) : (
                    task.attachments?.map((att: any) => (
                      <div key={att.id} className="flex items-center gap-3 p-3 rounded-xl border border-border/50 bg-accent/30 hover:bg-accent/50 transition-colors group">
                        <div className="w-10 h-10 rounded-lg bg-background flex items-center justify-center border border-border">
                          <Paperclip size={18} className="text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{att.name}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {att.driveId ? "Google Drive" : "Uploaded"} • {(att.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                        <a
                          href={att.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 rounded-lg hover:bg-background text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <X size={16} className="rotate-45" />
                        </a>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
            {activeTab === "activity" && (
              <div className="h-full overflow-y-auto space-y-4 pr-2">
                {loadingActivity ? (
                  <div className="flex justify-center py-8">
                    <div className="w-6 h-6 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                  </div>
                ) : activity.length === 0 ? (
                  <p className="text-center text-muted-foreground text-sm py-8">No activity recorded yet.</p>
                ) : (
                  activity.map((log) => (
                    <div key={log.id} className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center flex-shrink-0">
                        {log.user.image ? (
                          <img src={log.user.image} alt="" className="w-8 h-8 rounded-full" />
                        ) : (
                          <span className="text-[10px] font-bold">{log.user.name?.[0] || "?"}</span>
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm">
                          <span className="font-semibold">{log.user.name || log.user.email}</span>{" "}
                          <span className="text-muted-foreground">
                            {log.action.replace(/_/g, " ")}
                          </span>
                        </p>
                        {log.details && (
                          <p className="text-xs text-muted-foreground mt-1 bg-accent/30 p-2 rounded-lg italic">
                            {(() => {
                               try {
                                 const details = JSON.parse(log.details);
                                 return Object.entries(details).map(([k, v]) => `${k}: ${v}`).join(", ");
                               } catch {
                                 return log.details;
                               }
                            })()}
                          </p>
                        )}
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {formatRelativeDate(log.createdAt)}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
