import { NextResponse } from "next/server";
import { db } from "@/db";
import { disasters, auditLogs } from "@/db/schema";
import { desc, eq, and, like, or, gte, lte } from "drizzle-orm";
import { getCurrentAdmin } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const search = url.searchParams.get("search") || "";
    const category = url.searchParams.get("category");
    const severity = url.searchParams.get("severity");
    const limit = parseInt(url.searchParams.get("limit") || "100", 10);

    if (!db) {
      return NextResponse.json({ success: true, disasters: [], total: 0 });
    }

    const conditions = [];

    // Filter strictly within Indonesia archipelago coordinates
    conditions.push(
      gte(disasters.latitude, -11.5),
      lte(disasters.latitude, 6.5),
      gte(disasters.longitude, 94.0),
      lte(disasters.longitude, 141.5)
    );

    if (category && category !== "ALL") {
      conditions.push(eq(disasters.categoryCode, category));
    }

    if (severity && severity !== "ALL") {
      conditions.push(eq(disasters.severityLevel, severity));
    }

    if (search.trim()) {
      conditions.push(
        or(
          like(disasters.title, `%${search}%`),
          like(disasters.locationName, `%${search}%`)
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const list = await db.query.disasters.findMany({
      where: whereClause,
      orderBy: [desc(disasters.occurredAt)],
      limit,
    });

    return NextResponse.json({
      success: true,
      disasters: list,
      total: list.length,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch disasters";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const admin = await getCurrentAdmin();
    const body = await req.json();

    const {
      title,
      category,
      location,
      latitude,
      longitude,
      magnitude,
      depth,
      severity,
      radiusKm = 15,
      description = "",
    } = body;

    if (!title || !location || latitude === undefined || longitude === undefined) {
      return NextResponse.json(
        { success: false, error: "Missing required fields (title, location, lat, lng)" },
        { status: 400 }
      );
    }

    if (!db) {
      return NextResponse.json({ success: false, error: "Database unavailable" }, { status: 500 });
    }

    const id = `manual_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const newRecord = {
      id,
      categoryCode: category || "EARTHQUAKE",
      title,
      description,
      locationName: location,
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      depthKm: depth ? parseFloat(depth) : null,
      magnitude: magnitude ? parseFloat(magnitude) : null,
      severityLevel: severity || "MEDIUM",
      radiusKm: parseFloat(radiusKm) || 15,
      status: "ACTIVE",
      verifiedStatus: "VERIFIED",
      occurredAt: new Date(),
      metadata: { reportedBy: admin?.email || "manual_operator" },
    };

    await db.insert(disasters).values(newRecord);

    // Write to audit logs
    await db.insert(auditLogs).values({
      userId: admin?.id || null,
      userEmail: admin?.email || "operator",
      action: "CREATE_INCIDENT",
      entityType: "DISASTER",
      entityId: id,
      details: { title, location, magnitude, severity },
    });

    return NextResponse.json({
      success: true,
      disaster: newRecord,
      message: "Incident reported and saved successfully",
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create incident";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
