import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const notification = await prisma.notification.create({
    data: {
      type: "mention",
      title: "Test Notification",
      content: "This is a test notification to verify the system is working.",
      link: "/settings",
      userId: session.user.id,
    },
  });

  return NextResponse.json(notification);
}
