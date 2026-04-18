import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { labelCreateSchema } from "@/lib/validators";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Get user's personal labels + labels from their teams
  const labels = await prisma.label.findMany({
    where: {
      OR: [
        { userId: session.user.id },
        { team: { members: { some: { userId: session.user.id } } } },
      ],
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(labels);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const data = labelCreateSchema.parse(body);

    const label = await prisma.label.create({
      data: {
        name: data.name,
        color: data.color,
        userId: data.teamId ? null : session.user.id,
        teamId: data.teamId || null,
      },
    });

    return NextResponse.json(label, { status: 201 });
  } catch (error) {
    console.error("Create label error:", error);
    return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  }
}
