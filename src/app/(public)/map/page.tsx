"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import dynamic from "next/dynamic";
import { formatDate, cn } from "@/lib/utils";
import { useTheme } from "@/context/theme-context";
import {
  Search,
  MapPin,
  Sparkles,
  RefreshCw,
  Compass,
  X,
  Radio,
  Volume2,
  Eye,
  PanelLeftClose,
  PanelLeftOpen,
  Maximize2,
  Minimize2,
  Bot,
  Activity,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import Link from "next/link";
import {
  startEmergencySiren,
  stopEmergencySiren,
  playSingleBeep,
} from "@/lib/emergency-siren";
import {
  DisasterIcon,
  getDisasterConfig,
  BMKGWarningTriangle,
  BMKGLogoBadge,
  getBMKGAlertLevel,
} from "@/lib/disaster-icons";

const DisasterMap = dynamic(
  () => import("@/components/admin/disaster-map"),
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full flex items-center justify-center bg-slate-950 text-xs text-slate-500 font-mono">
        <Activity className="h-6 w-6 animate-spin text-rose-500 mr-2" />
        Memuat Peta Spasial Indonesia &amp; Layer Sesar...
      </div>
    ),
  }
);

interface DisasterItem {
  id: string;
  title: string;
  categoryCode: string;
  locationName: string;
  latitude: number;
  longitude: number;
  magnitude?: number | null;
  depthKm?: number | null;
  severityLevel: string;
  occurredAt: string;
  metadata?: Record<string, unknown> | null;
}

interface AiDangerZone {
  ring?: string;
  description?: string;
  radiusKm?: number;
}

interface AiCriticalInfrastructure {
  hospitals?: string;
  roadsAndBridges?: string;
  powerGrid?: string;
}

interface AiImpactReport {
  recommendedAlertLevel?: string;
  executiveSummary?: string;
  dangerZones?: AiDangerZone[];
  criticalInfrastructure?: AiCriticalInfrastructure;
}

export default function PublicMapPage() {
  const { isDark } = useTheme();
  const [disasters, setDisasters] = useState<DisasterItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [minMagnitude, setMinMagnitude] = useState(0);
  const [selectedDisaster, setSelectedDisaster] = useState<DisasterItem | null>(null);

  // Layout expansion state (Bisa digedein)
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Early Warning System state
  const [criticalAlert, setCriticalAlert] = useState<DisasterItem | null>(null);
  const [isSirenActive, setIsSirenActive] = useState<boolean>(false);
  const [bannerDismissed, setBannerDismissed] = useState<boolean>(false);
  const [isWarningExpanded, setIsWarningExpanded] = useState<boolean>(false);
  const [isZonesExpanded, setIsZonesExpanded] = useState<boolean>(false);

  // AI Drawer state
  const [aiReport, setAiReport] = useState<AiImpactReport | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    document.title = "Live Map Bencana Indonesia | DISASTRA AI";
    async function loadData() {
      setLoading(true);
      try {
        const res = await fetch("/api/admin/disasters?limit=150");
        const data = await res.json();
        if (data.success && data.disasters) {
          setDisasters(data.disasters);
          if (data.disasters.length > 0) {
            setSelectedDisaster(data.disasters[0]);
          }

          // Detect highest severity or tsunami hazard for Early Warning Banner
          const critical = data.disasters.find(
            (d: DisasterItem) =>
              (d.magnitude || 0) >= 6.5 ||
              d.severityLevel === "CRITICAL" ||
              d.metadata?.tsunami === 1 ||
              d.title.toLowerCase().includes("tsunami")
          );
          if (critical) {
            setCriticalAlert(critical);
          }
        }
      } catch {
        // Fallback
      } finally {
        setLoading(false);
      }
    }
    loadData();

    return () => {
      stopEmergencySiren();
    };
  }, []);

  const filteredDisasters = useMemo(() => {
    const q = search.toLowerCase().trim();
    return disasters.filter((d) => {
      const matchSearch =
        !q ||
        d.title.toLowerCase().includes(q) ||
        d.locationName.toLowerCase().includes(q);
      const matchCat = selectedCategory === "ALL" || d.categoryCode === selectedCategory;
      const matchMag = (d.magnitude || 0) >= minMagnitude;
      return matchSearch && matchCat && matchMag;
    });
  }, [disasters, search, selectedCategory, minMagnitude]);

  const mapDisasters = useMemo(
    () =>
      filteredDisasters.map((d) => ({
        id: d.id,
        title: d.title,
        categoryCode: d.categoryCode,
        latitude: d.latitude,
        longitude: d.longitude,
        magnitude: d.magnitude,
        depthKm: d.depthKm,
        severityLevel: d.severityLevel,
        locationName: d.locationName,
        metadata: d.metadata,
      })),
    [filteredDisasters]
  );

  const mapSelectedDisaster = useMemo(() => {
    if (!selectedDisaster) return null;
    return {
      id: selectedDisaster.id,
      title: selectedDisaster.title,
      categoryCode: selectedDisaster.categoryCode,
      latitude: selectedDisaster.latitude,
      longitude: selectedDisaster.longitude,
      magnitude: selectedDisaster.magnitude,
      depthKm: selectedDisaster.depthKm,
      severityLevel: selectedDisaster.severityLevel,
      locationName: selectedDisaster.locationName,
      metadata: selectedDisaster.metadata,
    };
  }, [selectedDisaster]);

  const handleToggleSiren = () => {
    if (isSirenActive) {
      stopEmergencySiren();
      setIsSirenActive(false);
    } else {
      startEmergencySiren();
      setIsSirenActive(true);
    }
  };

  const handleToggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const handleRunAiAnalysis = async (disaster: DisasterItem) => {
    setAiLoading(true);
    setAiReport(null);
    try {
      const res = await fetch("/api/admin/ai/impact-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ disasterData: disaster }),
      });
      const data = await res.json();
      if (data.success) {
        setAiReport(data.analysis);
      }
    } catch {
      alert("Gagal memproses AI impact");
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        "flex-1 flex flex-col lg:flex-row h-full min-h-0 w-full overflow-hidden relative transition-colors duration-200",
        isDark ? "bg-slate-950 text-slate-100" : "bg-slate-100 text-slate-900"
      )}
    >
      {/* Sidebar Disaster Stream & Filters (Collapsible for Max Map Space) */}
      {isSidebarOpen && (
        <div
          className={cn(
            "w-full lg:w-96 flex-shrink-0 flex flex-col h-full z-20 transition-all duration-300",
            isDark
              ? "bg-slate-950/95 border-r border-slate-800/80 text-white"
              : "bg-white/95 border-r border-slate-200 text-slate-900 shadow-lg"
          )}
        >
          {/* Header & Search */}
          <div className={cn("p-4 border-b space-y-3", isDark ? "border-slate-800/80" : "border-slate-200")}>
            <div className="flex items-center justify-between">
              <h2 className={cn("text-sm font-bold flex items-center gap-2", isDark ? "text-white" : "text-slate-900")}>
                <Radio className="h-4 w-4 text-rose-500 animate-pulse" />
                <span>Indonesia Disaster Feeds</span>
              </h2>
              <div className="flex items-center gap-1.5">
                <span
                  className={cn(
                    "text-[10px] font-mono px-2 py-0.5 rounded-full font-bold",
                    isDark
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  )}
                >
                  {filteredDisasters.length} Terdeteksi
                </span>
                <button
                  onClick={() => setIsSidebarOpen(false)}
                  className={cn(
                    "hidden lg:flex p-1 rounded-lg transition-colors",
                    isDark
                      ? "text-slate-400 hover:text-white hover:bg-slate-900"
                      : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                  )}
                  title="Sembunyikan Panel (Perbesar Peta)"
                >
                  <PanelLeftClose className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="relative">
              <Search className={cn("absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5", isDark ? "text-slate-500" : "text-slate-400")} />
              <input
                type="text"
                placeholder="Cari wilayah, kota, magnitudo..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={cn(
                  "w-full pl-9 pr-3 py-1.5 rounded-lg text-xs focus:outline-none focus:border-rose-500 transition-colors",
                  isDark
                    ? "bg-slate-900 border border-slate-800 text-slate-200 placeholder:text-slate-500"
                    : "bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 shadow-sm"
                )}
              />
            </div>

            {/* Quick Filters */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className={cn(
                  "px-2.5 py-1.5 rounded-lg text-[11px] focus:outline-none transition-colors",
                  isDark ? "bg-slate-900 border border-slate-800 text-slate-300" : "bg-slate-50 border border-slate-200 text-slate-800"
                )}
              >
                <option value="ALL">Semua Jenis Bencana</option>
                <option value="EARTHQUAKE">⚡ Gempa Bumi</option>
                <option value="WILDFIRE">🔥 Kebakaran Hutan (Karhutla)</option>
                <option value="VOLCANO">🌋 Erupsi Gunung Api</option>
                <option value="FLOOD">🌊 Banjir &amp; Bandang</option>
                <option value="TSUNAMI">🌊 Tsunami</option>
                <option value="STORM">🌀 Cuaca Ekstrem / Badai</option>
              </select>

              <select
                value={minMagnitude}
                onChange={(e) => setMinMagnitude(parseFloat(e.target.value))}
                className={cn(
                  "px-2.5 py-1.5 rounded-lg text-[11px] focus:outline-none transition-colors",
                  isDark ? "bg-slate-900 border border-slate-800 text-slate-300" : "bg-slate-50 border border-slate-200 text-slate-800"
                )}
              >
                <option value={0}>Semua Magnitudo</option>
                <option value={5.0}>M ≥ 5.0 (Kuat)</option>
                <option value={6.0}>M ≥ 6.0 (Merusak)</option>
                <option value={7.0}>M ≥ 7.0 (Besar/Tsunami)</option>
              </select>
            </div>

            {/* Early Warning Siren Control Bar */}
            <div className="pt-1 flex items-center justify-between">
              <button
                onClick={handleToggleSiren}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-mono font-bold transition-all border",
                  isSirenActive
                    ? "bg-rose-600 text-white border-rose-500 animate-pulse shadow-lg shadow-rose-600/40"
                    : isDark
                    ? "bg-slate-900 hover:bg-slate-850 text-slate-300 border-slate-800"
                    : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200 shadow-sm"
                )}
              >
                {isSirenActive ? (
                  <>
                    <Volume2 className="h-3.5 w-3.5 text-white animate-spin" />
                    <span>SIRINE DARURAT AKTIF (STOP)</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="h-3.5 w-3.5 text-rose-500" />
                    <span>Test Sirine Kedaruratan</span>
                  </>
                )}
              </button>

              <button
                onClick={() => playSingleBeep(1000, 0.2)}
                className={cn(
                  "text-[10px] font-mono px-2 py-1 rounded border transition-colors",
                  isDark
                    ? "text-slate-400 hover:text-slate-200 bg-slate-900 border-slate-800"
                    : "text-slate-600 hover:text-slate-900 bg-slate-50 border-slate-200"
                )}
                title="Uji nada audio"
              >
                Beep Test
              </button>
            </div>
          </div>

          {/* Disaster Event Stream List */}
          <div className={cn("flex-1 overflow-y-auto p-2 space-y-1.5 divide-y", isDark ? "divide-slate-850/60" : "divide-slate-100")}>
            {loading ? (
              <div className={cn("p-8 text-center text-xs font-mono", isDark ? "text-slate-500" : "text-slate-400")}>
                <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-rose-500" />
                Menghubungkan ke satelit data telemetry...
              </div>
            ) : filteredDisasters.length === 0 ? (
              <div className={cn("p-8 text-center text-xs font-mono", isDark ? "text-slate-500" : "text-slate-400")}>
                Tidak ada kejadian bencana sesuai filter.
              </div>
            ) : (
              filteredDisasters.map((item) => {
                const isSelected = selectedDisaster?.id === item.id;
                const isCritical =
                  item.severityLevel === "CRITICAL" || (item.magnitude || 0) >= 6.5;
                const catCfg = getDisasterConfig(item.categoryCode);

                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedDisaster(item)}
                    className={cn(
                      "p-3 rounded-xl transition-all cursor-pointer",
                      isSelected
                        ? isDark
                          ? "bg-slate-900 border border-rose-500/50 shadow-md ring-1 ring-rose-500/30"
                          : "bg-rose-50/90 border border-rose-300 shadow-md ring-1 ring-rose-400/30"
                        : isDark
                        ? "hover:bg-slate-900/60 border border-slate-900/40"
                        : "hover:bg-slate-50 border border-slate-100 bg-white/70 shadow-sm"
                    )}
                  >
                    <div className="flex items-start gap-2.5">
                      <div
                        className={cn(
                          "p-2 rounded-xl border flex-shrink-0 mt-0.5 shadow-sm",
                          catCfg.bgLight,
                          catCfg.borderLight,
                          catCfg.textLight
                        )}
                      >
                        <DisasterIcon categoryCode={item.categoryCode} className="h-4 w-4" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span
                            className={cn(
                              "text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded border",
                              catCfg.bgLight,
                              catCfg.textLight,
                              catCfg.borderLight
                            )}
                          >
                            {catCfg.shortLabel}
                          </span>

                          {item.magnitude ? (
                            <span
                              className={cn(
                                "text-[11px] font-mono font-black px-1.5 py-0.5 rounded",
                                isCritical
                                  ? "bg-rose-500 text-white animate-pulse"
                                  : item.magnitude >= 5.5
                                  ? "bg-orange-500/20 text-orange-500"
                                  : isDark
                                  ? "bg-slate-800 text-slate-300"
                                  : "bg-slate-100 text-slate-700"
                              )}
                            >
                              M {item.magnitude.toFixed(1)}
                            </span>
                          ) : (
                            <span className={cn("text-[10px] font-mono font-semibold", isDark ? "text-slate-400" : "text-slate-600")}>
                              {item.severityLevel}
                            </span>
                          )}
                        </div>

                        <span className={cn("text-xs font-bold block truncate leading-snug", isDark ? "text-slate-100" : "text-slate-900")}>
                          {item.title}
                        </span>

                        <p className={cn("text-[11px] flex items-center gap-1 mt-1 truncate", isDark ? "text-slate-400" : "text-slate-600")}>
                          <MapPin className={cn("h-3 w-3 flex-shrink-0", isDark ? "text-slate-500" : "text-slate-400")} />
                          <span className="truncate">{item.locationName}</span>
                        </p>
                      </div>
                    </div>

                    <div className={cn("flex items-center justify-between text-[10px] font-mono mt-2 pt-1.5 border-t", isDark ? "text-slate-500 border-slate-900" : "text-slate-400 border-slate-100")}>
                      <span>{item.depthKm ? `Kedalaman: ${item.depthKm} km` : "Radius: Terpantau"}</span>
                      <span>{formatDate(item.occurredAt)}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Main Map View Container (Expands Full Width when sidebar is closed) */}
      <div className="flex-1 h-full relative overflow-hidden flex flex-col">
        {/* Floating Open Sidebar Pill (when sidebar is closed) */}
        {!isSidebarOpen && (
          <button
            onClick={() => setIsSidebarOpen(true)}
            className={cn(
              "absolute top-4 left-4 z-30 px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-2 shadow-xl transition-all",
              isDark
                ? "bg-slate-950/95 border-slate-800 text-white hover:bg-slate-900 hover:border-rose-500/40"
                : "bg-white/95 border-slate-200 text-slate-900 hover:bg-slate-50 hover:border-rose-400"
            )}
          >
            <PanelLeftOpen className="h-4 w-4 text-rose-500" />
            <span>Feeds ({filteredDisasters.length})</span>
          </button>
        )}

        {/* Floating Fullscreen Toggle Button */}
        <button
          onClick={handleToggleFullscreen}
          className={cn(
            "absolute top-4 right-4 z-30 p-2 rounded-xl border shadow-xl transition-all",
            isDark
              ? "bg-slate-950/95 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-900"
              : "bg-white/95 border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-50"
          )}
          title={isFullscreen ? "Keluar Layar Penuh" : "Mode Layar Penuh"}
        >
          {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </button>

        {/* TOP FLOATING VISUAL EARLY WARNING BANNER (BMKG FORMAT - SLEEK & COMPACT) */}
        {criticalAlert && !bannerDismissed && (() => {
          const bmkg = getBMKGAlertLevel(criticalAlert);
          const isQuake = (criticalAlert.categoryCode || "EARTHQUAKE").toUpperCase() === "EARTHQUAKE";

          return (
            <div
              className={cn(
                "absolute top-3.5 left-1/2 -translate-x-1/2 z-30 w-[92%] sm:w-auto max-w-2xl rounded-xl border shadow-xl transition-all animate-fadeIn",
                bmkg.borderLight,
                isDark ? "bg-slate-950/95 shadow-rose-950/40 text-white" : "bg-white/98 shadow-slate-300 text-slate-900"
              )}
            >
              {/* Compact Ribbon Bar */}
              <div className="flex items-center justify-between gap-2.5 px-3 py-2 text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="relative flex items-center justify-center shrink-0">
                    <BMKGWarningTriangle className="h-4 w-4 filter drop-shadow" color={bmkg.color} />
                  </div>
                  <BMKGLogoBadge />
                  <span
                    className="px-1.5 py-0.5 rounded font-mono text-[9px] font-black uppercase text-white shrink-0"
                    style={{ backgroundColor: bmkg.color }}
                  >
                    {bmkg.level}
                  </span>
                  {criticalAlert.magnitude ? (
                    <span
                      className={cn(
                        "text-[11px] font-mono font-black px-1.5 py-0.5 rounded border shrink-0",
                        isDark ? "text-rose-400 bg-slate-900 border-slate-800" : "text-rose-600 bg-rose-50 border-rose-200"
                      )}
                    >
                      M {criticalAlert.magnitude.toFixed(1)}
                    </span>
                  ) : null}
                  <span className={cn("font-bold truncate text-[11px] max-w-[120px] sm:max-w-xs", isDark ? "text-white" : "text-slate-900")}>
                    {criticalAlert.title}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {/* Tsunami Status Badge */}
                  {isQuake && (
                    <span
                      className={cn(
                        "hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded font-mono text-[9.5px] font-bold",
                        bmkg.tsunamiRisk
                          ? "bg-rose-600/30 border border-rose-500 text-rose-300 animate-pulse"
                          : isDark
                          ? "bg-emerald-950/80 border border-emerald-500/40 text-emerald-400"
                          : "bg-emerald-50 border border-emerald-300 text-emerald-700"
                      )}
                    >
                      {bmkg.tsunamiRisk ? "🌊 Potensi Tsunami" : "✓ Tidak Tsunami"}
                    </span>
                  )}

                  {/* Focus Map Button */}
                  <button
                    onClick={() => setSelectedDisaster(criticalAlert)}
                    className="p-1 sm:px-2 sm:py-1 rounded-md bg-rose-600/90 hover:bg-rose-500 text-white text-[10.5px] font-bold flex items-center gap-1 shadow-sm transition-colors cursor-pointer"
                    title="Fokus Episentrum"
                  >
                    <Eye className="h-3 w-3" />
                    <span className="hidden sm:inline">Fokus</span>
                  </button>

                  {/* Siren Button */}
                  <button
                    onClick={handleToggleSiren}
                    className={cn(
                      "p-1 sm:px-2 sm:py-1 rounded-md text-[10.5px] font-mono font-bold flex items-center gap-1 border transition-colors cursor-pointer",
                      isSirenActive
                        ? "bg-rose-700 text-white border-rose-500 animate-pulse"
                        : isDark
                        ? "bg-slate-900 hover:bg-slate-850 text-rose-400 border-rose-500/30"
                        : "bg-slate-100 hover:bg-slate-200 text-rose-600 border-rose-200"
                    )}
                    title={isSirenActive ? "Matikan Sirine" : "Bunyikan Sirine"}
                  >
                    <Volume2 className="h-3 w-3" />
                    <span className="hidden md:inline">{isSirenActive ? "Stop" : "Sirine"}</span>
                  </button>

                  {/* Detail Toggle */}
                  <button
                    onClick={() => setIsWarningExpanded(!isWarningExpanded)}
                    className={cn(
                      "p-1 rounded-md border transition-colors cursor-pointer",
                      isDark
                        ? "text-slate-400 hover:text-white hover:bg-slate-900 border-slate-800"
                        : "text-slate-500 hover:text-slate-900 hover:bg-slate-100 border-slate-200"
                    )}
                    title={isWarningExpanded ? "Sembunyikan Detail" : "Lihat Detail Peringatan"}
                  >
                    {isWarningExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  </button>

                  {/* Dismiss Button */}
                  <button
                    onClick={() => setBannerDismissed(true)}
                    className={cn(
                      "p-1 rounded-md transition-colors cursor-pointer",
                      isDark ? "text-slate-500 hover:text-white hover:bg-slate-900" : "text-slate-400 hover:text-slate-900 hover:bg-slate-100"
                    )}
                    title="Tutup banner"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Expandable Details Drawer */}
              {isWarningExpanded && (
                <div className={cn("px-3 pb-3 pt-2 border-t space-y-2 text-xs font-mono", isDark ? "border-slate-800/80 text-slate-300" : "border-slate-200 text-slate-700")}>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
                    {criticalAlert.depthKm !== null && criticalAlert.depthKm !== undefined && (
                      <span>
                        Kedalaman: <strong className={isDark ? "text-white" : "text-slate-900"}>{criticalAlert.depthKm} km</strong>
                      </span>
                    )}
                    <span>
                      Lokasi: <span className={isDark ? "text-slate-200" : "text-slate-800"}>{criticalAlert.locationName}</span>
                    </span>
                    <span>
                      Waktu: <span className={isDark ? "text-slate-400" : "text-slate-500"}>{formatDate(criticalAlert.occurredAt)}</span>
                    </span>
                  </div>

                  {/* Advisory Notice */}
                  <div className="text-[10px] text-amber-500 dark:text-amber-300/90 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1.5 rounded-lg leading-relaxed font-sans">
                    📢 {bmkg.advisory}
                  </div>

                  <div className="flex items-center gap-2 pt-0.5">
                    <button
                      onClick={() => handleRunAiAnalysis(criticalAlert)}
                      className={cn(
                        "px-2.5 py-1 rounded-md text-[10.5px] font-semibold flex items-center gap-1.5 cursor-pointer border transition-colors",
                        isDark
                          ? "bg-slate-900 hover:bg-slate-850 border-slate-750 text-slate-200"
                          : "bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-800"
                      )}
                    >
                      <Sparkles className="h-3 w-3 text-amber-400" />
                      <span>Analisis AI</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* 100% Full Container Disaster Map Component */}
        <div className="w-full h-full flex-1 relative">
          <DisasterMap
            disasters={mapDisasters}
            selectedDisaster={mapSelectedDisaster}
            onSelectDisaster={(d) => {
              const fullItem = disasters.find((item) => item.id === d.id);
              if (fullItem) setSelectedDisaster(fullItem);
            }}
          />
        </div>

        {/* Selected Disaster Floating Card (Compact & Non-Intrusive) */}
        {selectedDisaster && (() => {
          const selCfg = getDisasterConfig(selectedDisaster.categoryCode);
          const isQuake = (selectedDisaster.categoryCode || "EARTHQUAKE").toUpperCase() === "EARTHQUAKE";

          return (
            <div
              className={cn(
                "absolute top-14 right-4 z-20 w-72 sm:w-80 rounded-xl border p-3.5 shadow-xl space-y-2.5 animate-fadeIn",
                isDark
                  ? "bg-slate-950/95 border-slate-800 text-white"
                  : "bg-white/98 border-slate-200 text-slate-900 shadow-slate-300"
              )}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2 min-w-0">
                  <div className={cn("p-1.5 rounded-lg border shrink-0 mt-0.5", selCfg.bgLight, selCfg.borderLight, selCfg.textLight)}>
                    <DisasterIcon categoryCode={selectedDisaster.categoryCode} className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className={cn("text-[9px] font-mono px-1.5 py-0.2 rounded border font-bold uppercase", selCfg.bgLight, selCfg.textLight, selCfg.borderLight)}>
                        {selCfg.shortLabel}
                      </span>
                      {((selectedDisaster.magnitude || 0) >= 6.5 || selectedDisaster.severityLevel === "CRITICAL") && (
                        <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-500 dark:text-rose-300 border border-rose-500/30 font-bold uppercase animate-pulse">
                          SIAGA
                        </span>
                      )}
                    </div>
                    <h3 className={cn("text-xs font-bold mt-0.5 truncate leading-snug", isDark ? "text-white" : "text-slate-900")}>
                      {selectedDisaster.title}
                    </h3>
                    <p className={cn("text-[10px] truncate", isDark ? "text-slate-400" : "text-slate-600")}>{selectedDisaster.locationName}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedDisaster(null)}
                  className={cn("p-1 rounded shrink-0 cursor-pointer", isDark ? "text-slate-500 hover:text-white" : "text-slate-400 hover:text-slate-900")}
                  title="Tutup info bencana"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Metrics Row */}
              {isQuake ? (
                <div className="space-y-1.5">
                  <div className="grid grid-cols-2 gap-1.5 text-center text-xs font-mono">
                    <div className={cn("p-1.5 rounded-lg border", isDark ? "bg-slate-900 border-slate-850" : "bg-slate-50 border-slate-200")}>
                      <span className={cn("text-[9px] block", isDark ? "text-slate-500" : "text-slate-400")}>Magnitudo</span>
                      <span className="text-sm font-black text-rose-500">
                        {selectedDisaster.magnitude ? `M ${selectedDisaster.magnitude.toFixed(1)}` : "-"}
                      </span>
                    </div>
                    <div className={cn("p-1.5 rounded-lg border", isDark ? "bg-slate-900 border-slate-850" : "bg-slate-50 border-slate-200")}>
                      <span className={cn("text-[9px] block", isDark ? "text-slate-500" : "text-slate-400")}>Kedalaman</span>
                      <span className={cn("text-sm font-black", isDark ? "text-slate-200" : "text-slate-800")}>
                        {selectedDisaster.depthKm ? `${selectedDisaster.depthKm} km` : "-"}
                      </span>
                    </div>
                  </div>

                  {/* Tsunami Status Badge */}
                  <div>
                    {selectedDisaster.metadata?.tsunami === 1 || selectedDisaster.title.toLowerCase().includes("tsunami") ? (
                      <div className="px-2 py-1 rounded bg-rose-600/20 border border-rose-500 text-rose-500 dark:text-rose-300 font-mono text-[10px] font-bold flex items-center gap-1.5 animate-pulse">
                        <BMKGWarningTriangle className="h-3.5 w-3.5 shrink-0" color="#ef4444" />
                        <span>PERINGATAN: Berpotensi Tsunami</span>
                      </div>
                    ) : (
                      <div
                        className={cn(
                          "px-2 py-0.5 rounded border font-mono text-[10px] font-semibold flex items-center gap-1.5",
                          isDark ? "bg-emerald-950/70 border-emerald-500/30 text-emerald-400" : "bg-emerald-50 border-emerald-200 text-emerald-700"
                        )}
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                        <span>Tidak berpotensi Tsunami</span>
                      </div>
                    )}
                  </div>

                  {/* Collapsible MMI Shaking Zones Toggle */}
                  <div className="pt-0.5">
                    <button
                      onClick={() => setIsZonesExpanded(!isZonesExpanded)}
                      className={cn(
                        "text-[10px] font-mono flex items-center justify-between w-full px-1 cursor-pointer",
                        isDark ? "text-slate-400 hover:text-slate-200" : "text-slate-500 hover:text-slate-800"
                      )}
                    >
                      <span>Estimasi Radius MMI</span>
                      <span>{isZonesExpanded ? "▴ Tutup" : "▾ Buka"}</span>
                    </button>
                    {isZonesExpanded && (
                      <div className={cn("p-2 mt-1 rounded-lg border text-[10px] space-y-1 font-mono", isDark ? "bg-slate-900/90 border-slate-800" : "bg-slate-50 border-slate-200")}>
                        <div className="flex justify-between text-rose-500 font-bold">
                          <span>Zona Episentrum (MMI VII-IX):</span>
                          <span>~{Math.round(Math.pow(10, 0.42 * (selectedDisaster.magnitude || 5)) * 0.9)} km</span>
                        </div>
                        <div className="flex justify-between text-amber-500 font-bold">
                          <span>Zona Kerusakan Sedang:</span>
                          <span>~{Math.round(Math.pow(10, 0.42 * (selectedDisaster.magnitude || 5)) * 2.5)} km</span>
                        </div>
                        <div className="flex justify-between text-yellow-600 dark:text-yellow-400 font-bold">
                          <span>Zona Getaran Terasa:</span>
                          <span>~{Math.round(Math.pow(10, 0.42 * (selectedDisaster.magnitude || 5)) * 5.4)} km</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-1.5 text-center text-xs font-mono">
                  <div className={cn("p-1.5 rounded-lg border", isDark ? "bg-slate-900 border-slate-850" : "bg-slate-50 border-slate-200")}>
                    <span className={cn("text-[9px] block", isDark ? "text-slate-500" : "text-slate-400")}>Tingkat Bahaya</span>
                    <span className={cn("text-xs font-black", selCfg.textLight)}>
                      {selectedDisaster.severityLevel}
                    </span>
                  </div>
                  <div className={cn("p-1.5 rounded-lg border", isDark ? "bg-slate-900 border-slate-850" : "bg-slate-50 border-slate-200")}>
                    <span className={cn("text-[9px] block", isDark ? "text-slate-500" : "text-slate-400")}>Radius Pantau</span>
                    <span className={cn("text-xs font-black", isDark ? "text-slate-200" : "text-slate-800")}>
                      ~15-25 km
                    </span>
                  </div>
                </div>
              )}

              {/* Action Buttons Row */}
              <div className={cn("flex items-center gap-1.5 pt-1 border-t", isDark ? "border-slate-850" : "border-slate-100")}>
                <button
                  onClick={() => handleRunAiAnalysis(selectedDisaster)}
                  disabled={aiLoading}
                  className="flex-1 py-1.5 px-2.5 rounded-lg bg-gradient-to-r from-rose-600 to-orange-500 hover:from-rose-500 hover:to-orange-400 text-white font-bold text-[11px] flex items-center justify-center gap-1 shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                >
                  {aiLoading ? (
                    <RefreshCw className="h-3 w-3 animate-spin" />
                  ) : (
                    <Sparkles className="h-3 w-3" />
                  )}
                  <span>{aiLoading ? "Analisis..." : "AI Dampak"}</span>
                </button>
                <Link
                  href={`/simulate?mag=${selectedDisaster.magnitude || 6.5}&lat=${selectedDisaster.latitude}&lng=${selectedDisaster.longitude}`}
                  className={cn("py-1.5 px-2.5 rounded-lg border font-semibold text-[11px] flex items-center gap-1 transition-colors", isDark ? "bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-200" : "bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-800")}
                >
                  <Compass className="h-3 w-3 text-sky-500" />
                  <span>3D Sim</span>
                </Link>
                <Link
                  href="/assistant"
                  className={cn("p-1.5 rounded-lg border transition-colors", isDark ? "bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-200" : "bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-800")}
                  title="Tanya AI Evakuasi"
                >
                  <Bot className="h-3.5 w-3.5 text-emerald-500" />
                </Link>
              </div>
            </div>
          );
        })()}

        {/* AI Report Floating Overlay Drawer */}
        {aiReport && (
          <div
            className={cn(
              "absolute inset-y-0 right-0 z-30 w-full sm:w-[460px] border-l p-6 overflow-y-auto shadow-2xl space-y-4 animate-fadeIn",
              isDark ? "bg-slate-950/95 border-slate-800 text-slate-100" : "bg-white/98 border-slate-200 text-slate-900 shadow-slate-400"
            )}
          >
            <div className={cn("flex items-center justify-between pb-3 border-b", isDark ? "border-slate-800" : "border-slate-200")}>
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-rose-500/20 text-rose-500">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <h4 className={cn("text-sm font-bold", isDark ? "text-white" : "text-slate-900")}>AI Disaster Impact Intelligence</h4>
                  <span className={cn("text-[10px] font-mono", isDark ? "text-slate-400" : "text-slate-500")}>
                    Model: Google Gemini Engine
                  </span>
                </div>
              </div>
              <button
                onClick={() => setAiReport(null)}
                className={cn("p-1 rounded-lg transition-colors", isDark ? "text-slate-400 hover:text-white" : "text-slate-400 hover:text-slate-900")}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Alert Level */}
            <div className={cn("p-3 rounded-xl border flex items-center justify-between", isDark ? "bg-slate-900 border-rose-500/30" : "bg-rose-50/70 border-rose-200")}>
              <div>
                <span className={cn("text-[10px] font-mono block", isDark ? "text-slate-400" : "text-slate-500")}>Status Siaga BNPB</span>
                <span className="text-base font-black text-rose-500 font-mono">
                  {aiReport.recommendedAlertLevel || "SIAGA_1"}
                </span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-500/20 text-rose-600 dark:text-rose-300">
                AI Evaluated
              </span>
            </div>

            {/* Summary */}
            <p className={cn("text-xs p-3 rounded-xl border leading-relaxed", isDark ? "text-slate-300 bg-slate-900/60 border-slate-850" : "text-slate-700 bg-slate-50 border-slate-200")}>
              {aiReport.executiveSummary}
            </p>

            {/* Danger Zones */}
            {aiReport.dangerZones && (
              <div className="space-y-1.5 text-xs">
                <span className={cn("font-bold block text-[11px]", isDark ? "text-slate-200" : "text-slate-800")}>Radius Dampak Spasial:</span>
                {aiReport.dangerZones.map((z: AiDangerZone, idx: number) => (
                  <div
                    key={idx}
                    className={cn("p-2.5 rounded-lg border flex items-center justify-between", isDark ? "bg-slate-900 border-slate-850" : "bg-slate-50 border-slate-200")}
                  >
                    <div>
                      <span className={cn("font-semibold block", isDark ? "text-slate-200" : "text-slate-800")}>{z.ring}</span>
                      <span className={cn("text-[10px]", isDark ? "text-slate-400" : "text-slate-500")}>{z.description}</span>
                    </div>
                    <span className="font-mono text-xs font-bold text-rose-500">~{z.radiusKm} km</span>
                  </div>
                ))}
              </div>
            )}

            {/* Infrastructure */}
            {aiReport.criticalInfrastructure && (
              <div className="space-y-2 text-xs">
                <span className={cn("font-bold block text-[11px]", isDark ? "text-slate-200" : "text-slate-800")}>Infrastruktur &amp; Fasilitas Vital:</span>
                <div className={cn("p-2.5 rounded-lg border text-[11px]", isDark ? "bg-slate-900/80 border-slate-850 text-slate-300" : "bg-slate-50 border-slate-200 text-slate-700")}>
                  <strong>🏥 Rumah Sakit:</strong> {aiReport.criticalInfrastructure.hospitals}
                </div>
                <div className={cn("p-2.5 rounded-lg border text-[11px]", isDark ? "bg-slate-900/80 border-slate-850 text-slate-300" : "bg-slate-50 border-slate-200 text-slate-700")}>
                  <strong>🛣️ Jalur Akses:</strong> {aiReport.criticalInfrastructure.roadsAndBridges}
                </div>
                <div className={cn("p-2.5 rounded-lg border text-[11px]", isDark ? "bg-slate-900/80 border-slate-850 text-slate-300" : "bg-slate-50 border-slate-200 text-slate-700")}>
                  <strong>⚡ Jaringan Listrik:</strong> {aiReport.criticalInfrastructure.powerGrid}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
