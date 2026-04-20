"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Users, Loader2, ArrowRight, ShieldCheck, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const { data: session, status } = useSession();
  const router = useRouter();
  const [invite, setInvite] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchInvite() {
      try {
        const res = await fetch(`/api/invite/${token}`);
        if (res.ok) {
          setInvite(await res.json());
        } else {
          const data = await res.json();
          setError(data.error || "Invalid invitation");
        }
      } catch {
        setError("Failed to load invitation");
      } finally {
        setLoading(false);
      }
    }
    fetchInvite();
  }, [token]);

  async function handleJoin() {
    if (!session) {
      router.push(`/login?callbackUrl=${encodeURIComponent(window.location.href)}`);
      return;
    }

    setJoining(true);
    try {
      const res = await fetch(`/api/invite/${token}`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Welcome to ${invite.team.name}! 🎉`);
        router.push(`/teams/${data.teamId}`);
      } else {
        toast.error(data.error || "Failed to join team");
      }
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setJoining(false);
    }
  }

  if (loading || status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
          <p className="text-sm text-muted-foreground animate-pulse">Verifying invitation...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="max-w-md w-full bg-card rounded-3xl border border-border shadow-2xl p-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Invitation Error</h1>
          <p className="text-muted-foreground mb-8">{error}</p>
          <button
            onClick={() => router.push("/")}
            className="w-full py-3 rounded-2xl bg-accent hover:bg-accent/80 font-semibold transition-all"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-500/10 blur-[120px] rounded-full" />
      
      <div className="max-w-md w-full bg-card/50 backdrop-blur-xl rounded-[40px] border border-border/50 shadow-2xl p-8 md:p-12 text-center relative z-10">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mx-auto mb-8 shadow-xl shadow-indigo-500/20">
          <Users className="w-10 h-10 text-white" />
        </div>
        
        <h1 className="text-3xl font-black mb-2 tracking-tight">You&apos;re Invited!</h1>
        <p className="text-muted-foreground mb-8">
          You have been invited to join <span className="text-foreground font-bold">{invite.team.name}</span> as a <span className="text-indigo-500 font-bold">{invite.role}</span>.
        </p>

        <div className="bg-accent/30 rounded-3xl p-6 mb-8 border border-border/50">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-indigo-500" />
            </div>
            <div className="text-left">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Role Access</p>
              <p className="text-sm font-semibold">{invite.role === 'ADMIN' ? 'Full Control' : 'Member Access'}</p>
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground text-left leading-relaxed">
            By joining, you will be able to see all team tasks, participate in discussions, and collaborate with other members.
          </p>
        </div>

        <button
          onClick={handleJoin}
          disabled={joining}
          className={cn(
            "group relative w-full py-4 rounded-[20px] bg-indigo-600 text-white font-bold text-lg shadow-lg shadow-indigo-600/30 transition-all hover:bg-indigo-700 active:scale-[0.98] disabled:opacity-50",
            joining && "cursor-not-allowed"
          )}
        >
          {joining ? (
            <div className="flex items-center justify-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Joining...</span>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2">
              <span>{session ? "Join the Team" : "Login to Join"}</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </div>
          )}
        </button>
        
        {!session && (
          <p className="text-xs text-muted-foreground mt-4">
            Don&apos;t have an account? You can create one after clicking.
          </p>
        )}
      </div>
    </div>
  );
}
