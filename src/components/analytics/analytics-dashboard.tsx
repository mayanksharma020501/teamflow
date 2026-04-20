"use client";

import { useEffect, useState } from "react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area
} from "recharts";
import { 
  TrendingUp, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Target, 
  Users,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react";
import { cn } from "@/lib/utils";

const STATUS_COLORS: any = {
  DONE: "#10b981", // Emerald
  IN_PROGRESS: "#3b82f6", // Blue
  TODO: "#94a3b8", // Slate
  REVIEW: "#f59e0b", // Amber
};

const GENERIC_COLORS = ["#6366f1", "#8b5cf6", "#ec4899", "#f43f5e", "#f59e0b", "#10b981"];

export function AnalyticsDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [teams, setTeams] = useState<any[]>([]);
  const [scope, setScope] = useState("all"); // all, personal, team:[id]
  const [period, setPeriod] = useState("this-week"); // today, this-week, this-month, last-30

  useEffect(() => {
    async function fetchTeams() {
      const res = await fetch("/api/teams");
      const json = await res.json();
      setTeams(json);
    }
    fetchTeams();
  }, []);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const query = new URLSearchParams({ scope, period });
        const res = await fetch(`/api/analytics?${query.toString()}`);
        const json = await res.json();
        setData(json);
      } catch (err) {
        console.error("Failed to fetch analytics:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [scope, period]);

  const PeriodOptions = [
    { label: "Today", value: "today" },
    { label: "This Week", value: "this-week" },
    { label: "This Month", value: "this-month" },
    { label: "Last 30 Days", value: "last-30" },
  ];

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!data) return <div>Failed to load analytics</div>;

  const completionRate = data.totalTasks > 0 
    ? Math.round((data.completedCount / data.totalTasks) * 100) 
    : 0;

  return (
    <div className="space-y-8 pb-12">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 justify-end items-start sm:items-center">
        <div className="flex items-center gap-2 bg-card border border-border/50 rounded-2xl px-3 py-1.5 shadow-sm">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Scope</span>
          <select 
            value={scope}
            onChange={(e) => setScope(e.target.value)}
            className="bg-transparent border-none text-xs font-semibold focus:ring-0 outline-none cursor-pointer"
          >
            <option value="all">My Tasks</option>
            <option value="personal">Personal Only</option>
            <optgroup label="Teams">
              {teams.map((t: any) => (
                <option key={t.id} value={`team:${t.id}`}>{t.name}</option>
              ))}
            </optgroup>
          </select>
        </div>

        <div className="flex items-center gap-2 bg-card border border-border/50 rounded-2xl px-3 py-1.5 shadow-sm">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Period</span>
          <select 
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="bg-transparent border-none text-xs font-semibold focus:ring-0 outline-none cursor-pointer"
          >
            {PeriodOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          label="Active Tasks" 
          value={data.activeCount} 
          icon={Target} 
          trend="+12%" 
          trendUp={true}
          color="indigo" 
        />
        <StatCard 
          label="Completed" 
          value={data.completedCount} 
          icon={CheckCircle2} 
          trend="+5%" 
          trendUp={true}
          color="emerald" 
        />
        <StatCard 
          label="Completion Rate" 
          value={`${completionRate}%`} 
          icon={TrendingUp} 
          trend="-2%" 
          trendUp={false}
          color="purple" 
        />
        <StatCard 
          label="Active Teams" 
          value={data.teamData.length} 
          icon={Users} 
          trend="+1" 
          trendUp={true}
          color="pink" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Weekly Progress */}
        <div className="bg-card border border-border/50 rounded-3xl p-6 shadow-sm">
          <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
            <TrendingUp size={20} className="text-indigo-500" />
            Weekly Velocity
          </h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.trendData}>
                <defs>
                  <linearGradient id="colorTrend" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fill: "#6b7280" }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fill: "#6b7280" }}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: "16px", border: "none", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)" }}
                />
                <Area 
                  type="monotone" 
                  dataKey="count" 
                  stroke="#6366f1" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorTrend)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Task Distribution */}
        <div className="bg-card border border-border/50 rounded-3xl p-6 shadow-sm">
          <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
            <Clock size={20} className="text-purple-500" />
            Status Distribution
          </h3>
          <div className="h-[300px] w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {data.statusData.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.name] || GENERIC_COLORS[index % GENERIC_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: "16px", border: "none", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)" }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute flex flex-col items-center">
              <span className="text-3xl font-black">{data.totalTasks}</span>
              <span className="text-[10px] uppercase font-bold text-muted-foreground">Total Tasks</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Team Performance */}
        <div className="lg:col-span-2 bg-card border border-border/50 rounded-3xl p-6 shadow-sm">
          <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
            <Users size={20} className="text-pink-500" />
            Team Workload
          </h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.teamData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fill: "#6b7280" }}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fill: "#6b7280" }}
                />
                <Tooltip 
                  cursor={{ fill: "rgba(0,0,0,0.02)" }}
                  contentStyle={{ borderRadius: "16px", border: "none", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)" }}
                />
                <Bar 
                  dataKey="value" 
                  fill="#8b5cf6" 
                  radius={[6, 6, 0, 0]} 
                  barSize={40}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Priority Pulse */}
        <div className="bg-card border border-border/50 rounded-3xl p-6 shadow-sm">
          <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
            <AlertCircle size={20} className="text-rose-500" />
            Priority Levels
          </h3>
          <div className="space-y-4">
            {data.priorityData.map((p: any, i: number) => (
              <div key={p.name} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-muted-foreground uppercase text-[10px] tracking-wider">{p.name}</span>
                  <span className="font-bold">{p.value}</span>
                </div>
                <div className="h-2 w-full bg-accent rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-indigo-500 transition-all duration-1000"
                    style={{ width: `${(p.value / data.totalTasks) * 100}%`, backgroundColor: GENERIC_COLORS[i % GENERIC_COLORS.length] }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, trend, trendUp, color }: any) {
  const colors: any = {
    indigo: "bg-indigo-500/10 text-indigo-600",
    emerald: "bg-emerald-500/10 text-emerald-600",
    purple: "bg-purple-500/10 text-purple-600",
    pink: "bg-pink-500/10 text-pink-600",
  };

  return (
    <div className="bg-card border border-border/50 rounded-3xl p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
      <div className={cn("absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 rounded-full blur-3xl opacity-20", 
        color === "indigo" ? "bg-indigo-500" : 
        color === "emerald" ? "bg-emerald-500" :
        color === "purple" ? "bg-purple-500" : "bg-pink-500"
      )} />
      
      <div className="flex items-center justify-between mb-4">
        <div className={cn("p-3 rounded-2xl", colors[color])}>
          <Icon size={24} />
        </div>
        <div className={cn("flex items-center gap-1 text-xs font-bold", trendUp ? "text-emerald-500" : "text-rose-500")}>
          {trendUp ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
          {trend}
        </div>
      </div>
      <div>
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <p className="text-3xl font-black mt-1">{value}</p>
      </div>
    </div>
  );
}
