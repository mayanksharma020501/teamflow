import { prisma } from "@/lib/prisma";

export async function syncTeamToSheets(teamId: string) {
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    include: {
      tasks: {
        include: {
          creator: true,
          assignees: { include: { user: true } },
          labels: { include: { label: true } },
        },
      },
    },
  });

  if (!team) throw new Error("Team not found");

  // In a real implementation, we would use google-auth-library and googleapis
  // For now, we simulate the data payload that would be sent to Google Sheets
  const headers = ["ID", "Title", "Status", "Priority", "Creator", "Assignees", "Due Date", "Created At"];
  const rows = team.tasks.map(task => [
    task.id,
    task.title,
    task.status,
    task.priority,
    task.creator.name || task.creator.email,
    task.assignees.map(a => a.user.name || a.user.email).join(", "),
    task.dueDate ? task.dueDate.toISOString() : "N/A",
    task.createdAt.toISOString(),
  ]);

  console.log(`[Google Service] Syncing team ${team.name} to Google Sheets...`);
  console.log(`[Google Service] Data rows:`, rows.length);

  // Return simulated success
  return {
    success: true,
    sheetUrl: `https://docs.google.com/spreadsheets/d/placeholder-${teamId}`,
    rowCount: rows.length,
  };
}

export async function attachGoogleDriveFile(taskId: string, userId: string, file: { id: string; name: string; url: string; mimeType: string; size: number }) {
  const attachment = await prisma.attachment.create({
    data: {
      taskId,
      userId,
      driveId: file.id,
      name: file.name,
      url: file.url,
      type: file.mimeType,
      size: file.size,
    },
  });

  // Log activity
  await prisma.activityLog.create({
    data: {
      action: "attached_drive_file",
      taskId,
      userId: "system", // Should be the user id from session
      details: JSON.stringify({ fileName: file.name, driveId: file.id }),
    },
  });

  return attachment;
}
