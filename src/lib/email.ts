// Simulated Email Service
export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  if (process.env.NODE_ENV === "development") {
    console.log("=====================================");
    console.log(`📧 Simulated Email to: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log("=====================================");
    
    // In a real environment, we'd use fs.appendFile here if on server
    // For now, console log is our primary dev output
    return { success: true };
  }

  // In production, integrate with Resend, SendGrid, etc.
  try {
    // const resend = new Resend(process.env.RESEND_API_KEY);
    // await resend.emails.send({ from: 'TeamFlow <noreply@teamflow.app>', to, subject, html });
    return { success: true };
  } catch (error) {
    console.error("Failed to send email:", error);
    return { success: false, error };
  }
}

export function buildMentionEmailHtml(taskTitle: string, commentPreview: string, authorName: string, taskUrl: string) {
  return `
    <div style="font-family: sans-serif; max-w: 600px; margin: 0 auto;">
      <h2 style="color: #4f46e5;">You were mentioned in TeamFlow</h2>
      <p><strong>${authorName}</strong> mentioned you in a comment on <strong>${taskTitle}</strong>:</p>
      <blockquote style="border-left: 4px solid #e5e7eb; padding-left: 16px; color: #4b5563; font-style: italic;">
        "${commentPreview}"
      </blockquote>
      <a href="${taskUrl}" style="display: inline-block; background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin-top: 16px;">
        View Comment
      </a>
    </div>
  `;
}

export function buildAssignmentEmailHtml(taskTitle: string, assignerName: string, taskUrl: string) {
  return `
    <div style="font-family: sans-serif; max-w: 600px; margin: 0 auto;">
      <h2 style="color: #4f46e5;">New Task Assignment</h2>
      <p><strong>${assignerName}</strong> assigned you to a new task:</p>
      <h3 style="color: #111827;">${taskTitle}</h3>
      <a href="${taskUrl}" style="display: inline-block; background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin-top: 16px;">
        View Task
      </a>
    </div>
  `;
}
