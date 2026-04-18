"use client";

import { useState, useEffect } from "react";
import { Zap, Plus, History, Calendar, Settings2, Trash2, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { cn, formatRelativeDate } from "@/lib/utils";
import { TaskForm } from "@/components/tasks/task-form";
import { TaskDetailModal } from "@/components/tasks/task-detail-modal";

type Automation = {
  id: string;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  type: string;
  recurringRule: {
    frequency: string;
    interval: number;
    leadTime: number;
    nextRun: string | null;
  } | null;
  team: { name: string; color: string } | null;
  _count: { instances: number };
};

export default function AutomationsPage() {
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);

  async function fetchAutomations() {
    try {
      const res = await fetch("/api/tasks?type=RECURRING");
      if (res.ok) setAutomations(await res.json());
    } catch {
      toast.error("Failed to load automations");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAutomations();
  }, []);

  async function deleteAutomation(id: string) {
    if (!confirm("Are you sure you want to delete this automation rule? This will not delete previously created tasks.")) return;
    try {
      const res = await fetch(`/api/tasks/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Automation deleted");
        fetchAutomations();
      }
    } catch {
      toast.error("Failed to delete automation");
    }
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Zap className="text-indigo-500" /> Automations
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage your recurring tasks and automation rules
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm font-semibold hover:shadow-lg transition-all"
        >
          <Plus size={16} /> New Automation
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-32">
          <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
        </div>
      ) : automations.length === 0 ? (
        <div className="text-center py-24 bg-card rounded-2xl border border-dashed border-border/50">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/30 flex items-center justify-center mx-auto mb-4">
            <Zap className="text-indigo-500" size={32} />
          </div>
          <h2 className="text-lg font-semibold mb-2">No automations yet</h2>
          <p className="text-muted-foreground text-sm mb-6 max-w-sm mx-auto">
            Create a recurring task to automate your workflow. It will automatically generate to-do tasks based on your schedule.
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold hover:shadow-lg transition-all"
          >
            Create Your First Automation
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {automations.map((rule) => (
            <div
              key={rule.id}
              className="group bg-card rounded-2xl border border-border/50 p-6 hover:shadow-xl hover:border-indigo-200 dark:hover:border-indigo-800 transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 flex items-center justify-center text-indigo-600 shrink-0">
                    <History size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground group-hover:text-indigo-600 transition-colors">
                      {rule.title}
                    </h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      {rule.team && (
                        <span 
                          className="text-[10px] font-bold px-1.5 py-0.5 rounded text-white"
                          style={{ backgroundColor: rule.team.color }}
                        >
                          {rule.team.name}
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {rule.recurringRule?.frequency} • Every {rule.recurringRule?.interval} day(s)
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => setActiveTaskId(rule.id)}
                    className="p-2 rounded-lg hover:bg-accent text-muted-foreground"
                  >
                    <Settings2 size={16} />
                  </button>
                  <button 
                    onClick={() => deleteAutomation(rule.id)}
                    className="p-2 rounded-lg hover:bg-destructive/10 text-destructive"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="p-3 rounded-xl bg-accent/30 border border-border/50">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1 flex items-center gap-1">
                    <Calendar size={10} /> Next Due Date
                  </p>
                  <p className="text-sm font-semibold">
                    {rule.recurringRule?.nextRun ? formatRelativeDate(rule.recurringRule.nextRun) : "Not scheduled"}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-accent/30 border border-border/50">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1 flex items-center gap-1">
                    <Zap size={10} /> Created Tasks
                  </p>
                  <p className="text-sm font-semibold">{rule._count.instances} instances</p>
                </div>
              </div>

              <button 
                onClick={() => setActiveTaskId(rule.id)}
                className="w-full py-2 rounded-xl bg-accent hover:bg-indigo-50 dark:hover:bg-indigo-950/30 text-xs font-bold text-muted-foreground hover:text-indigo-600 transition-all flex items-center justify-center gap-2"
              >
                View Rule Details <ArrowRight size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <TaskForm
          onClose={() => setShowForm(false)}
          onCreated={() => {
            setShowForm(false);
            fetchAutomations();
          }}
        />
      )}

      {activeTaskId && (
        <TaskDetailModal
          taskId={activeTaskId}
          onClose={() => setActiveTaskId(null)}
          onUpdated={fetchAutomations}
        />
      )}
    </div>
  );
}
