import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { syncTeamToSheets } from "@/services/google.service";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ teamId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { teamId } = await params;

  try {
    const result = await syncTeamToSheets(teamId);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Sync team error:", error);
    return NextResponse.json({ error: "Failed to sync with Google Sheets" }, { status: 500 });
  }
}
