import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json([], { status: 401 });

  // Auto-generate reminders for tasks due soon (within 24h)
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  const upcomingTasks = await prisma.task.findMany({
    where: {
      OR: [
        { creatorId: session.user.id },
        { assignees: { some: { userId: session.user.id } } }
      ],
      dueDate: { lte: tomorrow, gte: new Date() },
      status: { not: "DONE" },
    },
    select: { id: true, title: true, dueDate: true }
  });

  for (const task of upcomingTasks) {
    const existing = await prisma.notification.findFirst({
      where: {
        userId: session.user.id,
        type: "reminder",
        link: `/tasks?taskId=${task.id}`,
      }
    });

    if (!existing) {
      await prisma.notification.create({
        data: {
          type: "reminder",
          title: "Upcoming Deadline",
          content: `"${task.title}" is due soon (${task.dueDate?.toLocaleDateString()})`,
          link: `/tasks?taskId=${task.id}`,
          userId: session.user.id,
        }
      });
    }
  }

  const notifications = await prisma.notification.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  console.log(`[Notifications] Found ${notifications.length} for user ${session.user.id}`);

  return NextResponse.json(notifications);
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, readAll } = await req.json();

  if (readAll) {
    await prisma.notification.updateMany({
      where: { userId: session.user.id, read: false },
      data: { read: true },
    });
  } else if (id) {
    await prisma.notification.update({
      where: { id, userId: session.user.id },
      data: { read: true },
    });
  }

  return NextResponse.json({ success: true });
}
