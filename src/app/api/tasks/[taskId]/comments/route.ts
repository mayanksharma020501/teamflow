import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { commentCreateSchema } from "@/lib/validators";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { taskId } = await params;

  const comments = await prisma.comment.findMany({
    where: { taskId },
    include: {
      author: { select: { id: true, name: true, email: true, image: true } },
      reactions: { include: { user: { select: { id: true, name: true } } } },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(comments);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { taskId } = await params;

  try {
    const body = await req.json();
    const data = commentCreateSchema.parse(body);

    const comment = await prisma.comment.create({
      data: {
        content: data.content,
        taskId,
        authorId: session.user.id,
      },
      include: {
        author: { select: { id: true, name: true, email: true, image: true } },
        reactions: { include: { user: { select: { id: true, name: true } } } },
      },
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        action: "commented",
        taskId,
        userId: session.user.id,
        details: JSON.stringify({ preview: data.content.substring(0, 100) }),
      },
    });

    // Extract @mentions from content (support names with spaces, stop at punctuation)
    const mentionRegex = /@([^@\s,.;:!?]+(?:\s[^@\s,.;:!?]+)*)/g;
    const mentionQueries = [...data.content.matchAll(mentionRegex)].map((m) => m[1]);
    const notifiedUserIds = new Set<string>();

    if (mentionQueries.length > 0) {
      // Run notifications in a separate block to avoid blocking the comment itself
      try {
        const task = await prisma.task.findUnique({ where: { id: taskId }, select: { title: true } });
        const { sendEmail, buildMentionEmailHtml } = await import("@/lib/email");

        for (const query of mentionQueries) {
          // Find user by name or email
          const mentionedUser = await prisma.user.findFirst({
            where: {
              OR: [
                { name: { equals: query, mode: "insensitive" } },
                { email: { equals: query, mode: "insensitive" } },
              ],
            },
            include: { notificationPrefs: true }
          });

          if (mentionedUser) {
            notifiedUserIds.add(mentionedUser.id);
            // Create in-app notification
            await prisma.notification.create({
              data: {
                type: "mention",
                title: "You were mentioned",
                content: `${session.user.name || "Someone"} mentioned you in ${task?.title || "a task"}`,
                link: `/tasks?taskId=${taskId}`,
                userId: mentionedUser.id,
              },
            });

            // Send email if enabled
            if (mentionedUser.notificationPrefs?.onMention ?? true) {
              const html = buildMentionEmailHtml(
                task?.title || "a task",
                data.content.substring(0, 100) + (data.content.length > 100 ? "..." : ""),
                session.user.name || "A team member",
                `${process.env.NEXTAUTH_URL}/tasks?taskId=${taskId}`
              );
              await sendEmail({ to: mentionedUser.email, subject: "You were mentioned in TeamFlow", html });
            }
          }
        }
      } catch (notifyError) {
        console.error("Mention processing failed:", notifyError);
      }
    }

    // Notify other participants (Creator and Assignees) of the new comment
    try {
      const task = await prisma.task.findUnique({ 
        where: { id: taskId }, 
        include: { assignees: true } 
      });
      
      if (task) {
        const participants = new Set([task.creatorId, ...task.assignees.map(a => a.userId)]);
        participants.delete(session.user.id); // Don't notify self
        
        for (const pid of participants) {
          if (notifiedUserIds.has(pid)) continue; // Don't double notify if already mentioned
          
          await prisma.notification.create({
            data: {
              type: "comment",
              title: "New Comment",
              content: `${session.user.name || "Someone"} commented on "${task.title}"`,
              link: `/tasks?taskId=${taskId}`,
              userId: pid,
            },
          });

          // Send email if enabled
          const participant = await prisma.user.findUnique({
            where: { id: pid },
            include: { notificationPrefs: true }
          });

          if (participant?.email && (participant.notificationPrefs?.onComment ?? true)) {
            const { sendEmail, buildMentionEmailHtml } = await import("@/lib/email");
            const html = buildMentionEmailHtml(
              task.title,
              data.content.substring(0, 100) + (data.content.length > 100 ? "..." : ""),
              session.user.name || "A team member",
              `${process.env.NEXTAUTH_URL}/tasks?taskId=${taskId}`
            );
            await sendEmail({ to: participant.email, subject: `New Comment: ${task.title}`, html });
          }
        }
      }
    } catch (commentNotifyError) {
      console.error("General comment notification failed:", commentNotifyError);
    }

    return NextResponse.json(comment, { status: 201 });
  } catch (error) {
    console.error("Create comment error:", error);
    return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  }
}
