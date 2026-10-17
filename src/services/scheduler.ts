import { syncBMKGData, syncUSGSData, syncEONETData } from "./data-fetcher";

let intervalId: NodeJS.Timeout | null = null;
let isSyncing = false;

export async function runDisasterSyncCycle() {
  if (isSyncing) {
    console.log("[Scheduler] ⏳ Sync already in progress, skipping cycle.");
    return { skipped: true, reason: "Already in progress" };
  }

  isSyncing = true;
  const startTime = Date.now();
  console.log(`[Scheduler] 🚀 Starting automated Indonesia disaster sync cycle at ${new Date().toISOString()}`);

  try {
    const [bmkg, usgs, eonet] = await Promise.allSettled([
      syncBMKGData(),
      syncUSGSData(),
      syncEONETData(),
    ]);

    const result = {
      timestamp: new Date().toISOString(),
      durationMs: Date.now() - startTime,
      bmkg: bmkg.status === "fulfilled" ? bmkg.value : { success: false, error: String(bmkg.reason) },
      usgs: usgs.status === "fulfilled" ? usgs.value : { success: false, error: String(usgs.reason) },
      eonet: eonet.status === "fulfilled" ? eonet.value : { success: false, error: String(eonet.reason) },
    };

    console.log(`[Scheduler] ✅ Completed Indonesia disaster sync cycle in ${result.durationMs}ms:`, {
      bmkgInserted: result.bmkg.success ? result.bmkg.insertedCount : 0,
      usgsInserted: result.usgs.success ? result.usgs.insertedCount : 0,
      eonetInserted: result.eonet.success ? result.eonet.insertedCount : 0,
    });

    return { skipped: false, result };
  } catch (err) {
    console.error("[Scheduler] ❌ Sync cycle failed:", err);
    return { skipped: false, error: err instanceof Error ? err.message : String(err) };
  } finally {
    isSyncing = false;
  }
}

export function startBackgroundCron(intervalMinutes: number = 10) {
  if (intervalId) {
    console.log("[Scheduler] ℹ️ Background cron already active.");
    return;
  }

  const intervalMs = intervalMinutes * 60 * 1000;
  console.log(`[Scheduler] ⏱️ Initializing Background Polling daemon (Interval: ${intervalMinutes} minutes)...`);

  // Initial delayed trigger (15 seconds after server startup to let DB initialize)
  setTimeout(() => {
    runDisasterSyncCycle().catch((err) => console.error("[Scheduler] Initial sync failed:", err));
  }, 15000);

  // Periodic interval
  intervalId = setInterval(() => {
    runDisasterSyncCycle().catch((err) => console.error("[Scheduler] Periodic sync failed:", err));
  }, intervalMs);

  if (intervalId && typeof intervalId.unref === "function") {
    intervalId.unref();
  }
}

export function stopBackgroundCron() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    console.log("[Scheduler] 🛑 Background cron stopped.");
  }
}
