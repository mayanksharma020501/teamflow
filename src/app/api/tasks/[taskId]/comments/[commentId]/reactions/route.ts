import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ taskId: string; commentId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { commentId } = await params;

  try {
    const { emoji } = await req.json();
    if (!emoji) return NextResponse.json({ error: "Emoji is required" }, { status: 400 });

    // Toggle reaction
    const existing = await prisma.commentReaction.findUnique({
      where: {
        commentId_userId_emoji: {
          commentId,
          userId: session.user.id,
          emoji,
        },
      },
    });

    if (existing) {
      await prisma.commentReaction.delete({ where: { id: existing.id } });
      return NextResponse.json({ action: "removed" });
    } else {
      await prisma.commentReaction.create({
        data: { emoji, commentId, userId: session.user.id },
      });
      return NextResponse.json({ action: "added" });
    }
  } catch (error) {
    console.error("Reaction error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
