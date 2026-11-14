"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useTheme } from "@/context/theme-context";
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
  const { isDark } = useTheme();
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
    document.title = "Analytics Bencana Indonesia | DISASTRA AI";
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
    <div
      className={cn(
        "w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 pb-16 transition-colors duration-200",
        isDark ? "bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-900"
      )}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="p-1 rounded bg-rose-500/10 text-rose-500 border border-rose-500/20">
              <BarChart3 className="h-4 w-4" />
            </span>
            <span className="text-xs font-mono font-semibold uppercase tracking-wider text-rose-500">
              SEISMIC TELEMETRY &amp; HISTORICAL TRENDS
            </span>
          </div>
          <h1 className={cn("text-2xl sm:text-3xl font-extrabold transition-colors", isDark ? "text-white" : "text-slate-900")}>
            Disaster Analytics &amp; Trends
          </h1>
          <p className={cn("text-xs sm:text-sm mt-1 max-w-2xl transition-colors", isDark ? "text-slate-400" : "text-slate-600")}>
            Agregasi statistik kejadian gempa bumi global &amp; nasional bersumber dari BMKG dan USGS secara
            real-time di database Neon PostgreSQL.
          </p>
        </div>

        <button
          onClick={fetchAnalytics}
          disabled={loading}
          className={cn(
            "flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium transition-all shadow-sm self-start sm:self-auto cursor-pointer border",
            isDark
              ? "bg-slate-900 hover:bg-slate-800 border-slate-750 text-slate-300 hover:text-white"
              : "bg-white hover:bg-slate-100 border-slate-200 text-slate-700 hover:text-slate-900 shadow-slate-200/50"
          )}
        >
          <RefreshCw className={cn("h-3.5 w-3.5 text-rose-500", loading && "animate-spin")} />
          <span>Segarkan Data</span>
        </button>
      </div>

      {loading && !data ? (
        <div
          className={cn(
            "h-64 rounded-2xl border flex flex-col items-center justify-center text-slate-500 transition-colors",
            isDark ? "border-slate-800 bg-slate-900/40" : "border-slate-200 bg-white shadow-sm"
          )}
        >
          <Activity className="h-8 w-8 text-rose-500 animate-spin mb-3" />
          <span className="font-mono text-xs">Mengagregasi data seismik dari Neon DB...</span>
        </div>
      ) : error ? (
        <div className="p-6 rounded-2xl bg-rose-950/20 border border-rose-500/30 text-rose-500 text-xs">
          {error}
        </div>
      ) : data ? (
        <div className="space-y-6">
          {/* Top Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div
              className={cn(
                "p-4 rounded-2xl border transition-colors",
                isDark ? "bg-slate-900/80 border-slate-800" : "bg-white border-slate-200 shadow-sm"
              )}
            >
              <span className={cn("text-[10px] font-mono uppercase", isDark ? "text-slate-400" : "text-slate-500")}>
                Total Gempa Terdeteksi
              </span>
              <p className={cn("text-2xl sm:text-3xl font-black mt-1 font-mono", isDark ? "text-white" : "text-slate-900")}>
                {data.totalEvents}
              </p>
              <span className={cn("text-[10px] flex items-center gap-1 mt-1", isDark ? "text-slate-500" : "text-slate-400")}>
                <Globe2 className="h-3 w-3 text-emerald-500" />
                <span>Terindeks di Neon</span>
              </span>
            </div>

            <div
              className={cn(
                "p-4 rounded-2xl border transition-colors",
                isDark ? "bg-slate-900/80 border-slate-800" : "bg-white border-slate-200 shadow-sm"
              )}
            >
              <span className={cn("text-[10px] font-mono uppercase", isDark ? "text-slate-400" : "text-slate-500")}>
                Magnitudo Tertinggi
              </span>
              <p className="text-2xl sm:text-3xl font-black text-rose-500 mt-1 font-mono">
                M {data.maxMagnitude.toFixed(1)}
              </p>
              <span className={cn("text-[10px] mt-1 block", isDark ? "text-slate-500" : "text-slate-400")}>
                Skala Terbesar Terpantau
              </span>
            </div>

            <div
              className={cn(
                "p-4 rounded-2xl border transition-colors",
                isDark ? "bg-slate-900/80 border-slate-800" : "bg-white border-slate-200 shadow-sm"
              )}
            >
              <span className={cn("text-[10px] font-mono uppercase", isDark ? "text-slate-400" : "text-slate-500")}>
                Rata-Rata Magnitudo
              </span>
              <p className="text-2xl sm:text-3xl font-black text-amber-500 mt-1 font-mono">
                M {data.avgMagnitude}
              </p>
              <span className={cn("text-[10px] mt-1 block", isDark ? "text-slate-500" : "text-slate-400")}>
                Mean Skala Seismik
              </span>
            </div>

            <div
              className={cn(
                "p-4 rounded-2xl border transition-colors",
                isDark ? "bg-slate-900/80 border-slate-800" : "bg-white border-slate-200 shadow-sm"
              )}
            >
              <span className={cn("text-[10px] font-mono uppercase", isDark ? "text-slate-400" : "text-slate-500")}>
                Peringatan Tsunami
              </span>
              <p className="text-2xl sm:text-3xl font-black text-sky-500 mt-1 font-mono">
                {data.tsunamiCount}
              </p>
              <span className={cn("text-[10px] mt-1 block", isDark ? "text-slate-500" : "text-slate-400")}>
                Status Potensi Aktif/Terverifikasi
              </span>
            </div>
          </div>

          {/* Middle Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Magnitude Breakdown Bar Chart (6 cols) */}
            <div
              className={cn(
                "lg:col-span-6 p-5 rounded-2xl border transition-colors",
                isDark ? "bg-slate-900/80 border-slate-800" : "bg-white border-slate-200 shadow-sm"
              )}
            >
              <h2 className={cn("text-sm font-bold flex items-center gap-2 mb-4", isDark ? "text-white" : "text-slate-900")}>
                <TrendingUp className="h-4 w-4 text-rose-500" />
                <span>Distribusi Skala Magnitudo (Mw)</span>
              </h2>

              <div className="space-y-4">
                {[
                  {
                    label: "M < 4.0 (Minor / Mikro)",
                    count: data.magnitudeDistribution.under4,
                    color: "bg-emerald-500",
                    textColor: "text-emerald-500",
                  },
                  {
                    label: "M 4.0 - 4.9 (Ringan)",
                    count: data.magnitudeDistribution.range4to5,
                    color: "bg-sky-500",
                    textColor: "text-sky-500",
                  },
                  {
                    label: "M 5.0 - 5.9 (Sedang / Terasa)",
                    count: data.magnitudeDistribution.range5to6,
                    color: "bg-amber-500",
                    textColor: "text-amber-500",
                  },
                  {
                    label: "M ≥ 6.0 (Kuat & Merusak)",
                    count: data.magnitudeDistribution.above6,
                    color: "bg-rose-500",
                    textColor: "text-rose-500",
                  },
                ].map((item, idx) => {
                  const pct = data.totalEvents > 0 ? Math.round((item.count / data.totalEvents) * 100) : 0;
                  return (
                    <div key={idx}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className={cn("font-medium", isDark ? "text-slate-300" : "text-slate-700")}>
                          {item.label}
                        </span>
                        <span className={cn("font-mono font-bold", item.textColor)}>
                          {item.count} kejadian ({pct}%)
                        </span>
                      </div>
                      <div className={cn("w-full h-2.5 rounded-full overflow-hidden", isDark ? "bg-slate-800" : "bg-slate-100")}>
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
            <div
              className={cn(
                "lg:col-span-6 p-5 rounded-2xl border flex flex-col justify-between transition-colors",
                isDark ? "bg-slate-900/80 border-slate-800" : "bg-white border-slate-200 shadow-sm"
              )}
            >
              <div>
                <h2 className={cn("text-sm font-bold flex items-center gap-2 mb-4", isDark ? "text-white" : "text-slate-900")}>
                  <Layers className="h-4 w-4 text-sky-500" />
                  <span>Kategori Kedalaman Hiposenter</span>
                </h2>

                <div className="grid grid-cols-3 gap-3 mb-6">
                  <div
                    className={cn(
                      "p-3.5 rounded-xl border text-center transition-colors",
                      isDark ? "bg-slate-950/80 border-slate-800" : "bg-slate-50/80 border-slate-200"
                    )}
                  >
                    <span className={cn("text-[10px] font-mono uppercase", isDark ? "text-slate-400" : "text-slate-500")}>
                      Dangkal (&le;60 km)
                    </span>
                    <p className="text-xl font-bold text-rose-500 mt-1 font-mono">
                      {data.depthDistribution.shallow}
                    </p>
                    <span className={cn("text-[9px]", isDark ? "text-slate-500" : "text-slate-400")}>
                      Risiko Kerusakan Tertinggi
                    </span>
                  </div>

                  <div
                    className={cn(
                      "p-3.5 rounded-xl border text-center transition-colors",
                      isDark ? "bg-slate-950/80 border-slate-800" : "bg-slate-50/80 border-slate-200"
                    )}
                  >
                    <span className={cn("text-[10px] font-mono uppercase", isDark ? "text-slate-400" : "text-slate-500")}>
                      Menengah (60-300 km)
                    </span>
                    <p className="text-xl font-bold text-amber-500 mt-1 font-mono">
                      {data.depthDistribution.intermediate}
                    </p>
                    <span className={cn("text-[9px]", isDark ? "text-slate-500" : "text-slate-400")}>
                      Guncangan Terasa Luas
                    </span>
                  </div>

                  <div
                    className={cn(
                      "p-3.5 rounded-xl border text-center transition-colors",
                      isDark ? "bg-slate-950/80 border-slate-800" : "bg-slate-50/80 border-slate-200"
                    )}
                  >
                    <span className={cn("text-[10px] font-mono uppercase", isDark ? "text-slate-400" : "text-slate-500")}>
                      Dalam (&gt;300 km)
                    </span>
                    <p className="text-xl font-bold text-sky-500 mt-1 font-mono">
                      {data.depthDistribution.deep}
                    </p>
                    <span className={cn("text-[9px]", isDark ? "text-slate-500" : "text-slate-400")}>
                      Aman Bagi Permukaan
                    </span>
                  </div>
                </div>
              </div>

              {/* Data Ingestion Feed Ratio */}
              <div
                className={cn(
                  "p-3.5 rounded-xl border transition-colors",
                  isDark ? "bg-slate-950/80 border-slate-800" : "bg-slate-50/80 border-slate-200"
                )}
              >
                <span className={cn("text-xs font-bold flex items-center gap-1.5 mb-2", isDark ? "text-white" : "text-slate-900")}>
                  <Radio className="h-3.5 w-3.5 text-emerald-500" />
                  <span>Rasio Sumber Feed Data</span>
                </span>
                <div className="flex items-center gap-4 text-xs font-mono">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
                    <span className={isDark ? "text-slate-300" : "text-slate-700"}>
                      BMKG Indonesia: {data.sources.bmkg}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-sky-500" />
                    <span className={isDark ? "text-slate-300" : "text-slate-700"}>
                      USGS Global: {data.sources.usgs}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Table: Recent Significant Earthquakes */}
          <div
            className={cn(
              "p-5 rounded-2xl border transition-colors",
              isDark ? "bg-slate-900/80 border-slate-800" : "bg-white border-slate-200 shadow-sm"
            )}
          >
            <h2 className={cn("text-sm font-bold flex items-center gap-2 mb-4", isDark ? "text-white" : "text-slate-900")}>
              <Activity className="h-4 w-4 text-rose-500" />
              <span>Daftar Kejadian Seismik Terkini (Neon Live Ingestion)</span>
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead
                  className={cn(
                    "font-mono uppercase text-[10px] border-b transition-colors",
                    isDark ? "bg-slate-950 text-slate-400 border-slate-800" : "bg-slate-50 text-slate-600 border-slate-200"
                  )}
                >
                  <tr>
                    <th className="py-3 px-3">Waktu Terdeteksi</th>
                    <th className="py-3 px-3">Lokasi / Wilayah</th>
                    <th className="py-3 px-3">Magnitudo</th>
                    <th className="py-3 px-3">Kedalaman</th>
                    <th className="py-3 px-3">Koordinat</th>
                    <th className="py-3 px-3">Tingkat Keparahan</th>
                  </tr>
                </thead>
                <tbody className={cn("divide-y font-sans", isDark ? "divide-slate-800/60" : "divide-slate-100")}>
                  {data.recentSignificantEvents.map((ev) => (
                    <tr
                      key={ev.id}
                      className={cn(
                        "transition-colors",
                        isDark ? "hover:bg-slate-850/50" : "hover:bg-slate-50/80"
                      )}
                    >
                      <td className={cn("py-3 px-3 font-mono text-[11px] whitespace-nowrap", isDark ? "text-slate-400" : "text-slate-500")}>
                        {new Date(ev.occurredAt).toLocaleString("id-ID", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </td>
                      <td className={cn("py-3 px-3 font-medium", isDark ? "text-slate-200" : "text-slate-900")}>
                        {ev.locationName || ev.title}
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-rose-500">
                        M {Number(ev.magnitude).toFixed(1)}
                      </td>
                      <td className={cn("py-3 px-3 font-mono", isDark ? "text-slate-300" : "text-slate-700")}>
                        {ev.depthKm ? `${ev.depthKm} km` : "—"}
                      </td>
                      <td className={cn("py-3 px-3 font-mono text-[11px]", isDark ? "text-slate-400" : "text-slate-500")}>
                        {Number(ev.latitude).toFixed(2)}, {Number(ev.longitude).toFixed(2)}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={cn(
                            "px-2 py-0.5 rounded text-[10px] font-mono font-bold border",
                            ev.severityLevel === "CRITICAL"
                              ? isDark
                                ? "bg-rose-500/20 text-rose-300 border-rose-500/30"
                                : "bg-rose-50 text-rose-700 border-rose-200"
                              : ev.severityLevel === "HIGH"
                              ? isDark
                                ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
                                : "bg-amber-50 text-amber-700 border-amber-200"
                              : isDark
                              ? "bg-sky-500/20 text-sky-300 border-sky-500/30"
                              : "bg-sky-50 text-sky-700 border-sky-200"
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
