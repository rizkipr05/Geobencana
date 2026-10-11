import { NextResponse } from "next/server";
import { db } from "@/db";
import { syncLogs, auditLogs, systemErrors, dataSources } from "@/db/schema";
import { desc, eq } from "drizzle-orm";

export async function GET() {
  try {
    if (!db) {
      return NextResponse.json({ success: false, error: "Database not connected" }, { status: 500 });
    }

    // 1. Fetch Sync Logs joined with DataSource info
    const rawSyncs = await db
      .select({
        id: syncLogs.id,
        sourceId: syncLogs.sourceId,
        sourceCode: dataSources.code,
        sourceName: dataSources.name,
        status: syncLogs.status,
        itemsFetched: syncLogs.itemsFetched,
        itemsInserted: syncLogs.itemsInserted,
        itemsDuplicate: syncLogs.itemsDuplicate,
        durationMs: syncLogs.durationMs,
        startedAt: syncLogs.startedAt,
        completedAt: syncLogs.completedAt,
        errorMessage: syncLogs.errorMessage,
      })
      .from(syncLogs)
      .leftJoin(dataSources, eq(syncLogs.sourceId, dataSources.id))
      .orderBy(desc(syncLogs.startedAt))
      .limit(50);

    // 2. Fetch Audit Logs
    const rawAudits = await db
      .select()
      .from(auditLogs)
      .orderBy(desc(auditLogs.createdAt))
      .limit(50);

    // 3. Fetch System Errors
    const rawErrors = await db
      .select()
      .from(systemErrors)
      .orderBy(desc(systemErrors.createdAt))
      .limit(20);

    return NextResponse.json({
      success: true,
      syncLogs: rawSyncs,
      auditLogs: rawAudits,
      systemErrors: rawErrors,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch logs";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
