"use client";

import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { formatDate } from "@/lib/utils";
import {
  Search,
  Filter,
  MapPin,
  Sparkles,
  RefreshCw,
  Compass,
  AlertTriangle,
  Layers,
  Info,
  X,
  Radio,
  Volume2,
  VolumeX,
  ShieldAlert,
  Flame,
  Waves,
  Eye,
  PanelLeftClose,
  PanelLeftOpen,
  Maximize2,
  Minimize2,
  Bot,
  Activity,
} from "lucide-react";
import Link from "next/link";
import {
  startEmergencySiren,
  stopEmergencySiren,
  playSingleBeep,
} from "@/lib/emergency-siren";

const DisasterMap = dynamic(
  () => import("@/components/admin/disaster-map"),
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full flex items-center justify-center bg-slate-950 text-xs text-slate-500 font-mono">
        <Activity className="h-6 w-6 animate-spin text-rose-500 mr-2" />
        Memuat Peta Spasial Global &amp; Layer Sesar...
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
  metadata?: any;
}

export default function PublicMapPage() {
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

  // AI Drawer state
  const [aiReport, setAiReport] = useState<any>(null);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
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

  const filteredDisasters = disasters.filter((d) => {
    const matchSearch =
      d.title.toLowerCase().includes(search.toLowerCase()) ||
      d.locationName.toLowerCase().includes(search.toLowerCase());
    const matchCat = selectedCategory === "ALL" || d.categoryCode === selectedCategory;
    const matchMag = (d.magnitude || 0) >= minMagnitude;
    return matchSearch && matchCat && matchMag;
  });

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
      className="flex-1 flex flex-col lg:flex-row h-[calc(100vh-4rem)] overflow-hidden relative bg-slate-950"
    >
      {/* Sidebar Disaster Stream & Filters (Collapsible for Max Map Space) */}
      {isSidebarOpen && (
        <div className="w-full lg:w-96 flex-shrink-0 bg-slate-950/95 border-r border-slate-800/80 flex flex-col h-full z-20 transition-all duration-300">
          {/* Header & Search */}
          <div className="p-4 border-b border-slate-800/80 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Radio className="h-4 w-4 text-rose-500 animate-pulse" />
                <span>Global Disaster Feeds</span>
              </h2>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                  {filteredDisasters.length} Terdeteksi
                </span>
                <button
                  onClick={() => setIsSidebarOpen(false)}
                  className="hidden lg:flex p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900"
                  title="Sembunyikan Panel (Perbesar Peta)"
                >
                  <PanelLeftClose className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
              <input
                type="text"
                placeholder="Cari wilayah, kota, magnitudo..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-rose-500"
              />
            </div>

            {/* Quick Filters */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 text-[11px] focus:outline-none"
              >
                <option value="ALL">Semua Jenis</option>
                <option value="EARTHQUAKE">Gempa Bumi</option>
                <option value="TSUNAMI">Tsunami</option>
                <option value="VOLCANO">Gunung Api</option>
                <option value="FLOOD">Banjir</option>
                <option value="WILDFIRE">Kebakaran Hutan</option>
              </select>

              <select
                value={minMagnitude}
                onChange={(e) => setMinMagnitude(parseFloat(e.target.value))}
                className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 text-[11px] focus:outline-none"
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
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-mono font-bold transition-all border ${
                  isSirenActive
                    ? "bg-rose-600 text-white border-rose-500 animate-pulse shadow-lg shadow-rose-600/40"
                    : "bg-slate-900 hover:bg-slate-850 text-slate-300 border-slate-800"
                }`}
              >
                {isSirenActive ? (
                  <>
                    <Volume2 className="h-3.5 w-3.5 text-white animate-spin" />
                    <span>SIRINE DARURAT AKTIF (STOP)</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="h-3.5 w-3.5 text-rose-400" />
                    <span>Test Sirine Kedaruratan</span>
                  </>
                )}
              </button>

              <button
                onClick={() => playSingleBeep(1000, 0.2)}
                className="text-[10px] font-mono text-slate-400 hover:text-slate-200 px-2 py-1 rounded bg-slate-900 border border-slate-800"
                title="Uji nada audio"
              >
                Beep Test
              </button>
            </div>
          </div>

          {/* Disaster Event Stream List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-850/60 p-2 space-y-1">
            {loading ? (
              <div className="p-8 text-center text-xs text-slate-500 font-mono">
                <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-rose-500" />
                Menghubungkan ke satelit data telemetry...
              </div>
            ) : filteredDisasters.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 font-mono">
                Tidak ada kejadian bencana sesuai filter.
              </div>
            ) : (
              filteredDisasters.map((item) => {
                const isSelected = selectedDisaster?.id === item.id;
                const isCritical =
                  item.severityLevel === "CRITICAL" || (item.magnitude || 0) >= 6.5;

                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedDisaster(item)}
                    className={`p-3 rounded-xl transition-all cursor-pointer ${
                      isSelected
                        ? "bg-rose-500/15 border border-rose-500/40 shadow-md"
                        : "hover:bg-slate-900/60 border border-transparent"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-xs font-bold text-slate-200 truncate">{item.title}</span>
                      {item.magnitude && (
                        <span
                          className={`text-xs font-mono font-black px-1.5 py-0.5 rounded ${
                            isCritical
                              ? "bg-rose-500 text-white animate-pulse"
                              : item.magnitude >= 5.5
                              ? "bg-orange-500/20 text-orange-400"
                              : "bg-slate-800 text-slate-300"
                          }`}
                        >
                          M {item.magnitude}
                        </span>
                      )}
                    </div>

                    <p className="text-[11px] text-slate-400 flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-slate-500 flex-shrink-0" />
                      <span className="truncate">{item.locationName}</span>
                    </p>

                    <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono mt-2 pt-1 border-t border-slate-900">
                      <span>Kedalaman: {item.depthKm ? `${item.depthKm} km` : "-"}</span>
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
            className="absolute top-4 left-4 z-30 px-3.5 py-2 rounded-xl bg-slate-950/90 border border-slate-800 text-white text-xs font-semibold flex items-center gap-2 backdrop-blur-md shadow-2xl hover:bg-slate-900 transition-all hover:border-rose-500/40"
          >
            <PanelLeftOpen className="h-4 w-4 text-rose-500" />
            <span>Buka Feeds ({filteredDisasters.length})</span>
          </button>
        )}

        {/* Floating Fullscreen Toggle Button */}
        <button
          onClick={handleToggleFullscreen}
          className="absolute top-4 right-4 z-30 p-2.5 rounded-xl bg-slate-950/90 border border-slate-800 text-slate-300 hover:text-white backdrop-blur-md shadow-xl transition-all hover:bg-slate-900"
          title={isFullscreen ? "Keluar Layar Penuh" : "Mode Layar Penuh"}
        >
          {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </button>

        {/* TOP FLOATING VISUAL EARLY WARNING BANNER */}
        {criticalAlert && !bannerDismissed && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 w-11/12 max-w-2xl rounded-2xl bg-slate-950/95 border-2 border-rose-500/80 shadow-2xl shadow-rose-950/60 p-4 backdrop-blur-xl animate-bounce-once">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-xl bg-rose-600/20 border border-rose-500/40 text-rose-500 flex items-center justify-center shrink-0 animate-pulse">
                  <ShieldAlert className="h-6 w-6 text-rose-500" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-rose-600 text-white font-mono text-[10px] font-black tracking-wider uppercase animate-pulse">
                      PERINGATAN DINI KEDARURATAN (EARLY WARNING)
                    </span>
                    <span className="text-xs font-mono font-bold text-rose-400">
                      M {criticalAlert.magnitude}
                    </span>
                  </div>
                  <h3 className="text-xs sm:text-sm font-extrabold text-white mt-1 leading-snug">
                    {criticalAlert.title}
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Kedalaman: {criticalAlert.depthKm} km &bull; {criticalAlert.locationName}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setBannerDismissed(true)}
                className="text-slate-400 hover:text-white p-1"
                title="Tutup banner peringatan"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Quick Emergency Actions inside Banner */}
            <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex flex-wrap items-center gap-2">
              <button
                onClick={() => setSelectedDisaster(criticalAlert)}
                className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-rose-600/30"
              >
                <Eye className="h-3.5 w-3.5" />
                <span>Fokus Episentrum &amp; Radius</span>
              </button>

              <button
                onClick={() => handleRunAiAnalysis(criticalAlert)}
                className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-850 border border-slate-750 text-slate-200 text-xs font-semibold flex items-center gap-1.5"
              >
                <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                <span>Analisis Dampak AI</span>
              </button>

              <button
                onClick={handleToggleSiren}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 border ${
                  isSirenActive
                    ? "bg-rose-700 text-white border-rose-500 animate-pulse"
                    : "bg-slate-900 hover:bg-slate-850 text-rose-400 border-rose-500/30"
                }`}
              >
                <Volume2 className="h-3.5 w-3.5" />
                <span>{isSirenActive ? "Matikan Sirine" : "Bunyikan Sirine"}</span>
              </button>
            </div>
          </div>
        )}

        {/* 100% Full Container Disaster Map Component */}
        <div className="w-full h-full flex-1 relative">
          <DisasterMap
            disasters={filteredDisasters.map((d) => ({
              id: d.id,
              title: d.title,
              latitude: d.latitude,
              longitude: d.longitude,
              magnitude: d.magnitude,
              depthKm: d.depthKm,
              severityLevel: d.severityLevel,
              locationName: d.locationName,
              metadata: d.metadata,
            }))}
            selectedDisaster={
              selectedDisaster
                ? {
                    id: selectedDisaster.id,
                    title: selectedDisaster.title,
                    latitude: selectedDisaster.latitude,
                    longitude: selectedDisaster.longitude,
                    magnitude: selectedDisaster.magnitude,
                    depthKm: selectedDisaster.depthKm,
                    severityLevel: selectedDisaster.severityLevel,
                    locationName: selectedDisaster.locationName,
                    metadata: selectedDisaster.metadata,
                  }
                : null
            }
            onSelectDisaster={(d) => {
              const fullItem = disasters.find((item) => item.id === d.id);
              if (fullItem) setSelectedDisaster(fullItem);
            }}
          />
        </div>

        {/* Selected Disaster Floating Card (Rich Complete Warning) */}
        {selectedDisaster && (
          <div className="absolute top-16 right-4 z-20 w-80 sm:w-96 rounded-2xl bg-slate-950/95 border border-slate-800 backdrop-blur-xl p-5 shadow-2xl space-y-3.5 animate-fadeIn">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-bold uppercase">
                    {selectedDisaster.categoryCode}
                  </span>
                  {(selectedDisaster.magnitude || 0) >= 6.5 && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold uppercase animate-pulse">
                      SIAGA KEDARURATAN
                    </span>
                  )}
                </div>
                <h3 className="text-sm font-black text-white mt-1.5 leading-snug">
                  {selectedDisaster.title}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">{selectedDisaster.locationName}</p>
              </div>
              <button
                onClick={() => setSelectedDisaster(null)}
                className="p-1 rounded-lg text-slate-500 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Telemetry Metrics */}
            <div className="grid grid-cols-2 gap-2 text-center text-xs font-mono">
              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-850">
                <span className="text-[10px] text-slate-500 block">Magnitudo</span>
                <span className="text-base font-black text-rose-400">
                  {selectedDisaster.magnitude ? `M ${selectedDisaster.magnitude}` : "-"}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-850">
                <span className="text-[10px] text-slate-500 block">Kedalaman</span>
                <span className="text-base font-black text-slate-200">
                  {selectedDisaster.depthKm ? `${selectedDisaster.depthKm} km` : "-"}
                </span>
              </div>
            </div>

            {/* Isoseismal Shaking Estimate Warning */}
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-[11px] space-y-1 font-mono">
              <div className="flex justify-between text-rose-400 font-bold">
                <span>🔴 Zona Episentrum (MMI VII-IX):</span>
                <span>~{Math.round(Math.pow(10, 0.42 * (selectedDisaster.magnitude || 5)) * 0.9)} km</span>
              </div>
              <div className="flex justify-between text-amber-400">
                <span>🟠 Zona Kerusakan Sedang:</span>
                <span>~{Math.round(Math.pow(10, 0.42 * (selectedDisaster.magnitude || 5)) * 2.5)} km</span>
              </div>
              <div className="flex justify-between text-yellow-400">
                <span>🟡 Zona Getaran Terasa Luas:</span>
                <span>~{Math.round(Math.pow(10, 0.42 * (selectedDisaster.magnitude || 5)) * 5.4)} km</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={() => handleRunAiAnalysis(selectedDisaster)}
                className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-rose-600 to-orange-500 hover:from-rose-500 hover:to-orange-400 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-rose-600/20 cursor-pointer"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>AI Impact Analyzer</span>
              </button>
              <Link
                href={`/simulate?mag=${selectedDisaster.magnitude || 6.5}&lat=${selectedDisaster.latitude}&lng=${selectedDisaster.longitude}`}
                className="py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-750 text-slate-200 font-semibold text-xs flex items-center gap-1.5"
              >
                <Compass className="h-3.5 w-3.5 text-sky-400" />
                <span>Simulasi 3D</span>
              </Link>
              <Link
                href="/assistant"
                className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-750 text-slate-200"
                title="Tanya AI Evakuasi"
              >
                <Bot className="h-4 w-4 text-emerald-400" />
              </Link>
            </div>
          </div>
        )}

        {/* AI Report Floating Overlay Drawer */}
        {aiReport && (
          <div className="absolute inset-y-0 right-0 z-30 w-full sm:w-[460px] bg-slate-950/95 border-l border-slate-800 backdrop-blur-xl p-6 overflow-y-auto shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-rose-500/20 text-rose-400">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">AI Disaster Impact Intelligence</h4>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Model: Google Gemini Engine
                  </span>
                </div>
              </div>
              <button
                onClick={() => setAiReport(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Alert Level */}
            <div className="p-3 rounded-xl bg-slate-900 border border-rose-500/30 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 font-mono block">Status Siaga BNPB</span>
                <span className="text-base font-black text-rose-400 font-mono">
                  {aiReport.recommendedAlertLevel || "SIAGA_1"}
                </span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-500/20 text-rose-300">
                AI Evaluated
              </span>
            </div>

            {/* Summary */}
            <p className="text-xs text-slate-300 bg-slate-900/60 p-3 rounded-xl border border-slate-850 leading-relaxed">
              {aiReport.executiveSummary}
            </p>

            {/* Danger Zones */}
            {aiReport.dangerZones && (
              <div className="space-y-1.5 text-xs">
                <span className="font-bold text-slate-200 block text-[11px]">Radius Dampak Spasial:</span>
                {aiReport.dangerZones.map((z: any, idx: number) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-lg bg-slate-900 border border-slate-850 flex items-center justify-between"
                  >
                    <div>
                      <span className="font-semibold text-slate-200 block">{z.ring}</span>
                      <span className="text-[10px] text-slate-400">{z.description}</span>
                    </div>
                    <span className="font-mono text-xs font-bold text-rose-400">~{z.radiusKm} km</span>
                  </div>
                ))}
              </div>
            )}

            {/* Infrastructure */}
            {aiReport.criticalInfrastructure && (
              <div className="space-y-2 text-xs">
                <span className="font-bold text-slate-200 block text-[11px]">Infrastruktur &amp; Fasilitas Vital:</span>
                <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-850 text-[11px] text-slate-300">
                  <strong>🏥 Rumah Sakit:</strong> {aiReport.criticalInfrastructure.hospitals}
                </div>
                <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-850 text-[11px] text-slate-300">
                  <strong>🛣️ Jalur Akses:</strong> {aiReport.criticalInfrastructure.roadsAndBridges}
                </div>
                <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-850 text-[11px] text-slate-300">
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
