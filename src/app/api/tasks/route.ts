import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { taskCreateSchema } from "@/lib/validators";
import { createTask, getUserTasks } from "@/services/task.service";
import { TaskStatus } from "@prisma/client";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") as TaskStatus | null;
  const teamId = searchParams.get("teamId") || undefined;
  const search = searchParams.get("search") || undefined;
  const personal = searchParams.get("personal") === "true";
  const type = searchParams.get("type") || undefined;

  try {
    const tasks = await getUserTasks(session.user.id, {
      status: status || undefined,
      teamId,
      search,
      personal,
      type,
    });
    return NextResponse.json(tasks);
  } catch (error) {
    console.error("Get tasks error:", error);
    return NextResponse.json({ error: "Failed to fetch tasks" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const data = taskCreateSchema.parse(body);
    const task = await createTask(session.user.id, data);
    return NextResponse.json(task, { status: 201 });
  } catch (error: any) {
    console.error("Create task error:", error);
    return NextResponse.json({ 
      error: error.message || "Invalid data",
      details: error.errors // for Zod errors
    }, { status: 400 });
  }
}
