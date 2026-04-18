"use client";

import { Search, Bell, Command, CheckCircle2, AlertCircle, Plus, MessageSquare } from "lucide-react";
import { useState, useEffect } from "react";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function Topbar() {
  const [searchFocused, setSearchFocused] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    let lastCount = -1;
    async function fetchNotifications() {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = await res.json();
        const unread = data.filter((n: any) => !n.read).length;
        if (lastCount !== -1 && unread > lastCount) {
          const latest = data.find((n: any) => !n.read);
          if (latest) {
            import("sonner").then(({ toast }) => {
              toast.info(latest.title, {
                description: latest.content,
                action: {
                  label: "View",
                  onClick: () => {
                    if (latest.link) window.location.href = latest.link;
                  }
                }
              });
            });
          }
        }
        console.log("Notifications received:", data);
        setNotifications(data);
        lastCount = unread;
      }
    }
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 5000); // Poll every 5s
    return () => clearInterval(interval);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  async function markAsRead(id?: string) {
    const res = await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(id ? { id } : { readAll: true }),
    });
    if (res.ok) {
      setNotifications(prev => 
        id 
          ? prev.map(n => n.id === id ? { ...n, read: true } : n)
          : prev.map(n => ({ ...n, read: true }))
      );
    }
  }

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-border/50 bg-card/80 backdrop-blur-xl px-6 py-3">
      {/* Search */}
      <div className="relative flex-1 max-w-xl">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <input
          type="text"
          placeholder="Search tasks, teams, people..."
          className="w-full rounded-xl border border-border/50 bg-accent/50 py-2 pl-10 pr-20 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all"
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
          suppressHydrationWarning
        />
        <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:inline-flex items-center gap-1 rounded-md border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
          <Command size={10} /> K
        </kbd>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-2">
        <div className="relative">
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 rounded-xl hover:bg-accent transition-colors"
          >
            <Bell size={20} className="text-muted-foreground" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-indigo-500 border-2 border-card" />
            )}
          </button>

          {showNotifications && (
            <>
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setShowNotifications(false)}
              />
              <div className="absolute right-0 mt-2 w-80 bg-card border border-border rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="flex items-center justify-between p-4 border-b border-border/50 bg-accent/30">
                  <h3 className="text-sm font-bold">Notifications</h3>
                  {unreadCount > 0 && (
                    <button 
                      onClick={() => markAsRead()}
                      className="text-[10px] font-bold text-indigo-500 hover:text-indigo-600 uppercase tracking-wider"
                    >
                      Mark all as read
                    </button>
                  )}
                </div>
                <div className="max-h-[400px] overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-8 text-center">
                      <Bell size={32} className="mx-auto mb-2 text-muted-foreground opacity-20" />
                      <p className="text-xs text-muted-foreground">No notifications yet</p>
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div 
                        key={n.id}
                        className={cn(
                          "p-4 border-b border-border/30 hover:bg-accent/50 transition-colors cursor-pointer relative group",
                          !n.read && "bg-indigo-500/5"
                        )}
                        onClick={() => {
                          if (!n.read) markAsRead(n.id);
                          if (n.link) window.location.href = n.link;
                        }}
                      >
                        <div className="flex gap-3">
                          <div className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                            n.type === "mention" ? "bg-purple-100 text-purple-600" : 
                            n.type === "assignment" ? "bg-blue-100 text-blue-600" :
                            n.type === "reminder" ? "bg-amber-100 text-amber-600" :
                            n.type === "status_change" ? "bg-green-100 text-green-600" :
                            n.type === "comment" ? "bg-indigo-100 text-indigo-600" :
                            "bg-indigo-100 text-indigo-600"
                          )}>
                            {n.type === "mention" ? <AlertCircle size={14} /> : 
                             n.type === "assignment" ? <Plus size={14} /> :
                             n.type === "reminder" ? <Bell size={14} /> :
                             n.type === "status_change" ? <CheckCircle2 size={14} /> :
                             n.type === "comment" ? <MessageSquare size={14} /> :
                             <CheckCircle2 size={14} />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-foreground truncate">{n.title}</p>
                            <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">{n.content}</p>
                            <p className="text-[10px] text-muted-foreground mt-1.5 uppercase tracking-tighter">
                              {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                            </p>
                          </div>
                          {!n.read && (
                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5" />
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <div className="p-3 bg-accent/30 border-t border-border/50 text-center">
                  <button className="text-[10px] font-bold text-muted-foreground hover:text-foreground uppercase tracking-wider">
                    View all history
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
