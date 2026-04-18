import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { addDays, addWeeks, addMonths, startOfDay } from "date-fns";

export async function GET(req: Request) {
  try {
    const today = startOfDay(new Date());

    // Find all recurring rules
    const rules = await prisma.recurringRule.findMany({
      include: { 
        task: {
          include: {
            assignees: true,
            labels: true,
          }
        } 
      },
    });

    let processedCount = 0;

    for (const rule of rules) {
      if (!rule.task || rule.task.type !== "RECURRING") continue;

      // If nextRun is not set, initialize it to today or rule.task.dueDate
      let nextDueDate = rule.nextRun;
      if (!nextDueDate) {
        nextDueDate = rule.task.dueDate || today;
        // Update it in DB for future
        await prisma.recurringRule.update({
          where: { id: rule.id },
          data: { nextRun: nextDueDate },
        });
      }

      // Calculate when we should trigger the creation
      let triggerDate = addDays(nextDueDate, -rule.leadTime);
      let instancesCreatedForRule = 0;

      // Use a while loop to catch up on any missed occurrences (limit to 30 to prevent infinite loops)
      while (today >= startOfDay(triggerDate) && instancesCreatedForRule < 30) {
        // Check if we already created an instance for this specific nextDueDate
        const existingInstance = await prisma.task.findFirst({
          where: {
            recurringTaskId: rule.task.id,
            dueDate: nextDueDate,
          }
        });

        if (!existingInstance) {
          // Create a new ONE_TIME instance
          const newTask = await prisma.task.create({
            data: {
              title: rule.task.title,
              description: rule.task.description,
              priority: rule.task.priority,
              status: "TODO",
              type: "ONE_TIME",
              isPersonal: rule.task.isPersonal,
              creatorId: rule.task.creatorId,
              teamId: rule.task.teamId,
              dueDate: nextDueDate,
              recurringTaskId: rule.task.id,
              assignees: {
                create: rule.task.assignees.map(a => ({ userId: a.userId }))
              },
              labels: {
                create: rule.task.labels.map(l => ({ labelId: l.labelId }))
              }
            },
          });

          // Send notification
          await prisma.notification.create({
            data: {
              type: "recurring",
              title: "Automation Triggered",
              content: `New task "${newTask.title}" created from your automation.`,
              link: `/tasks?taskId=${newTask.id}`,
              userId: rule.task.creatorId,
            },
          });

          processedCount++;
          instancesCreatedForRule++;
        }

        // Advance to the next occurrence
        nextDueDate = calculateNextDate(nextDueDate, rule.frequency, rule.interval);
        triggerDate = addDays(nextDueDate, -rule.leadTime);

        await prisma.recurringRule.update({
          where: { id: rule.id },
          data: { nextRun: nextDueDate },
        });
      }
    }

    return NextResponse.json({ success: true, processedCount });
  } catch (error) {
    console.error("Cron error:", error);
    return NextResponse.json({ error: "Failed to process recurring tasks" }, { status: 500 });
  }
}

function calculateNextDate(from: Date, freq: string, interval: number): Date {
  const date = new Date(from);
  switch (freq) {
    case "DAILY": return addDays(date, 1);
    case "WEEKDAY": {
      let next = addDays(date, 1);
      // If it's Saturday (6), move to Monday (add 2)
      // If it's Sunday (0), move to Monday (add 1)
      while (next.getDay() === 0 || next.getDay() === 6) {
        next = addDays(next, 1);
      }
      return next;
    }
    case "WEEKLY": return addWeeks(date, 1);
    case "MONTHLY": return addMonths(date, 1);
    case "INTERVAL": return addDays(date, interval);
    default: return addDays(date, interval);
  }
}
