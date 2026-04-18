"use client";

import { useState, useEffect } from "react";
import { getInitials, cn } from "@/lib/utils";
import { Send, Smile } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

type Comment = {
  id: string;
  content: string;
  createdAt: string;
  author: { id: string; name: string | null; email: string; image: string | null };
  reactions: { id: string; emoji: string; user: { id: string; name: string | null } }[];
};

const QUICK_EMOJIS = ["👍", "❤️", "🎉", "😄", "🚀", "👀"];

export function CommentThread({
  taskId,
  comments: initialComments,
  currentUserId,
  teamMembers = [],
}: {
  taskId: string;
  comments: Comment[];
  currentUserId: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  teamMembers?: any[];
}) {
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [newComment, setNewComment] = useState("");
  const [sending, setSending] = useState(false);
  const [showEmojiFor, setShowEmojiFor] = useState<string | null>(null);
  const [mentionSearch, setMentionSearch] = useState<string | null>(null);
  const [mentionIndex, setMentionIndex] = useState(0);

  // Sync with parent data if it changes
  useEffect(() => {
    setComments(initialComments);
  }, [initialComments]);

  const filteredMembers = mentionSearch !== null
    ? teamMembers.filter(m => 
        !mentionSearch || 
        m.user.name?.toLowerCase().includes(mentionSearch.toLowerCase()) || 
        m.user.email.toLowerCase().includes(mentionSearch.toLowerCase())
      ).slice(0, 5)
    : [];

  async function handleSend() {
    if (!newComment.trim()) return;
    
    const content = newComment.trim();
    setNewComment("");
    setSending(true);

    // Optimistic Update
    const tempId = `temp-${Date.now()}`;
    const optimisticComment: Comment = {
      id: tempId,
      content,
      createdAt: new Date().toISOString(),
      author: { 
        id: currentUserId, 
        name: "You", 
        email: "", 
        image: null 
      },
      reactions: [],
    };
    
    setComments(prev => [...prev, optimisticComment]);

    try {
      const res = await fetch(`/api/tasks/${taskId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (res.ok) {
        const comment = await res.json();
        // Replace optimistic comment with real one
        setComments((prev) => prev.map(c => c.id === tempId ? comment : c));
      } else {
        throw new Error();
      }
    } catch {
      toast.error("Failed to post comment");
      // Remove optimistic comment on failure
      setComments(prev => prev.filter(c => c.id !== tempId));
    } finally {
      setSending(false);
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    const cursor = e.target.selectionStart || 0;
    setNewComment(val);

    // Look for @ before cursor
    const textBeforeCursor = val.slice(0, cursor);
    const lastAtSymbol = textBeforeCursor.lastIndexOf("@");
    
    if (lastAtSymbol !== -1 && (lastAtSymbol === 0 || textBeforeCursor[lastAtSymbol - 1] === " ")) {
      const query = textBeforeCursor.slice(lastAtSymbol + 1);
      if (!query.includes(" ")) {
        setMentionSearch(query);
        setMentionIndex(0);
        return;
      }
    }
    setMentionSearch(null);
  }

  function insertMention(member: any) {
    const cursor = newComment.lastIndexOf("@" + mentionSearch);
    const textBefore = newComment.slice(0, cursor);
    const textAfter = newComment.slice(cursor + (mentionSearch?.length || 0) + 1);
    const mention = `@${member.user.name || member.user.email} `;
    setNewComment(textBefore + mention + textAfter);
    setMentionSearch(null);
  }

  async function handleReaction(commentId: string, emoji: string) {
    try {
      const res = await fetch(`/api/tasks/${taskId}/comments/${commentId}/reactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emoji }),
      });
      if (res.ok) {
        // Refresh comments
        const commentsRes = await fetch(`/api/tasks/${taskId}/comments`);
        if (commentsRes.ok) setComments(await commentsRes.json());
      }
    } catch {
      toast.error("Failed to react");
    }
    setShowEmojiFor(null);
  }

  // Group reactions by emoji
  function groupReactions(reactions: Comment["reactions"]) {
    const grouped: Record<string, { count: number; users: string[]; hasMe: boolean }> = {};
    reactions.forEach((r) => {
      if (!grouped[r.emoji]) grouped[r.emoji] = { count: 0, users: [], hasMe: false };
      grouped[r.emoji].count++;
      grouped[r.emoji].users.push(r.user.name || "Someone");
      if (r.user.id === currentUserId) grouped[r.emoji].hasMe = true;
    });
    return grouped;
  }

  return (
    <div className="flex flex-col h-full relative">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-4">
        {comments.length === 0 ? (
          <p className="text-center text-muted-foreground text-sm py-8">
            No comments yet. Start the conversation!
          </p>
        ) : (
          [...comments].reverse().map((comment) => {
            const isMe = comment.author.id === currentUserId;
            const grouped = groupReactions(comment.reactions);

            return (
              <div key={comment.id} className={cn("flex gap-3", isMe && "flex-row-reverse")}>
                {/* Avatar */}
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                  {comment.author.image ? (
                    <img src={comment.author.image} alt="" className="w-8 h-8 rounded-full" />
                  ) : (
                    getInitials(comment.author.name)
                  )}
                </div>

                {/* Bubble */}
                <div className={cn("max-w-[75%]", isMe && "items-end")}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold">{comment.author.name || comment.author.email}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {format(new Date(comment.createdAt), "MMM d, h:mm a")}
                    </span>
                  </div>
                  <div
                    className={cn(
                      "rounded-2xl px-3.5 py-2 text-sm whitespace-pre-wrap shadow-sm",
                      isMe
                        ? "bg-indigo-600 text-white rounded-tr-sm"
                        : "bg-accent/50 rounded-tl-sm border border-border/50"
                    )}
                  >
                    {(() => {
                      // Create a regex that matches any of the team member names prefixed with @
                      const names = teamMembers
                        .map(m => m.user.name)
                        .filter(Boolean)
                        .sort((a, b) => b!.length - a!.length); // Sort by length descending to match longest first
                      
                      if (names.length === 0) return comment.content;

                      const escapedNames = names.map(n => n!.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
                      const regex = new RegExp(`(@(?:${escapedNames.join("|")}))`, "g");
                      
                      return comment.content.split(regex).map((part, i) => 
                        part.startsWith("@") ? (
                          <span key={i} className="font-bold underline cursor-help text-indigo-200">{part}</span>
                        ) : part
                      );
                    })()}
                  </div>

                  {/* Reactions */}
                  <div className="flex items-center gap-1 mt-1 flex-wrap">
                    {Object.entries(grouped).map(([emoji, data]) => (
                      <button
                        key={emoji}
                        onClick={() => handleReaction(comment.id, emoji)}
                        className={cn(
                          "flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-colors",
                          data.hasMe
                            ? "border-indigo-300 bg-indigo-50 dark:bg-indigo-950"
                            : "border-border hover:bg-accent"
                        )}
                        title={data.users.join(", ")}
                      >
                        <span>{emoji}</span>
                        <span className="font-medium">{data.count}</span>
                      </button>
                    ))}
                    <div className="relative">
                      <button
                        onClick={() => setShowEmojiFor(showEmojiFor === comment.id ? null : comment.id)}
                        className="p-1 rounded-full hover:bg-accent transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Smile size={14} className="text-muted-foreground" />
                      </button>
                      {showEmojiFor === comment.id && (
                        <div className="absolute bottom-full left-0 mb-1 flex gap-1 bg-card border border-border rounded-xl p-2 shadow-lg z-10">
                          {QUICK_EMOJIS.map((e) => (
                            <button
                              key={e}
                              onClick={() => handleReaction(comment.id, e)}
                              className="hover:scale-125 transition-transform text-lg"
                            >
                              {e}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Input */}
      <div className="border-t border-border/50 pt-3 relative">
        {/* Mention Dropdown */}
        {mentionSearch !== null && filteredMembers.length > 0 && (
          <div className="absolute bottom-full left-0 w-64 bg-card border border-border rounded-xl shadow-2xl mb-3 overflow-hidden z-[100] animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div className="p-2 border-b border-border bg-muted/50 text-[10px] font-bold text-muted-foreground uppercase">
              Team Members
            </div>
            {filteredMembers.map((m, i) => (
              <button
                key={m.userId}
                onClick={() => insertMention(m)}
                onMouseEnter={() => setMentionIndex(i)}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors",
                  i === mentionIndex ? "bg-indigo-500 text-white" : "hover:bg-accent"
                )}
              >
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-[10px] font-bold">
                  {m.user.image ? <img src={m.user.image} alt="" className="w-6 h-6 rounded-full" /> : getInitials(m.user.name)}
                </div>
                <div className="text-left flex-1 truncate">
                  <div className="font-medium">{m.user.name || "Unknown"}</div>
                  <div className={cn("text-[10px]", i === mentionIndex ? "text-indigo-100" : "text-muted-foreground")}>{m.user.email}</div>
                </div>
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newComment}
            onChange={handleInputChange}
            onKeyDown={(e) => {
              if (mentionSearch !== null && filteredMembers.length > 0) {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setMentionIndex((i) => (i + 1) % filteredMembers.length);
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setMentionIndex((i) => (i - 1 + filteredMembers.length) % filteredMembers.length);
                } else if (e.key === "Enter" || e.key === "Tab") {
                  e.preventDefault();
                  insertMention(filteredMembers[mentionIndex]);
                } else if (e.key === "Escape") {
                  setMentionSearch(null);
                }
              } else if (e.key === "Enter" && !e.shiftKey) {
                handleSend();
              }
            }}
            placeholder="Write a comment... Use @ to mention"
            className="flex-1 rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
          <button
            onClick={handleSend}
            disabled={sending || !newComment.trim()}
            className="p-2.5 rounded-xl bg-indigo-500 text-white hover:bg-indigo-600 transition-colors disabled:opacity-50"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
