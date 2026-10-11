import { NextResponse } from "next/server";
import { runDisasterSyncCycle } from "@/services/scheduler";

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    // Verify secret if set in production
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      const url = new URL(req.url);
      const queryToken = url.searchParams.get("token");
      if (queryToken !== cronSecret) {
        return NextResponse.json({ success: false, error: "Unauthorized cron trigger" }, { status: 401 });
      }
    }

    const outcome = await runDisasterSyncCycle();

    return NextResponse.json({
      success: true,
      message: "Automated sync cycle triggered",
      outcome,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Cron execution failed";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
