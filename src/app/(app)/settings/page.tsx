"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useTheme } from "next-themes";
import { Save, Sun, Moon, Monitor, Bell, BellOff } from "lucide-react";
import { toast } from "sonner";
import { cn, getInitials } from "@/lib/utils";

export default function SettingsPage() {
  const { data: session, update } = useSession();
  const { theme, setTheme } = useTheme();
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [notifs, setNotifs] = useState({
    onAssigned: true, onDueDate: true, onMention: true,
    onStatusChange: true, onRecurring: true, weeklyDigest: false,
  });

  // Sync name state when session loads
  useEffect(() => {
    if (session?.user?.name && !name) {
      setName(session.user.name);
    }
  }, [session, name]);

  const themes = [
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
    { value: "system", label: "System", icon: Monitor },
  ];

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, notifications: notifs }),
      });
      if (res.ok) {
        await update();
        toast.success("Settings saved!");
      }
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  const notifOptions = [
    { key: "onAssigned", label: "When a task is assigned to me", icon: "📋" },
    { key: "onDueDate", label: "Due date reminders", icon: "⏰" },
    { key: "onMention", label: "When I'm @mentioned in a comment", icon: "💬" },
    { key: "onStatusChange", label: "When a task's status changes", icon: "🔄" },
    { key: "onRecurring", label: "When a recurring task is generated", icon: "🔁" },
    { key: "weeklyDigest", label: "Weekly digest email", icon: "📧" },
  ];

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-8">Settings</h1>

      {/* Profile */}
      <div className="bg-card rounded-xl border border-border/50 p-6 mb-6">
        <h2 className="text-sm font-semibold uppercase text-muted-foreground mb-4">Profile</h2>
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-xl font-bold">
            {session?.user?.image ? (
              <img src={session.user.image} alt="" className="w-16 h-16 rounded-2xl" />
            ) : (
              getInitials(session?.user?.name)
            )}
          </div>
          <div>
            <p className="font-semibold text-foreground">{session?.user?.name}</p>
            <p className="text-sm text-muted-foreground">{session?.user?.email}</p>
            <div className="pt-2">
              <button
                onClick={async () => {
                  try {
                    const res = await fetch("/api/notifications/test", { method: "POST" });
                    if (res.ok) {
                      import("sonner").then(({ toast }) => {
                        toast.success("Test notification sent! Check your bell icon.");
                      });
                    }
                  } catch (e) {
                    import("sonner").then(({ toast }) => {
                      toast.error("Failed to send test notification");
                    });
                  }
                }}
                className="text-xs text-indigo-500 hover:text-indigo-600 font-medium"
              >
                Send Test Notification
              </button>
            </div>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Display Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
      </div>

      {/* Appearance */}
      <div className="bg-card rounded-xl border border-border/50 p-6 mb-6">
        <h2 className="text-sm font-semibold uppercase text-muted-foreground mb-4">Appearance</h2>
        <div className="grid grid-cols-3 gap-3">
          {themes.map((t) => (
            <button
              key={t.value}
              onClick={() => setTheme(t.value)}
              className={cn(
                "flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all",
                theme === t.value
                  ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950"
                  : "border-border hover:border-indigo-300"
              )}
            >
              <t.icon size={24} className={theme === t.value ? "text-indigo-600" : "text-muted-foreground"} />
              <span className="text-sm font-medium">{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Notifications */}
      <div className="bg-card rounded-xl border border-border/50 p-6 mb-6">
        <h2 className="text-sm font-semibold uppercase text-muted-foreground mb-4">Notifications</h2>
        <div className="space-y-3">
          {notifOptions.map((opt) => (
            <div key={opt.key} className="flex items-center justify-between py-2">
              <span className="flex items-center gap-3 text-sm">
                <span>{opt.icon}</span>
                {opt.label}
              </span>
              <button
                onClick={() => setNotifs((n) => ({ ...n, [opt.key]: !n[opt.key as keyof typeof n] }))}
                className={cn(
                  "w-10 h-6 rounded-full transition-colors relative",
                  notifs[opt.key as keyof typeof notifs] ? "bg-indigo-500" : "bg-muted"
                )}
              >
                <span
                  className={cn(
                    "absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform",
                    notifs[opt.key as keyof typeof notifs] ? "left-[18px]" : "left-0.5"
                  )}
                />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Floating Save Bar */}
      <div className="fixed bottom-8 right-8 z-50">
        <button
          onClick={handleSave}
          disabled={saving || (name === session?.user?.name)}
          className={cn(
            "flex items-center gap-2 px-8 py-4 rounded-2xl font-bold text-white shadow-2xl transition-all active:scale-95 disabled:opacity-50 disabled:grayscale",
            saving ? "bg-indigo-400" : "bg-gradient-to-r from-indigo-500 via-indigo-600 to-purple-600 hover:shadow-indigo-500/25"
          )}
        >
          <Save size={18} />
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </div>
  );
}
