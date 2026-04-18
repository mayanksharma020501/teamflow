import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { inviteSchema } from "@/lib/validators";
import { addDays } from "date-fns";
import crypto from "crypto";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ teamId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { teamId } = await params;

  try {
    const body = await req.json();
    const data = inviteSchema.parse(body);

    // Check if user is already a member
    const existingUser = await prisma.user.findUnique({ where: { email: data.email } });
    if (existingUser) {
      const existingMember = await prisma.teamMember.findUnique({
        where: { teamId_userId: { userId: existingUser.id, teamId } },
      });
      if (existingMember) {
        return NextResponse.json({ error: "User is already a member" }, { status: 400 });
      }

      // Add directly if user exists
      await prisma.teamMember.create({
        data: { userId: existingUser.id, teamId, role: data.role },
      });
      return NextResponse.json({ success: true, directAdd: true });
    }

    // Create invite for non-existing user
    const invite = await prisma.invite.create({
      data: {
        email: data.email,
        teamId,
        role: data.role,
        token: crypto.randomBytes(32).toString("hex"),
        expires: addDays(new Date(), 7),
      },
    });

    return NextResponse.json({ success: true, inviteId: invite.id });
  } catch (error) {
    console.error("Invite error:", error);
    return NextResponse.json({ error: "Failed to send invite" }, { status: 500 });
  }
}
