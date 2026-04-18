"use client";

import { useState, useEffect } from "react";
import { Plus, Users, Settings, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

type Team = {
  id: string;
  name: string;
  description: string | null;
  color: string;
  _count: { members: number; tasks: number };
};

export default function TeamsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [teamName, setTeamName] = useState("");
  const [teamDesc, setTeamDesc] = useState("");
  const [teamColor, setTeamColor] = useState("#6366f1");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchTeams();
  }, []);

  async function fetchTeams() {
    try {
      const res = await fetch("/api/teams");
      if (res.ok) setTeams(await res.json());
    } catch {
      toast.error("Failed to load teams");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!teamName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: teamName, description: teamDesc, color: teamColor }),
      });
      if (res.ok) {
        toast.success("Team created! 🎉");
        setShowCreate(false);
        setTeamName("");
        setTeamDesc("");
        fetchTeams();
      } else {
        const errorData = await res.json();
        toast.error(errorData.error || "Failed to create team");
      }
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setCreating(false);
    }
  }

  const COLORS = ["#6366f1", "#ec4899", "#f97316", "#22c55e", "#06b6d4", "#8b5cf6", "#ef4444", "#eab308"];

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Teams</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage your teams and collaborate</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm font-semibold hover:shadow-lg hover:shadow-indigo-500/25 transition-all"
        >
          <Plus size={16} /> New Team
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-32">
          <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
        </div>
      ) : teams.length === 0 ? (
        <div className="text-center py-24">
          <div className="text-5xl mb-4">👥</div>
          <h2 className="text-lg font-semibold mb-2">No teams yet</h2>
          <p className="text-muted-foreground text-sm mb-6">Create a team to start collaborating</p>
          <button
            onClick={() => setShowCreate(true)}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold hover:shadow-lg transition-all"
          >
            Create Your First Team
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {teams.map((team) => (
            <Link
              key={team.id}
              href={`/teams/${team.id}`}
              className="bg-card rounded-xl border border-border/50 p-6 hover:shadow-lg hover:border-indigo-200 dark:hover:border-indigo-800 transition-all group"
            >
              <div className="flex items-start gap-4 mb-4">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-lg font-bold flex-shrink-0"
                  style={{ backgroundColor: team.color }}
                >
                  {team.name[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground truncate">{team.name}</h3>
                  <p className="text-sm text-muted-foreground truncate">{team.description || "No description"}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Users size={14} /> {team._count.members} members
                </span>
                <span>{team._count.tasks} tasks</span>
                <ArrowRight size={14} className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity text-indigo-500" />
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Create Team Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowCreate(false)} />
          <div className="relative w-full max-w-md bg-card rounded-2xl border border-border shadow-2xl p-6 mx-4">
            <h2 className="text-lg font-bold mb-4">Create Team</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <input
                type="text"
                placeholder="Team name"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                autoFocus
              />
              <textarea
                placeholder="Description (optional)"
                value={teamDesc}
                onChange={(e) => setTeamDesc(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none"
                rows={2}
              />
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase mb-2">Color</label>
                <div className="flex gap-2">
                  {COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setTeamColor(c)}
                      className={`w-8 h-8 rounded-full transition-all ${teamColor === c ? "ring-2 ring-offset-2 ring-indigo-500 scale-110" : ""}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowCreate(false)} className="flex-1 py-2.5 rounded-xl border border-border text-sm font-semibold text-muted-foreground">Cancel</button>
                <button type="submit" disabled={creating} className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm font-semibold disabled:opacity-50">
                  {creating ? "Creating..." : "Create Team"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
