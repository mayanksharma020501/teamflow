import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { startOfDay, subDays, format, startOfWeek, startOfMonth } from "date-fns";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const scope = searchParams.get("scope") || "all";
  const period = searchParams.get("period") || "this-week";

  try {
    const userId = session.user.id;
    
    // 1. Calculate Time Range
    const now = new Date();
    let startDate = startOfWeek(now); // Default to current calendar week
    if (period === "today") startDate = startOfDay(now);
    else if (period === "this-month") startDate = startOfMonth(now);
    else if (period === "last-30") startDate = startOfDay(subDays(now, 30));
    else if (period === "this-week") startDate = startOfWeek(now);

    // 2. Build Scope Filter
    const baseWhere: any = {};

    if (scope === "personal") {
      baseWhere.isPersonal = true;
      baseWhere.creatorId = userId;
    } else if (scope.startsWith("team:")) {
      baseWhere.teamId = scope.split(":")[1];
    } else {
      // "all" - My Tasks logic: Tasks assigned to me OR Personal OR Unassigned in my teams
      baseWhere.OR = [
        { assignees: { some: { userId } } },
        { AND: [{ creatorId: userId }, { isPersonal: true }] },
        { 
          AND: [
            { team: { members: { some: { userId } } } },
            { assignees: { none: {} } }
          ]
        }
      ];
    }

    // Smart Filter: Show ALL active tasks, but only DONE tasks from this period
    const where: any = {
      ...baseWhere,
      OR: [
        { status: { in: ["TODO", "IN_PROGRESS", "REVIEW"] } },
        { 
          status: "DONE",
          completedAt: { gte: startDate }
        }
      ]
    };

    // 3. Tasks by Status
    const statusCounts = await prisma.task.groupBy({
      by: ["status"],
      where: where as any,
      _count: true,
    });

    // 4. Tasks by Priority
    const priorityCounts = await prisma.task.groupBy({
      by: ["priority"],
      where: where as any,
      _count: true,
    });

    // 5. Completion Trend (Last X days based on period)
    const days = period === "today" ? 1 : period === "this-month" ? 30 : period === "last-30" ? 30 : 7;
    const completedTasks = await prisma.task.findMany({
      where: {
        ...where,
        status: "DONE",
        completedAt: { gte: startDate },
      } as any,
      select: { completedAt: true },
    });

    const trendData = Array.from({ length: days + 1 }).map((_, i) => {
      const date = subDays(now, days - i);
      const dateStr = format(date, days > 10 ? "MMM dd" : "MMM dd");
      const count = completedTasks.filter(t => 
        t.completedAt && format(t.completedAt, "yyyy-MM-dd") === format(date, "yyyy-MM-dd")
      ).length;
      return { name: dateStr, count };
    });

    // 6. Team Distribution (if scope is not specific team)
    let teamData: any[] = [];
    if (!scope.startsWith("team:")) {
      const smartWhere = {
        OR: [
          { status: { in: ["TODO", "IN_PROGRESS", "REVIEW"] } },
          { status: "DONE", completedAt: { gte: startDate } }
        ]
      };

      const teamCounts = await prisma.team.findMany({
        where: { members: { some: { userId } } },
        select: {
          name: true,
          _count: {
            select: { tasks: { where: smartWhere as any } }
          }
        }
      });

      const personalCount = await prisma.task.count({
        where: { 
          creatorId: userId, 
          isPersonal: true, 
          ...smartWhere 
        } as any
      });

      teamData = [
        { name: "Personal", value: personalCount },
        ...teamCounts.map(t => ({ name: t.name, value: t._count.tasks }))
      ];
    }

    return NextResponse.json({
      statusData: statusCounts.map(s => ({ name: s.status, value: s._count })),
      priorityData: priorityCounts.map(p => ({ name: p.priority, value: p._count })),
      trendData,
      teamData,
      totalTasks: statusCounts.reduce((acc, s) => acc + s._count, 0),
      activeCount: statusCounts.filter(s => s.status !== "DONE").reduce((acc, s) => acc + s._count, 0),
      completedCount: statusCounts.find(s => s.status === "DONE")?._count || 0,
    });
  } catch (error) {
    console.error("Analytics error:", error);
    return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 });
  }
}
