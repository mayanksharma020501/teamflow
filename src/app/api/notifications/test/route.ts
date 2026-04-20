import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { sendEmail, buildInvitationEmailHtml } from "@/lib/email";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const html = buildInvitationEmailHtml(
      "The Test Team",
      "TeamFlow System",
      `${process.env.NEXTAUTH_URL}/dashboard`
    );

    const result = await sendEmail({
      to: session.user.email,
      subject: "Test: TeamFlow Professional Notifications",
      html,
    });

    if (result.success) {
      return NextResponse.json({ success: true, message: "Test email sent to " + session.user.email });
    } else {
      return NextResponse.json({ error: result.error || "Failed to send email" }, { status: 500 });
    }
  } catch (error) {
    console.error("Test notification error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
