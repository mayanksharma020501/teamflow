"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Zap, ArrowRight, Users, User } from "lucide-react";
import { toast } from "sonner";

export default function OnboardingPage() {
  const router = useRouter();
  const { data: session, update } = useSession();
  const [name, setName] = useState(session?.user?.name || "");
  const [teamAction, setTeamAction] = useState<"skip" | "create">("skip");
  const [teamName, setTeamName] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Please enter your name");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          teamAction,
          teamName: teamAction === "create" ? teamName.trim() : undefined,
        }),
      });
      if (!res.ok) throw new Error("Failed to save");
      await update();
      toast.success("Welcome to TeamFlow! 🎉");
      router.push("/dashboard");
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-950 dark:via-gray-900 dark:to-indigo-950 p-4">
      <div className="absolute top-20 left-20 w-72 h-72 bg-purple-300/20 rounded-full blur-3xl" />
      <div className="absolute bottom-20 right-20 w-96 h-96 bg-indigo-300/20 rounded-full blur-3xl" />

      <div className="relative z-10 w-full max-w-lg">
        <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-border/50 shadow-2xl p-8">
          {/* Header */}
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white">
              <Zap size={20} />
            </div>
            <h1 className="text-2xl font-bold text-foreground">
              Let&apos;s get you set up
            </h1>
          </div>
          <p className="text-sm text-muted-foreground mb-8">
            Just a couple of things before you start managing tasks
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name */}
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                What should we call you?
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your display name"
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                autoFocus
              />
            </div>

            {/* Team Action */}
            <div>
              <label className="block text-sm font-semibold text-foreground mb-3">
                Would you like to create a team?
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setTeamAction("create")}
                  className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all ${
                    teamAction === "create"
                      ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950"
                      : "border-border hover:border-indigo-300"
                  }`}
                >
                  <Users size={24} className={teamAction === "create" ? "text-indigo-600" : "text-muted-foreground"} />
                  <span className={`text-sm font-medium ${teamAction === "create" ? "text-indigo-700 dark:text-indigo-300" : "text-muted-foreground"}`}>
                    Create a Team
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setTeamAction("skip")}
                  className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all ${
                    teamAction === "skip"
                      ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950"
                      : "border-border hover:border-indigo-300"
                  }`}
                >
                  <User size={24} className={teamAction === "skip" ? "text-indigo-600" : "text-muted-foreground"} />
                  <span className={`text-sm font-medium ${teamAction === "skip" ? "text-indigo-700 dark:text-indigo-300" : "text-muted-foreground"}`}>
                    Solo for Now
                  </span>
                </button>
              </div>
            </div>

            {/* Team Name (conditional) */}
            {teamAction === "create" && (
              <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                <label className="block text-sm font-semibold text-foreground mb-2">
                  Team name
                </label>
                <input
                  type="text"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="e.g. Engineering, Marketing..."
                  className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold py-3 hover:shadow-lg hover:shadow-indigo-500/25 transition-all disabled:opacity-50"
            >
              {loading ? "Setting up..." : "Get Started"}
              <ArrowRight size={18} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
