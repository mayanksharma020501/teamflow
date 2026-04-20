import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { startOfDay, subDays, format } from "date-fns";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const userId = session.user.id;
    const baseWhere = {
      OR: [
        { creatorId: userId },
        { assignees: { some: { userId } } },
        { team: { members: { some: { userId } } } }
      ]
    };

    // 1. Tasks by Status
    const statusCounts = await prisma.task.groupBy({
      by: ["status"],
      where: baseWhere as any,
      _count: true,
    });

    // 2. Tasks by Priority
    const priorityCounts = await prisma.task.groupBy({
      by: ["priority"],
      where: baseWhere as any,
      _count: true,
    });

    // 3. Last 7 Days Completion Trend
    const sevenDaysAgo = startOfDay(subDays(new Date(), 7));
    const completedTasks = await prisma.task.findMany({
      where: {
        ...baseWhere,
        status: "DONE",
        completedAt: { gte: sevenDaysAgo },
      } as any,
      select: { completedAt: true },
    });

    const completionTrend = Array.from({ length: 8 }).map((_, i) => {
      const date = subDays(new Date(), 7 - i);
      const dateStr = format(date, "MMM dd");
      const count = completedTasks.filter(t => 
        t.completedAt && format(t.completedAt, "yyyy-MM-dd") === format(date, "yyyy-MM-dd")
      ).length;
      return { name: dateStr, count };
    });

    // 4. Team Distribution
    const teamCounts = await prisma.team.findMany({
      where: { members: { some: { userId } } },
      select: {
        name: true,
        _count: {
          select: { tasks: true }
        }
      }
    });

    const personalCount = await prisma.task.count({
      where: { creatorId: userId, isPersonal: true }
    });

    const finalTeamData = [
      { name: "Personal", value: personalCount },
      ...teamCounts.map(t => ({ name: t.name, value: t._count.tasks }))
    ];

    return NextResponse.json({
      statusData: statusCounts.map(s => ({ name: s.status, value: s._count })),
      priorityData: priorityCounts.map(p => ({ name: p.priority, value: p._count })),
      trendData: completionTrend,
      teamData: finalTeamData,
      totalTasks: statusCounts.reduce((acc, s) => acc + s._count, 0),
      completedCount: statusCounts.find(s => s.status === "DONE")?._count || 0,
    });
  } catch (error) {
    console.error("Analytics error:", error);
    return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 });
  }
}
