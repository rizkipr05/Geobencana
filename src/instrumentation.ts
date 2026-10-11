export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Only launch background scheduler in server runtime (not during build phase if NEXT_PHASE indicates build)
    const { startBackgroundCron } = await import("@/services/scheduler");
    startBackgroundCron(10); // 10 minutes interval
  }
}
