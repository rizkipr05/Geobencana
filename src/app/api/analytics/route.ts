import { NextResponse } from "next/server";
import { db } from "@/db";
import { disasters, dataSources } from "@/db/schema";
import { desc, sql, count, avg, max } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    if (!db) {
      return NextResponse.json({ success: false, error: "Database not connected" }, { status: 500 });
    }

    // 1. Overall stats
    const totalCountRes = await db.select({ count: count() }).from(disasters);
    const totalEvents = Number(totalCountRes[0]?.count || 0);

    const maxMagRes = await db.select({ maxMag: max(disasters.magnitude) }).from(disasters);
    const maxMagnitude = Number(maxMagRes[0]?.maxMag || 0);

    const avgMagRes = await db.select({ avgMag: avg(disasters.magnitude) }).from(disasters);
    const avgMagnitude = Number(avgMagRes[0]?.avgMag || 0).toFixed(1);

    // 2. Fetch all disasters for accurate client grouping
    const allEvents = await db
      .select({
        id: disasters.id,
        title: disasters.title,
        locationName: disasters.locationName,
        magnitude: disasters.magnitude,
        depthKm: disasters.depthKm,
        severityLevel: disasters.severityLevel,
        latitude: disasters.latitude,
        longitude: disasters.longitude,
        occurredAt: disasters.occurredAt,
        externalId: disasters.externalId,
        metadata: disasters.metadata,
      })
      .from(disasters)
      .orderBy(desc(disasters.occurredAt))
      .limit(100);

    // Magnitude distribution
    let mUnder4 = 0;
    let m4to5 = 0;
    let m5to6 = 0;
    let mAbove6 = 0;

    // Depth distribution
    let depthShallow = 0; // <= 60 km
    let depthIntermediate = 0; // 60 - 300 km
    let depthDeep = 0; // > 300 km

    // Source distribution
    let bmkgCount = 0;
    let usgsCount = 0;
    let tsunamiCount = 0;

    for (const ev of allEvents) {
      const mag = ev.magnitude ? Number(ev.magnitude) : 0;
      const depth = ev.depthKm ? Number(ev.depthKm) : 0;

      if (mag < 4.0) mUnder4++;
      else if (mag < 5.0) m4to5++;
      else if (mag < 6.0) m5to6++;
      else mAbove6++;

      if (depth <= 60) depthShallow++;
      else if (depth <= 300) depthIntermediate++;
      else depthDeep++;

      if (ev.externalId?.startsWith("BMKG")) bmkgCount++;
      if (ev.externalId?.startsWith("USGS")) usgsCount++;

      // Check tsunami flag in metadata or title
      const meta = ev.metadata as any;
      if (meta?.tsunami === 1 || ev.title.toLowerCase().includes("tsunami")) {
        tsunamiCount++;
      }
    }

    return NextResponse.json({
      success: true,
      stats: {
        totalEvents,
        maxMagnitude,
        avgMagnitude,
        tsunamiCount,
        magnitudeDistribution: {
          under4: mUnder4,
          range4to5: m4to5,
          range5to6: m5to6,
          above6: mAbove6,
        },
        depthDistribution: {
          shallow: depthShallow,
          intermediate: depthIntermediate,
          deep: depthDeep,
        },
        sources: {
          bmkg: bmkgCount,
          usgs: usgsCount,
        },
        recentSignificantEvents: allEvents.slice(0, 15),
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Analytics query failed";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
