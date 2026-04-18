import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { taskIds } = await req.json();

    if (!Array.isArray(taskIds) || taskIds.length === 0) {
      return NextResponse.json({ error: "No tasks specified" }, { status: 400 });
    }

    // Only allow deleting tasks the user created or was assigned to (and isn't personal to someone else)
    // For simplicity in this demo, we allow deleting tasks where the user is creator or an assignee
    const tasksToDelete = await prisma.task.findMany({
      where: {
        id: { in: taskIds },
        OR: [
          { creatorId: session.user.id },
          { assignees: { some: { userId: session.user.id } } },
        ]
      },
      select: { id: true }
    });

    const validTaskIds = tasksToDelete.map(t => t.id);

    if (validTaskIds.length > 0) {
      await prisma.task.deleteMany({
        where: { id: { in: validTaskIds } }
      });
    }

    return NextResponse.json({ success: true, deletedCount: validTaskIds.length });
  } catch (error) {
    console.error("Bulk delete error:", error);
    return NextResponse.json({ error: "Failed to delete tasks" }, { status: 500 });
  }
}
