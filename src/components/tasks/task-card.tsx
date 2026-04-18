"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn, priorityColor, formatRelativeDate, getInitials } from "@/lib/utils";
import {
  Calendar,
  MessageSquare,
  Paperclip,
  GripVertical,
  CheckSquare,
} from "lucide-react";

interface TaskCardProps {
  task: {
    id: string;
    title: string;
    priority: string;
    type: "ONE_TIME" | "RECURRING";
    recurringRule?: {
      frequency: string;
      interval: number;
    } | null;
    dueDate: string | null;
    assignees: { user: { id: string; name: string | null; image: string | null } }[];
    labels: { label: { id: string; name: string; color: string } }[];
    subtasks: { id: string; status: string }[];
    _count?: { comments: number; attachments: number };
  };
  onClick?: () => void;
  isDragging?: boolean;
}

export function TaskCard({ task, onClick, isDragging }: TaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const completedSubtasks = task.subtasks.filter((s) => s.status === "DONE").length;
  const totalSubtasks = task.subtasks.length;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group bg-card border-2 border-border shadow-sm rounded-xl p-3.5 cursor-pointer transition-all hover:shadow-md",
        task.type === "RECURRING" 
          ? "border-indigo-400/50 bg-indigo-50/10 dark:bg-indigo-950/5" 
          : "hover:border-indigo-300 dark:hover:border-indigo-700",
        (isSortDragging || isDragging) && "opacity-50 shadow-xl rotate-2"
      )}
      onClick={onClick}
    >
      {/* Drag Handle + Labels + Recurring Badge */}
      <div className="flex items-center gap-2 mb-2">
        <button
          className="opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          <GripVertical size={14} className="text-muted-foreground" />
        </button>
        <div className="flex flex-wrap gap-1.5 flex-1">
          {task.labels.map((tl) => (
            <span
              key={tl.label.id}
              className="inline-block h-1.5 w-8 rounded-full"
              style={{ backgroundColor: tl.label.color }}
            />
          ))}
        </div>
        {task.type === "RECURRING" && (
          <span className="text-[9px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/30 px-1.5 py-0.5 rounded">
            Recurring
          </span>
        )}
      </div>

      {/* Title */}
      <h3 className="text-sm font-semibold text-foreground mb-2 line-clamp-2 pl-6">
        {task.title}
      </h3>

      {/* Meta row */}
      <div className="flex items-center gap-3 pl-6 flex-wrap">
        {/* Priority */}
        <span
          className={cn(
            "text-[10px] font-bold uppercase px-2 py-0.5 rounded-md",
            priorityColor(task.priority)
          )}
        >
          {task.priority}
        </span>

        {/* Due date */}
        {task.dueDate && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar size={12} />
            {formatRelativeDate(task.dueDate)}
          </span>
        )}

        {/* Subtasks */}
        {totalSubtasks > 0 && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <CheckSquare size={12} />
            {completedSubtasks}/{totalSubtasks}
          </span>
        )}

        {/* Comments */}
        {(task._count?.comments ?? 0) > 0 && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <MessageSquare size={12} />
            {task._count?.comments}
          </span>
        )}

        {/* Attachments */}
        {(task._count?.attachments ?? 0) > 0 && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Paperclip size={12} />
            {task._count?.attachments}
          </span>
        )}
      </div>

      {/* Assignees */}
      {task.assignees.length > 0 && (
        <div className="flex items-center gap-1 mt-3 pl-6">
          <div className="flex -space-x-2">
            {task.assignees.slice(0, 3).map((a) => (
              <div
                key={a.user.id}
                className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-[9px] font-bold text-white ring-2 ring-card"
                title={a.user.name || ""}
              >
                {a.user.image ? (
                  <img src={a.user.image} alt="" className="w-6 h-6 rounded-full" />
                ) : (
                  getInitials(a.user.name)
                )}
              </div>
            ))}
          </div>
          {task.assignees.length > 3 && (
            <span className="text-[10px] text-muted-foreground ml-1">
              +{task.assignees.length - 3}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
