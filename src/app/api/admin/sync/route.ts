import { NextResponse } from "next/server";
import { syncBMKGData, syncUSGSData } from "@/services/data-fetcher";

export async function POST(req: Request) {
  try {
    const url = new URL(req.url);
    const source = url.searchParams.get("source");

    let bmkgResult = null;
    let usgsResult = null;

    if (!source || source === "BMKG") {
      bmkgResult = await syncBMKGData();
    }
    if (!source || source === "USGS") {
      usgsResult = await syncUSGSData();
    }

    return NextResponse.json({
      success: true,
      message: "Sync process completed",
      results: {
        bmkg: bmkgResult,
        usgs: usgsResult,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Sync failed";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
