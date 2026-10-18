"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  BarChart3,
  TrendingUp,
  Activity,
  Layers,
  Radio,
  RefreshCw,
  Globe2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AnalyticsData {
  totalEvents: number;
  maxMagnitude: number;
  avgMagnitude: string;
  tsunamiCount: number;
  magnitudeDistribution: {
    under4: number;
    range4to5: number;
    range5to6: number;
    above6: number;
  };
  depthDistribution: {
    shallow: number;
    intermediate: number;
    deep: number;
  };
  sources: {
    bmkg: number;
    usgs: number;
  };
  recentSignificantEvents: Array<{
    id: string;
    title: string;
    locationName: string;
    magnitude: number;
    depthKm: number;
    severityLevel: string;
    latitude: number;
    longitude: number;
    occurredAt: string;
  }>;
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/analytics");
      const json = await res.json();
      if (json.success && json.stats) {
        setData(json.stats);
      } else {
        throw new Error(json.error || "Gagal memuat analitik");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan koneksi");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    async function init() {
      try {
        const res = await fetch("/api/analytics");
        const json = await res.json();
        if (isMounted && json.success && json.stats) {
          setData(json.stats);
        } else if (isMounted) {
          throw new Error(json.error || "Gagal memuat analitik");
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Terjadi kesalahan koneksi");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }
    init();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 pb-16 bg-slate-950 text-slate-100">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="p-1 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <BarChart3 className="h-4 w-4" />
            </span>
            <span className="text-xs font-mono font-semibold uppercase tracking-wider text-rose-400">
              SEISMIC TELEMETRY &amp; HISTORICAL TRENDS
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Disaster Analytics &amp; Trends</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">
            Agregasi statistik kejadian gempa bumi global &amp; nasional bersumber dari BMKG dan USGS secara
            real-time di database Neon PostgreSQL.
          </p>
        </div>

        <button
          onClick={fetchAnalytics}
          disabled={loading}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-750 text-xs text-slate-300 hover:text-white transition-all shadow-sm self-start sm:self-auto"
        >
          <RefreshCw className={cn("h-3.5 w-3.5 text-rose-400", loading && "animate-spin")} />
          <span>Segarkan Data</span>
        </button>
      </div>

      {loading && !data ? (
        <div className="h-64 rounded-2xl border border-slate-800 bg-slate-900/40 flex flex-col items-center justify-center text-slate-500">
          <Activity className="h-8 w-8 text-rose-500 animate-spin mb-3" />
          <span className="font-mono text-xs">Mengagregasi data seismik dari Neon DB...</span>
        </div>
      ) : error ? (
        <div className="p-6 rounded-2xl bg-rose-950/20 border border-rose-500/30 text-rose-400 text-xs">
          {error}
        </div>
      ) : data ? (
        <div className="space-y-6">
          {/* Top Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
              <span className="text-[10px] font-mono text-slate-400 uppercase">Total Gempa Terdeteksi</span>
              <p className="text-2xl sm:text-3xl font-black text-white mt-1 font-mono">{data.totalEvents}</p>
              <span className="text-[10px] text-slate-500 flex items-center gap-1 mt-1">
                <Globe2 className="h-3 w-3 text-emerald-400" />
                <span>Terindeks di Neon</span>
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
              <span className="text-[10px] font-mono text-slate-400 uppercase">Magnitudo Tertinggi</span>
              <p className="text-2xl sm:text-3xl font-black text-rose-400 mt-1 font-mono">
                M {data.maxMagnitude.toFixed(1)}
              </p>
              <span className="text-[10px] text-slate-500 mt-1 block">Skala Terbesar Terpantau</span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
              <span className="text-[10px] font-mono text-slate-400 uppercase">Rata-Rata Magnitudo</span>
              <p className="text-2xl sm:text-3xl font-black text-amber-400 mt-1 font-mono">
                M {data.avgMagnitude}
              </p>
              <span className="text-[10px] text-slate-500 mt-1 block">Mean Skala Seismik</span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
              <span className="text-[10px] font-mono text-slate-400 uppercase">Peringatan Tsunami</span>
              <p className="text-2xl sm:text-3xl font-black text-sky-400 mt-1 font-mono">{data.tsunamiCount}</p>
              <span className="text-[10px] text-slate-500 mt-1 block">Status Potensi Aktif/Terverifikasi</span>
            </div>
          </div>

          {/* Middle Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Magnitude Breakdown Bar Chart (6 cols) */}
            <div className="lg:col-span-6 p-5 rounded-2xl bg-slate-900/80 border border-slate-800">
              <h2 className="text-sm font-bold text-white flex items-center gap-2 mb-4">
                <TrendingUp className="h-4 w-4 text-rose-400" />
                <span>Distribusi Skala Magnitudo (Mw)</span>
              </h2>

              <div className="space-y-4">
                {[
                  {
                    label: "M < 4.0 (Minor / Mikro)",
                    count: data.magnitudeDistribution.under4,
                    color: "bg-emerald-500",
                    textColor: "text-emerald-400",
                  },
                  {
                    label: "M 4.0 - 4.9 (Ringan)",
                    count: data.magnitudeDistribution.range4to5,
                    color: "bg-sky-500",
                    textColor: "text-sky-400",
                  },
                  {
                    label: "M 5.0 - 5.9 (Sedang / Terasa)",
                    count: data.magnitudeDistribution.range5to6,
                    color: "bg-amber-500",
                    textColor: "text-amber-400",
                  },
                  {
                    label: "M ≥ 6.0 (Kuat & Merusak)",
                    count: data.magnitudeDistribution.above6,
                    color: "bg-rose-500",
                    textColor: "text-rose-400",
                  },
                ].map((item, idx) => {
                  const pct = data.totalEvents > 0 ? Math.round((item.count / data.totalEvents) * 100) : 0;
                  return (
                    <div key={idx}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-300 font-medium">{item.label}</span>
                        <span className={cn("font-mono font-bold", item.textColor)}>
                          {item.count} kejadian ({pct}%)
                        </span>
                      </div>
                      <div className="w-full h-2.5 rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className={cn("h-full transition-all duration-500", item.color)}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Depth & Sources Breakdown (6 cols) */}
            <div className="lg:col-span-6 p-5 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
              <div>
                <h2 className="text-sm font-bold text-white flex items-center gap-2 mb-4">
                  <Layers className="h-4 w-4 text-sky-400" />
                  <span>Kategori Kedalaman Hiposenter</span>
                </h2>

                <div className="grid grid-cols-3 gap-3 mb-6">
                  <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 text-center">
                    <span className="text-[10px] font-mono text-slate-400 uppercase">Dangkal (&le;60 km)</span>
                    <p className="text-xl font-bold text-rose-400 mt-1 font-mono">
                      {data.depthDistribution.shallow}
                    </p>
                    <span className="text-[9px] text-slate-500">Risiko Kerusakan Tertinggi</span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 text-center">
                    <span className="text-[10px] font-mono text-slate-400 uppercase">Menengah (60-300 km)</span>
                    <p className="text-xl font-bold text-amber-400 mt-1 font-mono">
                      {data.depthDistribution.intermediate}
                    </p>
                    <span className="text-[9px] text-slate-500">Guncangan Terasa Luas</span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 text-center">
                    <span className="text-[10px] font-mono text-slate-400 uppercase">Dalam (&gt;300 km)</span>
                    <p className="text-xl font-bold text-sky-400 mt-1 font-mono">
                      {data.depthDistribution.deep}
                    </p>
                    <span className="text-[9px] text-slate-500">Aman Bagi Permukaan</span>
                  </div>
                </div>
              </div>

              {/* Data Ingestion Feed Ratio */}
              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800">
                <span className="text-xs font-bold text-white flex items-center gap-1.5 mb-2">
                  <Radio className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Rasio Sumber Feed Data</span>
                </span>
                <div className="flex items-center gap-4 text-xs font-mono">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
                    <span className="text-slate-300">BMKG Indonesia: {data.sources.bmkg}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-sky-500" />
                    <span className="text-slate-300">USGS Global: {data.sources.usgs}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Table: Recent Significant Earthquakes */}
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800">
            <h2 className="text-sm font-bold text-white flex items-center gap-2 mb-4">
              <Activity className="h-4 w-4 text-rose-500" />
              <span>Daftar Kejadian Seismik Terkini (Neon Live Ingestion)</span>
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 font-mono uppercase text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-3">Waktu Terdeteksi</th>
                    <th className="py-3 px-3">Lokasi / Wilayah</th>
                    <th className="py-3 px-3">Magnitudo</th>
                    <th className="py-3 px-3">Kedalaman</th>
                    <th className="py-3 px-3">Koordinat</th>
                    <th className="py-3 px-3">Tingkat Keparahan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-sans">
                  {data.recentSignificantEvents.map((ev) => (
                    <tr key={ev.id} className="hover:bg-slate-850/50 transition-colors">
                      <td className="py-3 px-3 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                        {new Date(ev.occurredAt).toLocaleString("id-ID", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </td>
                      <td className="py-3 px-3 font-medium text-slate-200">
                        {ev.locationName || ev.title}
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-rose-400">
                        M {Number(ev.magnitude).toFixed(1)}
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-300">
                        {ev.depthKm ? `${ev.depthKm} km` : "—"}
                      </td>
                      <td className="py-3 px-3 font-mono text-[11px] text-slate-400">
                        {Number(ev.latitude).toFixed(2)}, {Number(ev.longitude).toFixed(2)}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={cn(
                            "px-2 py-0.5 rounded text-[10px] font-mono font-bold",
                            ev.severityLevel === "CRITICAL"
                              ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                              : ev.severityLevel === "HIGH"
                              ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                              : "bg-sky-500/20 text-sky-300 border border-sky-500/30"
                          )}
                        >
                          {ev.severityLevel}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
