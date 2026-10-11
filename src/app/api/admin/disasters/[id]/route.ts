import { NextResponse } from "next/server";
import { db } from "@/db";
import { disasters, auditLogs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentAdmin } from "@/lib/auth";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const admin = await getCurrentAdmin();

    if (!db) {
      return NextResponse.json({ success: false, error: "Database not connected" }, { status: 500 });
    }

    const existing = await db.query.disasters.findFirst({
      where: eq(disasters.id, id),
    });

    if (!existing) {
      return NextResponse.json({ success: false, error: "Record not found" }, { status: 404 });
    }

    await db.delete(disasters).where(eq(disasters.id, id));

    // Audit log
    await db.insert(auditLogs).values({
      userId: admin?.id || null,
      userEmail: admin?.email || "operator",
      action: "DELETE_DISASTER",
      entityType: "DISASTER",
      entityId: id,
      details: { title: existing.title },
    });

    return NextResponse.json({ success: true, message: "Disaster record deleted" });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to delete";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
