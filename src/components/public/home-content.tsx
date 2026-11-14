"use client";

import Link from "next/link";
import { PublicNavbar } from "@/components/public/navbar";
import { useTheme } from "@/context/theme-context";
import { cn } from "@/lib/utils";
import {
  Globe2,
  Cpu,
  Bot,
  Backpack,
  BarChart3,
  ArrowRight,
  Lock,
} from "lucide-react";

export function HomeContent() {
  const { isDark } = useTheme();

  return (
    <div
      className={cn(
        "min-h-screen flex flex-col font-sans selection:bg-rose-500/30 selection:text-rose-200 transition-colors duration-200",
        isDark ? "bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-900"
      )}
    >
      {/* Top Navbar */}
      <PublicNavbar />

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-16 sm:py-24 relative overflow-hidden text-center">
        {/* Glow Effects */}
        <div
          className={cn(
            "absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] rounded-full blur-[140px] pointer-events-none transition-opacity",
            isDark ? "bg-rose-600/10" : "bg-rose-400/15"
          )}
        />
        <div
          className={cn(
            "absolute top-1/2 left-1/4 w-[400px] h-[300px] rounded-full blur-[120px] pointer-events-none transition-opacity",
            isDark ? "bg-orange-600/10" : "bg-orange-400/15"
          )}
        />

        {/* Live status badge */}
        <div
          className={cn(
            "inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs mb-8 backdrop-blur-md shadow-sm transition-colors",
            isDark
              ? "bg-slate-900/90 border border-slate-800 text-slate-300"
              : "bg-white/95 border border-slate-200 text-slate-700 shadow-slate-200/50"
          )}
        >
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-mono text-[11px]">
            Real-Time Automated Polling: BMKG &bull; USGS (Indonesia) &bull; NASA EONET
          </span>
        </div>

        <h1
          className={cn(
            "text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight max-w-5xl leading-tight sm:leading-none transition-colors",
            isDark ? "text-white" : "text-slate-900"
          )}
        >
          Indonesia Disaster Intelligence &amp;{" "}
          <span className="bg-gradient-to-r from-rose-500 via-orange-400 to-amber-400 bg-clip-text text-transparent">
            3D Simulation Platform
          </span>
        </h1>

        <p
          className={cn(
            "mt-6 text-sm sm:text-base max-w-2xl leading-relaxed transition-colors",
            isDark ? "text-slate-400" : "text-slate-600"
          )}
        >
          Platform terpadu pemantauan bencana wilayah Indonesia (Gempa Tektonik BMKG &amp; USGS, Kebakaran Hutan, Erupsi Gunung Api &amp; Banjir NASA EONET), simulasi interaktif fisika ruptur lempeng &amp;
          tsunami berbasis Babylon.js, serta asisten evakuasi AI.
        </p>

        {/* Primary CTA Buttons */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3 w-full max-w-md">
          <Link
            href="/map"
            className="flex-1 min-w-[180px] px-6 py-3.5 rounded-xl bg-gradient-to-r from-rose-600 via-rose-500 to-orange-500 hover:from-rose-500 hover:to-orange-400 text-white font-bold text-xs tracking-wider uppercase shadow-xl shadow-rose-600/25 flex items-center justify-center gap-2 transition-all hover:scale-[1.02]"
          >
            <Globe2 className="h-4 w-4" />
            <span>Buka Live Map</span>
            <ArrowRight className="h-4 w-4 ml-1" />
          </Link>

          <Link
            href="/simulate"
            className={cn(
              "flex-1 min-w-[180px] px-6 py-3.5 rounded-xl border font-bold text-xs tracking-wider uppercase transition-all flex items-center justify-center gap-2",
              isDark
                ? "bg-slate-900 hover:bg-slate-850 border-slate-800 text-slate-200 hover:text-white hover:border-slate-700"
                : "bg-white hover:bg-slate-100 border-slate-200 text-slate-800 hover:text-slate-900 hover:border-slate-300 shadow-sm"
            )}
          >
            <Cpu className="h-4 w-4 text-rose-500" />
            <span>3D Simulator</span>
          </Link>
        </div>

        {/* Public Modules 6-Card Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-6xl mx-auto mt-20 text-left w-full">
          {/* Card 1: Live Disaster Map */}
          <Link
            href="/map"
            className={cn(
              "p-6 rounded-2xl border transition-all group backdrop-blur-sm",
              isDark
                ? "bg-slate-900/70 border-slate-800/80 hover:border-rose-500/40 hover:bg-slate-900/90"
                : "bg-white/90 border-slate-200/90 hover:border-rose-400/50 hover:bg-white shadow-sm hover:shadow-md"
            )}
          >
            <div className="h-10 w-10 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
              <Globe2 className="h-5 w-5" />
            </div>
            <div className="flex items-center justify-between mb-1">
              <h3
                className={cn(
                  "text-sm font-bold transition-colors",
                  isDark ? "text-white group-hover:text-rose-400" : "text-slate-900 group-hover:text-rose-600"
                )}
              >
                Peta Bencana Indonesia
              </h3>
              <ArrowRight
                className={cn(
                  "h-3.5 w-3.5 transition-all group-hover:translate-x-1",
                  isDark ? "text-slate-500 group-hover:text-rose-400" : "text-slate-400 group-hover:text-rose-600"
                )}
              />
            </div>
            <p className={cn("text-xs leading-relaxed", isDark ? "text-slate-400" : "text-slate-600")}>
              Peta interaktif Leaflet khusus teritori Indonesia dari BMKG, USGS &amp; NASA EONET dengan drawer analisis dampak AI
              dan radius gempa.
            </p>
          </Link>

          {/* Card 2: 3D What-If Simulator */}
          <Link
            href="/simulate"
            className={cn(
              "p-6 rounded-2xl border transition-all group backdrop-blur-sm",
              isDark
                ? "bg-slate-900/70 border-slate-800/80 hover:border-amber-500/40 hover:bg-slate-900/90"
                : "bg-white/90 border-slate-200/90 hover:border-amber-400/50 hover:bg-white shadow-sm hover:shadow-md"
            )}
          >
            <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
              <Cpu className="h-5 w-5" />
            </div>
            <div className="flex items-center justify-between mb-1">
              <h3
                className={cn(
                  "text-sm font-bold transition-colors",
                  isDark ? "text-white group-hover:text-amber-400" : "text-slate-900 group-hover:text-amber-600"
                )}
              >
                3D What-If Simulator
              </h3>
              <ArrowRight
                className={cn(
                  "h-3.5 w-3.5 transition-all group-hover:translate-x-1",
                  isDark ? "text-slate-500 group-hover:text-amber-400" : "text-slate-400 group-hover:text-amber-600"
                )}
              />
            </div>
            <p className={cn("text-xs leading-relaxed", isDark ? "text-slate-400" : "text-slate-600")}>
              Simulasi fisika 3D WebGL ruptur lempeng tektonik, deformasi dasar laut, ombak tsunami, serta
              cascade impact jembatan &amp; listrik.
            </p>
          </Link>

          {/* Card 3: AI Assistant */}
          <Link
            href="/assistant"
            className={cn(
              "p-6 rounded-2xl border transition-all group backdrop-blur-sm",
              isDark
                ? "bg-slate-900/70 border-slate-800/80 hover:border-sky-500/40 hover:bg-slate-900/90"
                : "bg-white/90 border-slate-200/90 hover:border-sky-400/50 hover:bg-white shadow-sm hover:shadow-md"
            )}
          >
            <div className="h-10 w-10 rounded-xl bg-sky-500/10 text-sky-500 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
              <Bot className="h-5 w-5" />
            </div>
            <div className="flex items-center justify-between mb-1">
              <h3
                className={cn(
                  "text-sm font-bold transition-colors",
                  isDark ? "text-white group-hover:text-sky-400" : "text-slate-900 group-hover:text-sky-600"
                )}
              >
                AI Evacuation Assistant
              </h3>
              <ArrowRight
                className={cn(
                  "h-3.5 w-3.5 transition-all group-hover:translate-x-1",
                  isDark ? "text-slate-500 group-hover:text-sky-400" : "text-slate-400 group-hover:text-sky-600"
                )}
              />
            </div>
            <p className={cn("text-xs leading-relaxed", isDark ? "text-slate-400" : "text-slate-600")}>
              Tanya jawab interaktif cerdas mengenai protokol evakuasi darurat, pertolongan pertama, dan
              zona aman bencana.
            </p>
          </Link>

          {/* Card 4: Preparedness & Survival Kit */}
          <Link
            href="/preparedness"
            className={cn(
              "p-6 rounded-2xl border transition-all group backdrop-blur-sm",
              isDark
                ? "bg-slate-900/70 border-slate-800/80 hover:border-emerald-500/40 hover:bg-slate-900/90"
                : "bg-white/90 border-slate-200/90 hover:border-emerald-400/50 hover:bg-white shadow-sm hover:shadow-md"
            )}
          >
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
              <Backpack className="h-5 w-5" />
            </div>
            <div className="flex items-center justify-between mb-1">
              <h3
                className={cn(
                  "text-sm font-bold transition-colors",
                  isDark ? "text-white group-hover:text-emerald-400" : "text-slate-900 group-hover:text-emerald-600"
                )}
              >
                Kesiapsiagaan 72-Jam
              </h3>
              <ArrowRight
                className={cn(
                  "h-3.5 w-3.5 transition-all group-hover:translate-x-1",
                  isDark ? "text-slate-500 group-hover:text-emerald-400" : "text-slate-400 group-hover:text-emerald-600"
                )}
              />
            </div>
            <p className={cn("text-xs leading-relaxed", isDark ? "text-slate-400" : "text-slate-600")}>
              Checklist interaktif Tas Siaga Bencana (Survival Kit) dengan indikator kesiapan tersimpan di
              browser serta SOP resmi darurat.
            </p>
          </Link>

          {/* Card 5: Analytics */}
          <Link
            href="/analytics"
            className={cn(
              "p-6 rounded-2xl border transition-all group backdrop-blur-sm",
              isDark
                ? "bg-slate-900/70 border-slate-800/80 hover:border-purple-500/40 hover:bg-slate-900/90"
                : "bg-white/90 border-slate-200/90 hover:border-purple-400/50 hover:bg-white shadow-sm hover:shadow-md"
            )}
          >
            <div className="h-10 w-10 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div className="flex items-center justify-between mb-1">
              <h3
                className={cn(
                  "text-sm font-bold transition-colors",
                  isDark ? "text-white group-hover:text-purple-400" : "text-slate-900 group-hover:text-purple-600"
                )}
              >
                Disaster Analytics
              </h3>
              <ArrowRight
                className={cn(
                  "h-3.5 w-3.5 transition-all group-hover:translate-x-1",
                  isDark ? "text-slate-500 group-hover:text-purple-400" : "text-slate-400 group-hover:text-purple-600"
                )}
              />
            </div>
            <p className={cn("text-xs leading-relaxed", isDark ? "text-slate-400" : "text-slate-600")}>
              Visualisasi tren gempa historis, distribusi skala magnitudo &amp; kedalaman, serta rasio data
              BMKG vs USGS dari database Neon.
            </p>
          </Link>

          {/* Card 6: Admin Portal */}
          <Link
            href="/admin/login"
            className={cn(
              "p-6 rounded-2xl border transition-all group backdrop-blur-sm",
              isDark
                ? "bg-slate-900/40 border-slate-800/60 hover:border-slate-700 hover:bg-slate-900/70"
                : "bg-slate-100/70 border-slate-200 hover:border-slate-300 hover:bg-white shadow-sm hover:shadow-md"
            )}
          >
            <div
              className={cn(
                "h-10 w-10 rounded-xl flex items-center justify-center mb-4 group-hover:scale-105 transition-transform",
                isDark ? "bg-slate-800 text-slate-300" : "bg-slate-200 text-slate-700"
              )}
            >
              <Lock className="h-5 w-5 text-rose-500" />
            </div>
            <div className="flex items-center justify-between mb-1">
              <h3
                className={cn(
                  "text-sm font-bold transition-colors",
                  isDark ? "text-white group-hover:text-slate-200" : "text-slate-900 group-hover:text-slate-700"
                )}
              >
                Admin Command Center
              </h3>
              <ArrowRight
                className={cn(
                  "h-3.5 w-3.5 transition-all group-hover:translate-x-1",
                  isDark ? "text-slate-500 group-hover:text-slate-300" : "text-slate-400 group-hover:text-slate-600"
                )}
              />
            </div>
            <p className={cn("text-xs leading-relaxed", isDark ? "text-slate-400" : "text-slate-600")}>
              Portal operasional untuk operator darurat: manajemen sumber data, sinkronisasi manual, dan
              pemantauan log sinkronisasi.
            </p>
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer
        className={cn(
          "border-t py-6 text-center text-xs font-mono transition-colors",
          isDark
            ? "border-slate-900 bg-slate-950/80 text-slate-500"
            : "border-slate-200 bg-white/90 text-slate-500 shadow-inner"
        )}
      >
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>DISASTRA &bull; AI-Powered Global Disaster Intelligence &amp; 3D Simulation Platform</p>
          <div
            className={cn(
              "flex items-center gap-4 text-[11px] transition-colors",
              isDark ? "text-slate-400" : "text-slate-600"
            )}
          >
            <span>Data: BMKG, USGS, NASA, GDACS</span>
            <span>&bull;</span>
            <span>Neon Lakebase Postgres</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
