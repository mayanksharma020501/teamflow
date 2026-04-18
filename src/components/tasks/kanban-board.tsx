"use client";

import { useState, useMemo } from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { TaskCard } from "./task-card";
import { cn, statusLabel } from "@/lib/utils";
import { Plus } from "lucide-react";
import { toast } from "sonner";

type Task = {
  id: string;
  title: string;
  priority: string;
  status: string;
  type: "ONE_TIME" | "RECURRING";
  recurringRule?: { frequency: string; interval: number } | null;
  dueDate: string | null;
  assignees: { user: { id: string; name: string | null; image: string | null } }[];
  labels: { label: { id: string; name: string; color: string } }[];
  subtasks: { id: string; status: string }[];
  _count?: { comments: number; attachments: number };
};

const COLUMNS = ["TODO", "IN_PROGRESS", "REVIEW", "DONE"] as const;
const COLUMN_COLORS: Record<string, string> = {
  TODO: "border-t-slate-400",
  IN_PROGRESS: "border-t-blue-500",
  REVIEW: "border-t-amber-500",
  DONE: "border-t-green-500",
};

function Column({
  status,
  tasks,
  onNewTask,
  onTaskClick,
}: {
  status: string;
  tasks: Task[];
  onNewTask: () => void;
  onTaskClick: (id: string) => void;
}) {
  const { isOver, setNodeRef } = useDroppable({ id: status });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex flex-col bg-accent/30 rounded-xl border-t-4 min-h-[calc(100vh-200px)] transition-colors",
        COLUMN_COLORS[status],
        isOver && "bg-indigo-50/50 dark:bg-indigo-950/20"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-foreground">
            {statusLabel(status)}
          </h3>
          <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full font-medium">
            {tasks.length}
          </span>
        </div>
        <button
          onClick={onNewTask}
          className="p-1 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
        >
          <Plus size={16} />
        </button>
      </div>

      {/* Cards */}
      <div className="flex-1 px-3 pb-3 space-y-2 overflow-y-auto">
        <SortableContext
          items={tasks.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} onClick={() => onTaskClick(task.id)} />
          ))}
        </SortableContext>

        {tasks.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <p className="text-xs">No tasks</p>
          </div>
        )}
      </div>
    </div>
  );
}

export function KanbanBoard({
  tasks: initialTasks,
  onStatusChange,
  onNewTask,
  onTaskClick,
}: {
  tasks: Task[];
  onStatusChange: (taskId: string, newStatus: string) => Promise<void>;
  onNewTask: (status?: string) => void;
  onTaskClick: (id: string) => void;
}) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  // Update when props change
  useMemo(() => setTasks(initialTasks), [initialTasks]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  const tasksByColumn = useMemo(() => {
    const grouped: Record<string, Task[]> = {};
    COLUMNS.forEach((col) => {
      grouped[col] = tasks.filter((t) => t.status === col);
    });
    return grouped;
  }, [tasks]);

  function handleDragStart(event: DragStartEvent) {
    const task = tasks.find((t) => t.id === event.active.id);
    if (task) setActiveTask(task);
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeTask = tasks.find((t) => t.id === activeId);
    if (!activeTask) return;

    // Determine target column
    let targetColumn = overId;
    const overTask = tasks.find((t) => t.id === overId);
    if (overTask) {
      targetColumn = overTask.status;
    }

    if (activeTask.status !== targetColumn && COLUMNS.includes(targetColumn as typeof COLUMNS[number])) {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === activeId ? { ...t, status: targetColumn } : t
        )
      );
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveTask(null);
    const { active } = event;
    const activeId = active.id as string;
    const task = tasks.find((t) => t.id === activeId);
    if (!task) return;

    // Find original status
    const originalTask = initialTasks.find((t) => t.id === activeId);
    if (originalTask && originalTask.status !== task.status) {
      try {
        await onStatusChange(activeId, task.status);
        toast.success(`Moved to ${statusLabel(task.status)}`);
      } catch {
        setTasks(initialTasks);
        toast.error("Failed to update task");
      }
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-4 gap-4">
        {COLUMNS.map((col) => (
          <Column
            key={col}
            status={col}
            tasks={tasksByColumn[col] || []}
            onNewTask={() => onNewTask(col)}
            onTaskClick={onTaskClick}
          />
        ))}
      </div>

      <DragOverlay>
        {activeTask && (
          <div className="drag-overlay">
            <TaskCard task={activeTask} isDragging />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
