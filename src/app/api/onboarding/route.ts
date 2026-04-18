import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { onboardingSchema } from "@/lib/validators";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const data = onboardingSchema.parse(body);

    // Update user name and mark as onboarded
    await prisma.user.update({
      where: { id: session.user.id },
      data: { name: data.name, onboarded: true },
    });

    // Create notification preferences
    await prisma.notificationPrefs.upsert({
      where: { userId: session.user.id },
      update: {},
      create: { userId: session.user.id },
    });

    // Create team if requested
    if (data.teamAction === "create" && data.teamName) {
      const team = await prisma.team.create({
        data: {
          name: data.teamName,
          members: {
            create: {
              userId: session.user.id,
              role: "ADMIN",
            },
          },
        },
      });
      return NextResponse.json({ success: true, teamId: team.id });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Onboarding error:", error);
    return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  }
}
