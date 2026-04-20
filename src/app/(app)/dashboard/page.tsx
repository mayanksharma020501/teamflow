"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  TrendingUp,
  Calendar,
  Plus,
  ArrowRight,
  Zap,
  Filter,
} from "lucide-react";
import { cn, formatRelativeDate, priorityColor } from "@/lib/utils";
import Link from "next/link";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

import { 
  startOfDay, 
  endOfDay, 
  subDays, 
  addDays, 
  startOfWeek, 
  endOfWeek, 
  subWeeks, 
  startOfMonth, 
  endOfMonth, 
  subMonths, 
  startOfYear, 
  endOfYear,
  format
} from "date-fns";

const STATUS_COLORS: Record<string, string> = {
  TODO: "#94a3b8",
  IN_PROGRESS: "#3b82f6",
  REVIEW: "#f59e0b",
  DONE: "#22c55e",
};

const STATUS_LABELS: Record<string, string> = {
  TODO: "To Do",
  IN_PROGRESS: "In Progress",
  REVIEW: "Review",
  DONE: "Done",
};

const FILTER_PRESETS = [
  { label: "Today", value: "today" },
  { label: "Yesterday", value: "yesterday" },
  { label: "Tomorrow", value: "tomorrow" },
  { label: "This Week", value: "thisWeek" },
  { label: "Last Week", value: "lastWeek" },
  { label: "This Month", value: "thisMonth" },
  { label: "Last Month", value: "lastMonth" },
  { label: "This Year", value: "thisYear" },
  { label: "Custom Range", value: "custom" },
];

export default function DashboardPage() {
  const { data: session } = useSession();
  const [stats, setStats] = useState({
    dueInPeriod: 0,
    overdue: 0,
    completedInPeriod: 0,
    completionRate: 0,
    upcoming: [] as Array<{
      id: string;
      title: string;
      priority: string;
      dueDate: string;
      assignees: { user: { name: string | null; image: string | null } }[];
    }>,
    totalByStatus: [] as Array<{ status: string; _count: number }>,
    activeAutomations: 0,
  });
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>("thisWeek");
  const [customRange, setCustomRange] = useState({ start: "", end: "" });

  useEffect(() => {
    async function fetchStats() {
      try {
        const now = new Date();
        let from: Date | undefined;
        let to: Date | undefined;

        switch (filterType) {
          case "today":
            from = startOfDay(now);
            to = endOfDay(now);
            break;
          case "yesterday":
            from = startOfDay(subDays(now, 1));
            to = endOfDay(subDays(now, 1));
            break;
          case "tomorrow":
            from = startOfDay(addDays(now, 1));
            to = endOfDay(addDays(now, 1));
            break;
          case "thisWeek":
            from = startOfWeek(now, { weekStartsOn: 1 });
            to = endOfWeek(now, { weekStartsOn: 1 });
            break;
          case "lastWeek":
            from = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
            to = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
            break;
          case "thisMonth":
            from = startOfMonth(now);
            to = endOfMonth(now);
            break;
          case "lastMonth":
            from = startOfMonth(subMonths(now, 1));
            to = endOfMonth(subMonths(now, 1));
            break;
          case "thisYear":
            from = startOfYear(now);
            to = endOfYear(now);
            break;
          case "custom":
            if (customRange.start) from = startOfDay(new Date(customRange.start));
            if (customRange.end) to = endOfDay(new Date(customRange.end));
            break;
        }

        const params = new URLSearchParams();
        if (from) params.set("from", from.toISOString());
        if (to) params.set("to", to.toISOString());

        const res = await fetch(`/api/dashboard?${params}`);
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch (error) {
        console.error("Dashboard fetch error:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
    // Also trigger cron job to create any pending recurring tasks
    fetch("/api/cron/recurring").catch(() => {});
  }, [filterType, customRange]);

  const totalTasks = stats.totalByStatus.reduce((s, t) => s + t._count, 0);
  const pieData = stats.totalByStatus.map((s) => ({
    name: STATUS_LABELS[s.status] || s.status,
    value: s._count,
    color: STATUS_COLORS[s.status] || "#94a3b8",
  }));

  const statCards = [
    {
      label: filterType === "today" ? "Due Today" : `Due ${FILTER_PRESETS.find(f => f.value === filterType)?.label || 'in Period'}`,
      value: stats.dueInPeriod,
      icon: Clock,
      color: "from-blue-500 to-blue-600",
      bg: "bg-blue-50 dark:bg-blue-950",
      text: "text-blue-700 dark:text-blue-300",
    },
    {
      label: "Overdue",
      value: stats.overdue,
      icon: AlertTriangle,
      color: "from-red-500 to-red-600",
      bg: "bg-red-50 dark:bg-red-950",
      text: "text-red-700 dark:text-red-300",
    },
    {
      label: filterType === "thisWeek" ? "Completed This Week" : `Completed ${FILTER_PRESETS.find(f => f.value === filterType)?.label || 'in Period'}`,
      value: stats.completedInPeriod,
      icon: CheckCircle2,
      color: "from-green-500 to-green-600",
      bg: "bg-green-50 dark:bg-green-950",
      text: "text-green-700 dark:text-green-300",
    },
    {
      label: "Active Automations",
      value: stats.activeAutomations,
      icon: Zap,
      color: "from-indigo-500 to-purple-600",
      bg: "bg-indigo-50 dark:bg-indigo-950",
      text: "text-indigo-700 dark:text-indigo-300",
    },
    {
      label: "Productivity",
      value: `${stats.completionRate}%`,
      icon: TrendingUp,
      color: "from-amber-500 to-amber-600",
      bg: "bg-amber-50 dark:bg-amber-950",
      text: "text-amber-700 dark:text-amber-300",
    },
  ];

  return (
    <div>
      {/* Welcome */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Welcome back, {session?.user?.name?.split(" ")[0] || "there"} 👋
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Here&apos;s what&apos;s happening with your tasks {filterType === 'today' ? 'today' : (filterType === 'custom' ? 'in selected range' : FILTER_PRESETS.find(f => f.value === filterType)?.label.toLowerCase())}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="relative group">
            <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-indigo-500 transition-colors" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="pl-9 pr-8 py-2 bg-card border border-border/50 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all appearance-none cursor-pointer hover:bg-accent/50 min-w-[140px]"
            >
              {FILTER_PRESETS.map((f) => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
          </div>

          {filterType === "custom" && (
            <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-2 duration-300">
              <input
                type="date"
                value={customRange.start}
                onChange={(e) => setCustomRange(prev => ({ ...prev, start: e.target.value }))}
                className="px-3 py-2 bg-card border border-border/50 rounded-xl text-[10px] focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
              <span className="text-muted-foreground text-[10px]">to</span>
              <input
                type="date"
                value={customRange.end}
                onChange={(e) => setCustomRange(prev => ({ ...prev, end: e.target.value }))}
                className="px-3 py-2 bg-card border border-border/50 rounded-xl text-[10px] focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          )}
          
          <Link
            href="/tasks?new=true"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm font-semibold hover:shadow-lg hover:shadow-indigo-500/25 transition-all active:scale-95"
          >
            <Plus size={16} /> New Task
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-32">
          <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-8">
            {statCards.map((card) => (
              <div
                key={card.label}
                className="bg-card rounded-xl border border-border/50 p-5 transition-all hover:shadow-md"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className={cn("p-2 rounded-xl", card.bg)}>
                    <card.icon size={20} className={card.text} />
                  </div>
                </div>
                <p className="text-3xl font-bold text-foreground">{card.value}</p>
                <p className="text-sm text-muted-foreground mt-1">{card.label}</p>
              </div>
            ))}
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Pie Chart */}
            <div className="bg-card rounded-xl border border-border/50 p-6">
              <h3 className="text-sm font-semibold text-foreground mb-4">Tasks by Status</h3>
              {pieData.length > 0 ? (
                <div className="flex items-center gap-6">
                  <ResponsiveContainer width={160} height={160}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        innerRadius={45}
                        outerRadius={75}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {pieData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-2">
                    {pieData.map((d) => (
                      <div key={d.name} className="flex items-center gap-2 text-sm">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }} />
                        <span className="text-muted-foreground">{d.name}</span>
                        <span className="font-semibold ml-auto">{d.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground text-sm py-8 text-center">No data yet</p>
              )}
            </div>

            {/* Bar Chart */}
            <div className="bg-card rounded-xl border border-border/50 p-6">
              <h3 className="text-sm font-semibold text-foreground mb-4">Overview</h3>
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={pieData}>
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                      {pieData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-muted-foreground text-sm py-8 text-center">No data yet</p>
              )}
            </div>
          </div>

          {/* Upcoming Tasks */}
          <div className="bg-card rounded-xl border border-border/50 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Zap size={16} className="text-indigo-500" />
                Upcoming {filterType === 'today' ? 'Today' : (filterType === 'custom' ? 'Tasks' : FILTER_PRESETS.find(f => f.value === filterType)?.label)}
              </h3>
              <Link href="/tasks" className="text-xs font-semibold text-indigo-600 flex items-center gap-1 hover:gap-2 transition-all">
                View all <ArrowRight size={12} />
              </Link>
            </div>
            {stats.upcoming.length > 0 ? (
              <div className="space-y-2">
                {stats.upcoming.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center gap-4 rounded-xl px-4 py-3 hover:bg-accent/50 transition-colors cursor-pointer"
                  >
                    <Calendar size={16} className="text-muted-foreground flex-shrink-0" />
                    <span className="text-sm font-medium flex-1 truncate">{task.title}</span>
                    <span className={cn("text-[10px] font-bold uppercase px-2 py-0.5 rounded-md", priorityColor(task.priority))}>
                      {task.priority}
                    </span>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatRelativeDate(task.dueDate)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center py-8 text-muted-foreground text-sm">
                🎉 No upcoming tasks {filterType === 'today' ? 'today' : (filterType === 'custom' ? 'in selected range' : FILTER_PRESETS.find(f => f.value === filterType)?.label.toLowerCase())}!
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
