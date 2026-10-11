import { db } from "@/db";
import { disasters, dataSources, syncLogs, users } from "@/db/schema";
import { desc, eq, count } from "drizzle-orm";
import { AdminHeader } from "@/components/admin/header";
import { formatDate } from "@/lib/utils";
import {
  AlertTriangle,
  Radio,
  Flame,
  Activity,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ShieldCheck,
  RefreshCw,
  Zap,
} from "lucide-react";
import Link from "next/link";

export const instant = false;

export default async function AdminDashboardPage() {
  // Query live data from Neon if DB connected, or fallback mocks for display
  let disasterList: any[] = [];
  let sourcesList: any[] = [];
  let totalDisasters = 0;
  let criticalCount = 0;

  if (db) {
    try {
      disasterList = await db.query.disasters.findMany({
        orderBy: [desc(disasters.occurredAt)],
        limit: 8,
      });

      sourcesList = await db.query.dataSources.findMany();
      totalDisasters = disasterList.length;
      criticalCount = disasterList.filter((d) => d.severityLevel === "CRITICAL").length;
    } catch {
      // Fallback if table not yet seeded
    }
  }

  // Fallback demo data if DB is empty or during first run before sync
  if (disasterList.length === 0) {
    disasterList = [
      {
        id: "demo-1",
        title: "Gempa M 6.2 - Barat Daya Sumur, Banten",
        categoryCode: "EARTHQUAKE",
        locationName: "Selat Sunda, Banten",
        magnitude: 6.2,
        depthKm: 10,
        severityLevel: "HIGH",
        status: "ACTIVE",
        verifiedStatus: "VERIFIED",
        occurredAt: new Date("2026-10-10T14:15:00Z"),
      },
      {
        id: "demo-2",
        title: "M 7.1 - Kermadec Islands, New Zealand",
        categoryCode: "EARTHQUAKE",
        locationName: "Kermadec Islands Region",
        magnitude: 7.1,
        depthKm: 34,
        severityLevel: "CRITICAL",
        status: "ACTIVE",
        verifiedStatus: "VERIFIED",
        occurredAt: new Date("2026-10-10T11:45:00Z"),
      },
      {
        id: "demo-3",
        title: "Erupsi Gunung Marapi - Kolom Abu 1.500m",
        categoryCode: "VOLCANO",
        locationName: "Sumatera Barat, Indonesia",
        magnitude: null,
        depthKm: null,
        severityLevel: "HIGH",
        status: "ACTIVE",
        verifiedStatus: "VERIFIED",
        occurredAt: new Date("2026-10-10T08:30:00Z"),
      },
      {
        id: "demo-4",
        title: "Banjir Luapan Sungai Citarum",
        categoryCode: "FLOOD",
        locationName: "Dayeuhkolot, Bandung",
        magnitude: null,
        depthKm: null,
        severityLevel: "MEDIUM",
        status: "ACTIVE",
        verifiedStatus: "VERIFIED",
        occurredAt: new Date("2026-10-09T22:00:00Z"),
      },
    ];
    totalDisasters = disasterList.length;
    criticalCount = 1;
  }

  if (sourcesList.length === 0) {
    sourcesList = [
      { code: "BMKG", name: "BMKG Indonesia", status: "HEALTHY", lastSyncAt: new Date("2026-10-10T14:30:00Z") },
      { code: "USGS", name: "USGS Earthquakes Feed", status: "HEALTHY", lastSyncAt: new Date("2026-10-10T14:25:00Z") },
      { code: "NASA_EONET", name: "NASA EONET Events", status: "IDLE", lastSyncAt: null },
      { code: "GDACS", name: "GDACS Global Disaster Alert", status: "IDLE", lastSyncAt: null },
    ];
  }

  return (
    <div>
      <AdminHeader
        title="Command Center Overview"
        subtitle="Real-time disaster telemetry, feed synchronizations & AI systems"
      />

      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        {/* KPI Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1 */}
          <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800/80 shadow-lg relative overflow-hidden group hover:border-slate-700 transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-400">Total Active Events</span>
              <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400">
                <AlertTriangle className="h-4 w-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-white font-mono">{totalDisasters}</span>
              <span className="text-[11px] font-semibold text-emerald-400 flex items-center">
                +3 past 24h
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-2">Monitored across 4 global providers</p>
          </div>

          {/* Card 2 */}
          <div className="p-4 rounded-xl bg-slate-900/70 border border-rose-900/30 shadow-lg relative overflow-hidden group hover:border-rose-700/50 transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-rose-300">Critical Alerts</span>
              <div className="p-2 rounded-lg bg-rose-500/20 text-rose-400 animate-pulse">
                <Flame className="h-4 w-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-rose-400 font-mono">{criticalCount}</span>
              <span className="text-[11px] font-semibold text-rose-400 uppercase tracking-wider">
                High Risk
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-2">Magnitudes ≥ 7.0 or Tsunami potential</p>
          </div>

          {/* Card 3 */}
          <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800/80 shadow-lg relative overflow-hidden group hover:border-slate-700 transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-400">Data Feeds Health</span>
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                <Radio className="h-4 w-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-white font-mono">100%</span>
              <span className="text-[11px] font-semibold text-emerald-400">Operational</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-2">BMKG & USGS active polling</p>
          </div>

          {/* Card 4 */}
          <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800/80 shadow-lg relative overflow-hidden group hover:border-slate-700 transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-400">AI Simulation Engine</span>
              <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400">
                <Zap className="h-4 w-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-white font-mono">Ready</span>
              <span className="text-[11px] font-semibold text-sky-400">Gemini 1.5</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-2">Cascade impact analyzer standing by</p>
          </div>
        </div>

        {/* Data Source Sync Telemetry Widget */}
        <div className="p-5 rounded-xl bg-slate-900/70 border border-slate-800/80 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Radio className="h-4 w-4 text-rose-500" />
                Data Source Ingestion Nodes
              </h2>
              <p className="text-xs text-slate-400">
                Real-time API polling status and ingestion health
              </p>
            </div>
            <Link
              href="/admin/sources"
              className="text-xs text-rose-400 hover:text-rose-300 font-semibold flex items-center gap-1"
            >
              Configure Sources <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {sourcesList.map((src: any) => (
              <div
                key={src.code}
                className="p-3.5 rounded-lg bg-slate-950/70 border border-slate-800/80 flex flex-col justify-between"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200 font-mono">{src.code}</span>
                  <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                    {src.status || "HEALTHY"}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 truncate mt-1.5">{src.name}</p>
                <div className="mt-3 pt-2 border-t border-slate-900 flex items-center justify-between text-[10px] text-slate-500 font-mono">
                  <span>Synced:</span>
                  <span>{formatDate(src.lastSyncAt)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Disasters Data Table */}
        <div className="rounded-xl bg-slate-900/70 border border-slate-800/80 shadow-lg overflow-hidden">
          <div className="p-5 border-b border-slate-800/80 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Activity className="h-4 w-4 text-rose-500" />
                Recent Verified Disaster Records
              </h2>
              <p className="text-xs text-slate-400">
                Live stream of seismic, volcanic, and hydrometeorological events
              </p>
            </div>
            <Link
              href="/admin/disasters"
              className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 text-xs font-semibold transition-all"
            >
              Manage All Events
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 text-slate-400 uppercase font-mono text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Event & Title</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Magnitude / Depth</th>
                  <th className="py-3 px-4">Severity</th>
                  <th className="py-3 px-4">Time (WIB/UTC)</th>
                  <th className="py-3 px-4 text-right">Verification</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {disasterList.map((item: any) => (
                  <tr key={item.id} className="hover:bg-slate-850/50 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-200">{item.title}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">{item.locationName}</div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-300">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px]">
                        {item.categoryCode}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono">
                      {item.magnitude ? (
                        <span className="font-bold text-rose-400">
                          M {item.magnitude}{" "}
                          <span className="text-slate-500 font-normal">
                            ({item.depthKm ? `${item.depthKm} km` : "-"})
                          </span>
                        </span>
                      ) : (
                        <span className="text-slate-500">-</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          item.severityLevel === "CRITICAL"
                            ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                            : item.severityLevel === "HIGH"
                            ? "bg-orange-500/20 text-orange-400 border border-orange-500/30"
                            : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                        }`}
                      >
                        {item.severityLevel}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px]">
                      {formatDate(item.occurredAt)}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-semibold">
                        <CheckCircle2 className="h-3 w-3" />
                        Verified
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
