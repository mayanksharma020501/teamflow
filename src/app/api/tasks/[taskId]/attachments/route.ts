import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { attachGoogleDriveFile } from "@/services/google.service";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { taskId } = await params;
  const attachments = await prisma.attachment.findMany({
    where: { taskId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(attachments);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { taskId } = await params;
  const body = await req.json();

  try {
    // If it's a drive file
    if (body.driveId) {
      const attachment = await attachGoogleDriveFile(taskId, session.user.id, body);
      return NextResponse.json(attachment);
    }

    // Standard attachment
    const attachment = await prisma.attachment.create({
      data: {
        taskId,
        userId: session.user.id,
        name: body.name,
        url: body.url,
        type: body.mimeType || body.type || "application/octet-stream",
        size: body.size,
      },
    });
    return NextResponse.json(attachment, { status: 201 });
  } catch (error) {
    console.error("Create attachment error:", error);
    return NextResponse.json({ error: "Failed to create attachment" }, { status: 500 });
  }
}
