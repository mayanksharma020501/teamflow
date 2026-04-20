import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  if (!resend) {
    console.warn("Resend API key missing. Email not sent.");
    return { success: false, error: "API key missing" };
  }

  try {
    const data = await resend.emails.send({
      from: "TeamFlow <onboarding@resend.dev>", // Default for free accounts, update once domain is verified
      to,
      subject,
      html,
    });
    return { success: true, data };
  } catch (error) {
    console.error("Failed to send email:", error);
    return { success: false, error };
  }
}

export function buildMentionEmailHtml(taskTitle: string, commentPreview: string, authorName: string, taskUrl: string) {
  return `
    <div style="font-family: 'Inter', sans-serif; max-w: 600px; margin: 0 auto; padding: 40px 20px; color: #111827;">
      <div style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 32px; border-radius: 24px; color: white; margin-bottom: 32px; text-align: center;">
        <h1 style="margin: 0; font-size: 24px; font-weight: 800;">Mentioned in TeamFlow</h1>
      </div>
      <p style="font-size: 16px; line-height: 1.6;"><strong>${authorName}</strong> mentioned you in a comment on <strong>${taskTitle}</strong>:</p>
      <div style="background-color: #f9fafb; border-left: 4px solid #4f46e5; padding: 20px; border-radius: 12px; margin: 24px 0; font-style: italic; color: #4b5563;">
        "${commentPreview}"
      </div>
      <div style="text-align: center;">
        <a href="${taskUrl}" style="display: inline-block; background-color: #4f46e5; color: white; padding: 16px 32px; text-decoration: none; border-radius: 16px; font-weight: 700; font-size: 16px; box-shadow: 0 10px 15px -3px rgba(79, 70, 229, 0.3);">
          View Conversation
        </a>
      </div>
      <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 40px 0;">
      <p style="font-size: 12px; text-align: center; color: #6b7280;">
        TeamFlow Productivity App. You received this because your notification preferences are enabled.
      </p>
    </div>
  `;
}

export function buildAssignmentEmailHtml(taskTitle: string, assignerName: string, taskUrl: string) {
  return `
    <div style="font-family: 'Inter', sans-serif; max-w: 600px; margin: 0 auto; padding: 40px 20px; color: #111827;">
      <div style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 32px; border-radius: 24px; color: white; margin-bottom: 32px; text-align: center;">
        <h1 style="margin: 0; font-size: 24px; font-weight: 800;">New Task Assignment</h1>
      </div>
      <p style="font-size: 16px; line-height: 1.6;">Hello! <strong>${assignerName}</strong> has assigned you to a new task:</p>
      <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; padding: 24px; border-radius: 16px; margin: 24px 0;">
        <h3 style="margin: 0; font-size: 18px; color: #111827;">${taskTitle}</h3>
      </div>
      <div style="text-align: center;">
        <a href="${taskUrl}" style="display: inline-block; background-color: #4f46e5; color: white; padding: 16px 32px; text-decoration: none; border-radius: 16px; font-weight: 700; font-size: 16px; box-shadow: 0 10px 15px -3px rgba(79, 70, 229, 0.3);">
          Go to Task
        </a>
      </div>
      <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 40px 0;">
      <p style="font-size: 12px; text-align: center; color: #6b7280;">
        TeamFlow Productivity App. You received this because your notification preferences are enabled.
      </p>
    </div>
  `;
}

export function buildInvitationEmailHtml(teamName: string, inviterName: string, inviteUrl: string) {
  return `
    <div style="font-family: 'Inter', sans-serif; max-w: 600px; margin: 0 auto; padding: 40px 20px; color: #111827;">
      <div style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 32px; border-radius: 24px; color: white; margin-bottom: 32px; text-align: center;">
        <h1 style="margin: 0; font-size: 24px; font-weight: 800;">Team Invitation</h1>
      </div>
      <p style="font-size: 16px; line-height: 1.6;">You've been invited by <strong>${inviterName}</strong> to join the team:</p>
      <div style="background-color: #f3f4f6; padding: 24px; border-radius: 16px; margin: 24px 0; text-align: center;">
        <h2 style="margin: 0; color: #4f46e5;">${teamName}</h2>
      </div>
      <p style="font-size: 14px; color: #4b5563; margin-bottom: 32px;">Click the button below to join the team and start collaborating!</p>
      <div style="text-align: center;">
        <a href="${inviteUrl}" style="display: inline-block; background-color: #4f46e5; color: white; padding: 16px 32px; text-decoration: none; border-radius: 16px; font-weight: 700; font-size: 16px; box-shadow: 0 10px 15px -3px rgba(79, 70, 229, 0.3);">
          Accept Invitation
        </a>
      </div>
      <p style="font-size: 11px; text-align: center; color: #9ca3af; margin-top: 32px;">
        This invitation will expire in 7 days.
      </p>
    </div>
  `;
}
