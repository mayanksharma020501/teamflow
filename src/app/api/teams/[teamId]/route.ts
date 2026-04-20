import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ teamId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { teamId } = await params;

  const team = await prisma.team.findUnique({
    where: { id: teamId },
    include: {
      members: {
        include: { user: { select: { id: true, name: true, email: true, image: true } } },
      },
      _count: { select: { tasks: true } },
    },
  });

  if (!team) return NextResponse.json({ error: "Team not found" }, { status: 404 });
  return NextResponse.json(team);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ teamId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { teamId } = await params;

  try {
    const body = await req.json();
    const team = await prisma.team.update({
      where: { id: teamId },
      data: {
        name: body.name,
        description: body.description,
        color: body.color,
      },
    });
    return NextResponse.json(team);
  } catch {
    return NextResponse.json({ error: "Failed to update team" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ teamId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { teamId } = await params;
  const { searchParams } = new URL(req.url);
  const deleteTasks = searchParams.get("deleteTasks") === "true";

  try {
    // Check if user is admin
    const member = await prisma.teamMember.findUnique({
      where: { teamId_userId: { userId: session.user.id, teamId } },
    });
    
    if (!member || member.role !== "ADMIN") {
      return NextResponse.json({ error: "Only admins can delete teams" }, { status: 403 });
    }

    await prisma.$transaction(async (tx) => {
      if (deleteTasks) {
        // 1. Delete all tasks in this team
        await tx.task.deleteMany({ where: { teamId } });
      } else {
        // 2. Detach tasks from team (make them personal)
        await tx.task.updateMany({
          where: { teamId },
          data: { teamId: null, isPersonal: true },
        });
      }

      // 3. Delete the team itself
      await tx.team.delete({ where: { id: teamId } });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete team error:", error);
    return NextResponse.json({ error: "Failed to delete team" }, { status: 500 });
  }
}
