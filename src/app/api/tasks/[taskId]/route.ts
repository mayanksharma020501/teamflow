import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { taskUpdateSchema } from "@/lib/validators";
import { getTaskById, updateTask, deleteTask } from "@/services/task.service";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { taskId } = await params;

  try {
    const task = await getTaskById(taskId);
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }
    return NextResponse.json(task);
  } catch (error) {
    console.error("Get task error:", error);
    return NextResponse.json({ error: "Failed to fetch task" }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { taskId } = await params;

  try {
    const body = await req.json();
    const data = taskUpdateSchema.parse(body);
    const task = await updateTask(taskId, session.user.id, data);
    return NextResponse.json(task);
  } catch (error: any) {
    console.error("Update task error:", error);
    return NextResponse.json(
      { error: error.message || "Invalid data" }, 
      { status: error.message?.includes("permission") || error.message?.includes("restricted") ? 403 : 400 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { taskId } = await params;

  try {
    await deleteTask(taskId, session.user.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete task error:", error);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
