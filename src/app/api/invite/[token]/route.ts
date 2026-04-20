import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { token } = await params;

  try {
    const invite = await prisma.invite.findUnique({
      where: { token },
      include: { team: true },
    });

    if (!invite) return NextResponse.json({ error: "Invalid invitation" }, { status: 404 });
    if (invite.expires < new Date()) return NextResponse.json({ error: "Invitation expired" }, { status: 400 });

    // Join the team
    await prisma.$transaction([
      prisma.teamMember.create({
        data: {
          teamId: invite.teamId,
          userId: session.user.id,
          role: invite.role,
        },
      }),
      prisma.invite.delete({ where: { id: invite.id } }),
    ]);

    return NextResponse.json({ success: true, teamId: invite.teamId });
  } catch (error) {
    console.error("Join team error:", error);
    return NextResponse.json({ error: "Failed to join team" }, { status: 500 });
  }
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const invite = await prisma.invite.findUnique({
    where: { token },
    include: { team: true },
  });

  if (!invite) return NextResponse.json({ error: "Invalid invitation" }, { status: 404 });
  return NextResponse.json(invite);
}
