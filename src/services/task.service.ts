import { prisma } from "@/lib/prisma";
import { TaskCreateInput, TaskUpdateInput } from "@/lib/validators";
import { TaskStatus } from "@prisma/client";

export async function createTask(userId: string, data: TaskCreateInput) {
  try {
    const taskData: any = {
      title: data.title,
      description: data.description,
      priority: data.priority,
      status: data.status,
      type: data.type,
      isPersonal: data.isPersonal,
      restrictStatusUpdates: data.restrictStatusUpdates,
      creatorId: userId,
      teamId: data.teamId || null,
      parentId: data.parentId || null,
      assignees: {
        create: data.assigneeIds?.map((id) => ({ userId: id })) || [],
      },
      labels: {
        create: data.labelIds?.map((id) => ({ labelId: id })) || [],
      },
    };

    if (data.type === "RECURRING" && data.frequency) {
      taskData.recurringRule = {
        create: {
          frequency: data.frequency,
          interval: data.interval || 1,
          leadTime: data.leadTime || 0,
        }
      };
    }

    if (data.dueDate) {
      const date = new Date(data.dueDate);
      if (!isNaN(date.getTime())) taskData.dueDate = date;
    }
    
    if (data.startDate) {
      const date = new Date(data.startDate);
      if (!isNaN(date.getTime())) taskData.startDate = date;
    }

    const task = await prisma.task.create({
      data: taskData,
      include: {
        assignees: { include: { user: true } },
        labels: { include: { label: true } },
        creator: true,
        subtasks: true,
        recurringRule: true,
      },
    });

    // Log activity
    try {
      await prisma.activityLog.create({
        data: {
          action: "created",
          taskId: task.id,
          userId,
          details: JSON.stringify({ title: task.title }),
        },
      });
    } catch (e) {
      console.error("Activity log failed:", e);
    }

    // Send assignment notifications and emails
    if (data.assigneeIds && data.assigneeIds.length > 0) {
      try {
        const { sendEmail, buildAssignmentEmailHtml } = await import("@/lib/email");
        const creator = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
        
        for (const uid of data.assigneeIds) {
          if (uid === userId) continue;

          // Create in-app notification
          await prisma.notification.create({
            data: {
              type: "assignment",
              title: "New Task Assigned",
              content: `${creator?.name || "Someone"} assigned you to "${task.title}"`,
              link: `/tasks?taskId=${task.id}`,
              userId: uid,
            },
          });

          const assignee = await prisma.user.findUnique({ 
            where: { id: uid },
            include: { notificationPrefs: true }
          });
          
          if (assignee?.email && assignee.notificationPrefs?.onAssigned) {
            const html = buildAssignmentEmailHtml(
              task.title,
              creator?.name || "A team member",
              `${process.env.NEXTAUTH_URL}/tasks?taskId=${task.id}`
            );
            await sendEmail({ to: assignee.email, subject: "New Task Assignment", html });
          }
        }
      } catch (e) {
        console.error("Notifications failed:", e);
      }
    }

    return task;
  } catch (error: any) {
    console.error("Service: createTask error:", error);
    throw error;
  }
}

export async function getUserTasks(userId: string, filters?: {
  status?: TaskStatus;
  teamId?: string;
  search?: string;
  personal?: boolean;
  type?: string;
}) {
  const where: Record<string, unknown> = {
    parentId: null, // Only top-level tasks
    OR: [
      { assignees: { some: { userId } } }, // Tasks assigned to me
      {
        assignees: { none: {} }, // Unassigned tasks
        OR: [
          { creatorId: userId, isPersonal: true }, // My unassigned personal tasks
          { team: { members: { some: { userId } } } } // Unassigned tasks in my teams
        ]
      }
    ],
  };

  if (filters?.status) where.status = filters.status;
  if (filters?.teamId) where.teamId = filters.teamId;
  if (filters?.type) where.type = filters.type;
  if (filters?.personal) {
    where.isPersonal = true;
    where.creatorId = userId;
  }
  if (filters?.search) {
    where.AND = [
      {
        OR: [
          { title: { contains: filters.search, mode: "insensitive" } },
          { description: { contains: filters.search, mode: "insensitive" } },
        ],
      },
    ];
  }

  return prisma.task.findMany({
    where: where as never,
    include: {
      assignees: { include: { user: { select: { id: true, name: true, email: true, image: true } } } },
      labels: { include: { label: true } },
      creator: { select: { id: true, name: true, email: true, image: true } },
      subtasks: { select: { id: true, title: true, status: true } },
      recurringRule: true,
      team: { select: { id: true, name: true, color: true } },
      _count: { select: { comments: true, attachments: true, instances: true } },
    },
    orderBy: [{ position: "asc" }, { createdAt: "desc" }],
  });
}

export async function getTaskById(taskId: string) {
  return prisma.task.findUnique({
    where: { id: taskId },
    include: {
      assignees: { include: { user: true } },
      labels: { include: { label: true } },
      creator: true,
      subtasks: {
        include: {
          assignees: { include: { user: true } },
        },
        orderBy: { position: "asc" },
      },
      comments: {
        include: {
          author: true,
          reactions: { include: { user: true } },
        },
        orderBy: { createdAt: "asc" },
      },
      attachments: true,
      activityLogs: {
        include: { user: true },
        orderBy: { createdAt: "desc" },
        take: 20,
      },
      recurringRule: true,
      team: {
        include: { members: { include: { user: true } } },
      },
    },
  });
}

export async function updateTask(taskId: string, userId: string, data: TaskUpdateInput) {
  const oldTask = await prisma.task.findUnique({ 
    where: { id: taskId },
    include: { assignees: true, recurringRule: true }
  });

  if (!oldTask) throw new Error("Task not found");

  const updateData: Record<string, unknown> = {};
  if (data.title !== undefined) updateData.title = data.title;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.priority !== undefined) updateData.priority = data.priority;
  
  if (data.status !== undefined) {
    if (data.status !== oldTask.status && oldTask.restrictStatusUpdates) {
      const isCreator = oldTask.creatorId === userId;
      const isAssignee = oldTask.assignees.some((a) => a.userId === userId);
      const hasAssignees = oldTask.assignees.length > 0;
      
      let isTeamAdmin = false;
      if (oldTask.teamId) {
        try {
          const teamMember = await prisma.teamMember.findUnique({
            where: { teamId_userId: { teamId: oldTask.teamId, userId } }
          });
          isTeamAdmin = teamMember?.role === "ADMIN";
        } catch (e) {
          console.error("Team check failed:", e);
        }
      }

      if (!isCreator && !isAssignee && !isTeamAdmin && hasAssignees) {
        throw new Error("Status updates are restricted to the creator and assignees for this task.");
      }
    }
    updateData.status = data.status;
    if (data.status === "DONE") updateData.completedAt = new Date();
    else if (oldTask.status === "DONE") updateData.completedAt = null;
  }

  if (data.isPersonal !== undefined) updateData.isPersonal = data.isPersonal;
  if (data.restrictStatusUpdates !== undefined) {
    if (oldTask.creatorId !== userId) {
      throw new Error("Only the creator can toggle status restrictions");
    }
    updateData.restrictStatusUpdates = data.restrictStatusUpdates;
  }
  
  if (data.type !== undefined) updateData.type = data.type;
  
  const isNowRecurring = data.type === "RECURRING" || (data.type === undefined && oldTask.type === "RECURRING");
  
  if (isNowRecurring && (data.frequency !== undefined || data.interval !== undefined || data.leadTime !== undefined)) {
    updateData.recurringRule = {
      upsert: {
        create: {
          frequency: data.frequency || oldTask.recurringRule?.frequency || "DAILY",
          interval: data.interval !== undefined ? data.interval : (oldTask.recurringRule?.interval || 1),
          leadTime: data.leadTime !== undefined ? data.leadTime : (oldTask.recurringRule?.leadTime || 0),
        },
        update: {
          ...(data.frequency !== undefined && { frequency: data.frequency }),
          ...(data.interval !== undefined && { interval: data.interval }),
          ...(data.leadTime !== undefined && { leadTime: data.leadTime }),
        }
      }
    };
  } else if ((data.type === "ONE_TIME" && oldTask.type === "RECURRING") || (data.type === undefined && oldTask.type === "RECURRING" && data.frequency === null)) {
    if (oldTask.recurringRule) {
      updateData.recurringRule = { delete: true };
    }
  }

  if (data.dueDate !== undefined) updateData.dueDate = data.dueDate ? new Date(data.dueDate) : null;
  if (data.startDate !== undefined) updateData.startDate = data.startDate ? new Date(data.startDate) : null;
  if (data.position !== undefined) updateData.position = data.position;
  if (data.teamId !== undefined) updateData.teamId = data.teamId || null;

  const task = await prisma.task.update({
    where: { id: taskId },
    data: updateData,
    include: {
      assignees: { include: { user: true } },
      labels: { include: { label: true } },
      creator: true,
      subtasks: true,
    },
  });

  if (data.assigneeIds) {
    await prisma.taskAssignee.deleteMany({ where: { taskId } });
    if (data.assigneeIds.length > 0) {
      await prisma.taskAssignee.createMany({
        data: data.assigneeIds.map((uid) => ({ taskId, userId: uid })),
      });
    }
  }

  if (data.labelIds) {
    await prisma.taskLabel.deleteMany({ where: { taskId } });
    if (data.labelIds.length > 0) {
      await prisma.taskLabel.createMany({
        data: data.labelIds.map((lid) => ({ taskId, labelId: lid })),
      });
    }
  }

  const changes: string[] = [];
  if (data.status && oldTask?.status !== data.status) changes.push(`status: ${oldTask?.status} -> ${data.status}`);
  if (data.priority && oldTask?.priority !== data.priority) changes.push(`priority: ${oldTask?.priority} -> ${data.priority}`);
  if (data.title && oldTask?.title !== data.title) changes.push(`title updated`);

  if (changes.length > 0) {
    try {
      await prisma.activityLog.create({
        data: {
          action: "updated",
          taskId,
          userId,
          details: JSON.stringify({ changes }),
        },
      });

      if (data.status && data.status !== oldTask.status) {
        const recipients = new Set([oldTask.creatorId, ...oldTask.assignees.map(a => a.userId)]);
        recipients.delete(userId);

        for (const rid of recipients) {
          await prisma.notification.create({
            data: {
              type: "status_change",
              title: "Task Status Updated",
              content: `"${task.title}" is now ${data.status}`,
              link: `/tasks?taskId=${taskId}`,
              userId: rid,
            },
          });
        }
      }
    } catch (e) {
      console.error("Post-update actions failed:", e);
    }

    if (data.status && oldTask?.status !== data.status) {
      try {
        const { sendEmail } = await import("@/lib/email");
        const updater = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
        
        const assigneesToEmail = await prisma.user.findMany({
          where: {
            id: { in: task.assignees.map((a) => a.userId), not: userId },
            notificationPrefs: { onStatusChange: true }
          }
        });

        for (const user of assigneesToEmail) {
          if (!user.email) continue;
          const html = `
            <div style="font-family: sans-serif; max-w: 600px; margin: 0 auto;">
              <h2 style="color: #4f46e5;">Task Status Updated</h2>
              <p><strong>${updater?.name || "A team member"}</strong> moved <strong>${task.title}</strong> to <strong>${data.status}</strong>.</p>
              <a href="${process.env.NEXTAUTH_URL}/tasks?taskId=${task.id}" style="display: inline-block; background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin-top: 16px;">
                View Task
              </a>
            </div>
          `;
          await sendEmail({ to: user.email, subject: `Task Update: ${task.title}`, html });
        }
      } catch (e) {
        console.error("Email notification failed:", e);
      }
    }
  }

  return task;
}

export async function deleteTask(taskId: string, userId: string) {
  await prisma.task.delete({ where: { id: taskId } });
  return { success: true };
}

export async function getDashboardStats(userId: string, startDate?: Date, endDate?: Date) {
  const now = new Date();
  const defStartOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  // Use provided range or default to "today/this week" logic
  const start = startDate || defStartOfDay;
  const end = endDate || new Date(defStartOfDay.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days ahead for upcoming

  const baseWhere = {
    OR: [
      { creatorId: userId },
      { assignees: { some: { userId } } },
    ],
  };

  const [dueInPeriod, overdue, completedInPeriod, upcoming, totalByStatus, activeAutomations, totalInPeriod] = await Promise.all([
    prisma.task.count({
      where: { ...baseWhere, dueDate: { gte: start, lt: end }, status: { not: "DONE" } } as never,
    }),
    prisma.task.count({
      where: { ...baseWhere, dueDate: { lt: start }, status: { not: "DONE" } } as never,
    }),
    prisma.task.count({
      where: { ...baseWhere, status: "DONE", completedAt: { gte: start, lt: end } } as never,
    }),
    prisma.task.findMany({
      where: { ...baseWhere, dueDate: { gte: start, lt: end }, status: { not: "DONE" } } as never,
      include: { assignees: { include: { user: { select: { name: true, image: true } } } } },
      orderBy: { dueDate: "asc" },
      take: 10,
    }),
    prisma.task.groupBy({
      by: ["status"],
      where: { ...baseWhere, createdAt: { gte: start, lt: end } } as never,
      _count: true,
    }),
    prisma.task.count({
      where: { ...baseWhere, type: "RECURRING" } as never,
    }),
    prisma.task.count({
      where: { ...baseWhere, createdAt: { gte: start, lt: end } } as never,
    }),
  ]);

  return { 
    dueInPeriod, 
    overdue, 
    completedInPeriod, 
    completionRate: totalInPeriod > 0 ? Math.round((completedInPeriod / totalInPeriod) * 100) : 0,
    upcoming, 
    totalByStatus, 
    activeAutomations: activeAutomations || 0,
    period: { start, end }
  };
}
