import { NextResponse } from "next/server";
import { syncBMKGData, syncUSGSData, syncEONETData } from "@/services/data-fetcher";

export async function POST(req: Request) {
  try {
    const url = new URL(req.url);
    const source = url.searchParams.get("source");

    let bmkgResult = null;
    let usgsResult = null;
    let eonetResult = null;

    if (!source || source === "ALL" || source === "BMKG") {
      bmkgResult = await syncBMKGData();
    }
    if (!source || source === "ALL" || source === "USGS") {
      usgsResult = await syncUSGSData();
    }
    if (!source || source === "ALL" || source === "NASA_EONET" || source === "EONET") {
      eonetResult = await syncEONETData();
    }

    return NextResponse.json({
      success: true,
      message: "Sync process completed (Indonesia Territory Only)",
      results: {
        bmkg: bmkgResult,
        usgs: usgsResult,
        eonet: eonetResult,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Sync failed";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
