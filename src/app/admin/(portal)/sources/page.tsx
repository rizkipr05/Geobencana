"use client";

import { useState } from "react";
import { AdminHeader } from "@/components/admin/header";
import { Radio, RefreshCw, CheckCircle, AlertTriangle, Play, Settings2, ShieldCheck } from "lucide-react";

interface DataSourceItem {
  code: string;
  name: string;
  provider: string;
  endpoint: string;
  intervalMins: number;
  status: "HEALTHY" | "SYNCING" | "ERROR" | "IDLE";
  lastSync: string;
  itemsCount: number;
}

export default function AdminDataSourcesPage() {
  const [sources, setSources] = useState<DataSourceItem[]>([
    {
      code: "BMKG",
      name: "Badan Meteorologi, Klimatologi, dan Geofisika",
      provider: "BMKG Indonesia Open Data",
      endpoint: "https://data.bmkg.go.id/DataMKG/TEKTONIK/gempaterkini.json",
      intervalMins: 5,
      status: "HEALTHY",
      lastSync: "Just now",
      itemsCount: 15,
    },
    {
      code: "USGS",
      name: "USGS Earthquake Hazards Program",
      provider: "US Geological Survey",
      endpoint: "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_day.geojson",
      intervalMins: 10,
      status: "HEALTHY",
      lastSync: "3 minutes ago",
      itemsCount: 42,
    },
    {
      code: "NASA_EONET",
      name: "NASA Earth Observatory Natural Event Tracker",
      provider: "NASA GSFC",
      endpoint: "https://eonet.gsfc.nasa.gov/api/v3/events?status=open",
      intervalMins: 30,
      status: "IDLE",
      lastSync: "1 hour ago",
      itemsCount: 8,
    },
    {
      code: "GDACS",
      name: "Global Disaster Alert and Coordination System",
      provider: "UN / European Commission",
      endpoint: "https://www.gdacs.org/xml/rss.xml",
      intervalMins: 15,
      status: "IDLE",
      lastSync: "2 hours ago",
      itemsCount: 12,
    },
  ]);

  const [syncingCode, setSyncingCode] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleSyncSource = async (code: string) => {
    setSyncingCode(code);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/sync?source=${code}`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setMessage(`Successfully triggered ${code} synchronization!`);
        setSources((prev) =>
          prev.map((s) =>
            s.code === code ? { ...s, status: "HEALTHY", lastSync: "Just now" } : s
          )
        );
      } else {
        setMessage(`Error syncing ${code}: ${data.error}`);
      }
    } catch {
      setMessage(`Failed to connect to ${code} endpoint.`);
    } finally {
      setSyncingCode(null);
    }
  };

  return (
    <div>
      <AdminHeader
        title="Data Source & Feed Integrations"
        subtitle="Manage external disaster telemetry APIs, deduplication, and polling rates"
      />

      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        {message && (
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-700 text-xs text-rose-300 flex items-center justify-between">
            <span>{message}</span>
            <button
              onClick={() => setMessage(null)}
              className="text-slate-400 hover:text-white"
            >
              &times;
            </button>
          </div>
        )}

        {/* Overview banner */}
        <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900/90 to-slate-950 border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Radio className="h-5 w-5 text-rose-500" />
              Automated Telemetry Ingestion Hub
            </h2>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl">
              DISASTRA ingests earthquake, tsunami, and wildfire telemetry from international agencies.
              The deduplication pipeline automatically matches coordinates and timestamps to prevent duplicate alerts.
            </p>
          </div>
          <button
            onClick={() => handleSyncSource("ALL")}
            disabled={syncingCode !== null}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-orange-500 hover:from-rose-500 hover:to-orange-400 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-rose-500/20 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${syncingCode ? "animate-spin" : ""}`} />
            <span>Poll All Providers Now</span>
          </button>
        </div>

        {/* Source Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sources.map((src) => (
            <div
              key={src.code}
              className="p-5 rounded-xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-black text-sm text-white px-2 py-0.5 rounded bg-slate-800 border border-slate-700">
                      {src.code}
                    </span>
                    <span className="text-xs font-semibold text-slate-300">{src.provider}</span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1 font-bold uppercase">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    {src.status}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-slate-100">{src.name}</h3>
                <p className="text-[11px] text-slate-400 font-mono break-all mt-1 bg-slate-950/60 p-2 rounded border border-slate-850">
                  {src.endpoint}
                </p>

                <div className="grid grid-cols-3 gap-2 mt-4 text-center">
                  <div className="p-2 rounded bg-slate-950 border border-slate-850">
                    <span className="text-[10px] text-slate-400 block">Polling</span>
                    <span className="text-xs font-bold text-slate-200 font-mono">
                      Every {src.intervalMins}m
                    </span>
                  </div>
                  <div className="p-2 rounded bg-slate-950 border border-slate-850">
                    <span className="text-[10px] text-slate-400 block">Last Synced</span>
                    <span className="text-xs font-bold text-slate-200 font-mono">{src.lastSync}</span>
                  </div>
                  <div className="p-2 rounded bg-slate-950 border border-slate-850">
                    <span className="text-[10px] text-slate-400 block">Total Ingested</span>
                    <span className="text-xs font-bold text-rose-400 font-mono">
                      {src.itemsCount} events
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 mt-5 pt-4 border-t border-slate-800/80">
                <button
                  onClick={() => handleSyncSource(src.code)}
                  disabled={syncingCode === src.code}
                  className="flex-1 py-2 px-3 rounded-lg bg-rose-600/15 hover:bg-rose-600/25 border border-rose-500/30 text-rose-400 hover:text-rose-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                >
                  <Play className={`h-3 w-3 ${syncingCode === src.code ? "animate-spin" : ""}`} />
                  <span>{syncingCode === src.code ? "Ingesting..." : "Sync Feeds"}</span>
                </button>
                <button
                  type="button"
                  className="p-2 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs transition-colors"
                  title="Configure Parameters"
                >
                  <Settings2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Deduplication & Pipeline rules */}
        <div className="p-5 rounded-xl bg-slate-900/70 border border-slate-800">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-3 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            Active Deduplication & Ingestion Rules
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-400">
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-850">
              <span className="font-semibold text-slate-200 block mb-1">Spatial Proximity Check</span>
              Radius threshold 15 km. Two events within 15 km radius are flagged for cross-matching.
            </div>
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-850">
              <span className="font-semibold text-slate-200 block mb-1">Time Delta Tolerance</span>
              Events with delta t &lt; 300 seconds (5 minutes) from different agencies merge into one canonical record.
            </div>
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-850">
              <span className="font-semibold text-slate-200 block mb-1">Magnitude Prioritization</span>
              For Indonesia territory, BMKG data takes authoritative priority; for Pacific/Global, USGS is prioritized.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
