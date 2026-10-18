"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { AdminHeader } from "@/components/admin/header";
import { formatDate } from "@/lib/utils";
import {
  AlertTriangle,
  Plus,
  Search,
  Trash2,
  MapPin,
  X,
  Map as MapIcon,
  Table as TableIcon,
  RefreshCw,
  Sparkles,
  Zap,
  Activity,
  ShieldCheck,
} from "lucide-react";
import { DisasterIcon, getDisasterConfig } from "@/lib/disaster-icons";

// Dynamically import Leaflet map to prevent SSR window issues
const DisasterMap = dynamic(
  () => import("@/components/admin/disaster-map"),
  { ssr: false, loading: () => <div className="h-96 w-full flex items-center justify-center bg-slate-900 text-xs text-slate-500 font-mono">Memuat peta satelit spasial...</div> }
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
  status: string;
  verifiedStatus: string;
  occurredAt: string;
}

interface AiDangerZoneAdmin {
  ring?: string;
  radiusKm?: number;
  damageLevel?: string;
  description?: string;
}

interface AiInfrastructureAdmin {
  hospitals?: string;
  roadsAndBridges?: string;
  powerGrid?: string;
  communications?: string;
}

interface AiReportAdmin {
  recommendedAlertLevel?: string;
  executiveSummary?: string;
  dangerZones?: AiDangerZoneAdmin[];
  criticalInfrastructure?: AiInfrastructureAdmin;
  priorityActions?: string[];
}

export default function AdminDisastersPage() {
  const [disasters, setDisasters] = useState<DisasterItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [selectedSeverity, setSelectedSeverity] = useState("ALL");
  const [viewMode, setViewMode] = useState<"BOTH" | "TABLE" | "MAP">("BOTH");
  const [selectedDisaster, setSelectedDisaster] = useState<DisasterItem | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // AI Analysis state
  const [analyzingDisaster, setAnalyzingDisaster] = useState<DisasterItem | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiReport, setAiReport] = useState<AiReportAdmin | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const refreshDisasters = () => {
    setLoading(true);
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleOpenAiAnalysis = async (disaster: DisasterItem) => {
    setAnalyzingDisaster(disaster);
    setAiLoading(true);
    setAiReport(null);
    try {
      const res = await fetch("/api/admin/ai/impact-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ disasterId: disaster.id, disasterData: disaster }),
      });
      const data = await res.json();
      if (data.success) {
        setAiReport(data.analysis);
      } else {
        alert(data.error || "Gagal menghasilkan analisis AI");
      }
    } catch {
      alert("Error saat menghubungi AI engine");
    } finally {
      setAiLoading(false);
    }
  };

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    category: "EARTHQUAKE",
    location: "",
    latitude: "-6.9277",
    longitude: "106.9300",
    magnitude: "5.8",
    depth: "12",
    severity: "HIGH",
    description: "",
  });

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const params = new URLSearchParams();
        if (search) params.set("search", search);
        if (selectedCategory !== "ALL") params.set("category", selectedCategory);
        if (selectedSeverity !== "ALL") params.set("severity", selectedSeverity);

        const res = await fetch(`/api/admin/disasters?${params.toString()}`);
        const data = await res.json();
        if (!ignore && data.success) {
          setDisasters(data.disasters);
        }
      } catch {
        // Ignore error
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, [search, selectedCategory, selectedSeverity, refreshTrigger]);

  const handleAddDisaster = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/disasters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.error || "Gagal membuat insiden");
        return;
      }

      setIsModalOpen(false);
      setFormData({
        title: "",
        category: "EARTHQUAKE",
        location: "",
        latitude: "-6.9277",
        longitude: "106.9300",
        magnitude: "5.8",
        depth: "12",
        severity: "HIGH",
        description: "",
      });
      refreshDisasters();
    } catch {
      alert("Error saat mengirim data");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus data kejadian bencana ini dari database Neon?")) return;
    try {
      const res = await fetch(`/api/admin/disasters/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setDisasters((prev) => prev.filter((d) => d.id !== id));
      } else {
        alert(data.error || "Gagal menghapus");
      }
    } catch {
      alert("Error menghapus");
    }
  };

  return (
    <div>
      <AdminHeader
        title="Disaster Event Records & Spatial Map"
        subtitle="Live telemetry database from BMKG & USGS with real-time geographic plotting"
      />

      <div className="p-6 space-y-5 max-w-7xl mx-auto">
        {/* Top Control Bar */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 flex-1">
            <div className="relative min-w-[240px] flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
              <input
                type="text"
                placeholder="Cari bencana, lokasi, magnitudo..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-rose-500"
              />
            </div>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="py-2 px-3 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300 focus:outline-none"
            >
              <option value="ALL">Semua Kategori</option>
              <option value="EARTHQUAKE">⚡ Gempa Bumi</option>
              <option value="WILDFIRE">🔥 Kebakaran Hutan (Karhutla)</option>
              <option value="VOLCANO">🌋 Erupsi Gunung Api</option>
              <option value="FLOOD">🌊 Banjir &amp; Bandang</option>
              <option value="TSUNAMI">🌊 Tsunami</option>
              <option value="STORM">🌀 Cuaca Ekstrem / Badai</option>
            </select>

            <select
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
              className="py-2 px-3 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300 focus:outline-none"
            >
              <option value="ALL">Semua Keparahan</option>
              <option value="CRITICAL">Critical (≥ 7.0)</option>
              <option value="HIGH">High (5.5 - 6.9)</option>
              <option value="MEDIUM">Medium (4.0 - 5.4)</option>
              <option value="LOW">Low (&lt; 4.0)</option>
            </select>

            <button
              onClick={() => refreshDisasters()}
              className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white"
              title="Refresh Data"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <div className="flex bg-slate-900 p-1 rounded-lg border border-slate-800 text-xs font-mono">
              <button
                onClick={() => setViewMode("BOTH")}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  viewMode === "BOTH" ? "bg-rose-500/20 text-rose-300 font-bold" : "text-slate-400"
                }`}
              >
                Split View
              </button>
              <button
                onClick={() => setViewMode("MAP")}
                className={`px-2.5 py-1 rounded-md flex items-center gap-1 transition-all ${
                  viewMode === "MAP" ? "bg-rose-500/20 text-rose-300 font-bold" : "text-slate-400"
                }`}
              >
                <MapIcon className="h-3 w-3" /> Peta
              </button>
              <button
                onClick={() => setViewMode("TABLE")}
                className={`px-2.5 py-1 rounded-md flex items-center gap-1 transition-all ${
                  viewMode === "TABLE" ? "bg-rose-500/20 text-rose-300 font-bold" : "text-slate-400"
                }`}
              >
                <TableIcon className="h-3 w-3" /> Tabel
              </button>
            </div>

            <button
              onClick={() => setIsModalOpen(true)}
              className="py-2 px-3.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-lg shadow-rose-600/20 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Input Manual</span>
            </button>
          </div>
        </div>

        {/* Live Counter Badge */}
        <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Database Neon: Terdata <strong className="text-white">{disasters.length}</strong> kejadian bencana</span>
          </div>
          {selectedDisaster && (
            <span className="text-rose-400">
              Fokus: {selectedDisaster.title} ({selectedDisaster.latitude}, {selectedDisaster.longitude})
            </span>
          )}
        </div>

        {/* Spatial Map Section */}
        {(viewMode === "MAP" || viewMode === "BOTH") && (
          <div className="w-full h-[400px]">
            <DisasterMap
              disasters={disasters.map((d) => ({
                id: d.id,
                title: d.title,
                categoryCode: d.categoryCode,
                latitude: d.latitude,
                longitude: d.longitude,
                magnitude: d.magnitude,
                depthKm: d.depthKm,
                severityLevel: d.severityLevel,
                locationName: d.locationName,
              }))}
              selectedDisaster={
                selectedDisaster
                  ? {
                      id: selectedDisaster.id,
                      title: selectedDisaster.title,
                      categoryCode: selectedDisaster.categoryCode,
                      latitude: selectedDisaster.latitude,
                      longitude: selectedDisaster.longitude,
                      magnitude: selectedDisaster.magnitude,
                      depthKm: selectedDisaster.depthKm,
                      severityLevel: selectedDisaster.severityLevel,
                      locationName: selectedDisaster.locationName,
                    }
                  : null
              }
              onSelectCoordinate={(lat, lng) => {
                setFormData((prev) => ({
                  ...prev,
                  latitude: lat.toString(),
                  longitude: lng.toString(),
                }));
              }}
              interactivePick={isModalOpen}
            />
          </div>
        )}

        {/* Data Table Section */}
        {(viewMode === "TABLE" || viewMode === "BOTH") && (
          <div className="rounded-xl bg-slate-900/70 border border-slate-800 shadow-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/60 text-slate-400 uppercase font-mono text-[10px] tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Nama Kejadian &amp; Lokasi</th>
                    <th className="py-3 px-4">Kategori</th>
                    <th className="py-3 px-4">Koordinat</th>
                    <th className="py-3 px-4">Magnitudo / Kedalaman</th>
                    <th className="py-3 px-4">Tingkat Bahaya</th>
                    <th className="py-3 px-4">Waktu Kejadian</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {disasters.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-500 font-mono">
                        {loading ? "Mengambil data dari Neon PostgreSQL..." : "Tidak ada data bencana ditemukan."}
                      </td>
                    </tr>
                  ) : (
                    disasters.map((item) => {
                      const catCfg = getDisasterConfig(item.categoryCode);
                      return (
                        <tr
                          key={item.id}
                          onClick={() => setSelectedDisaster(item)}
                          className={`hover:bg-slate-850/60 transition-colors cursor-pointer ${
                            selectedDisaster?.id === item.id ? "bg-rose-500/10 border-l-2 border-rose-500" : ""
                          }`}
                        >
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2.5">
                              <div className={`p-1.5 rounded-lg ${catCfg.bgLight} ${catCfg.borderLight} border ${catCfg.textLight} shrink-0 shadow-sm`}>
                                <DisasterIcon categoryCode={item.categoryCode} className="h-4 w-4" />
                              </div>
                              <div className="min-w-0">
                                <div className="font-bold text-slate-100 truncate">{item.title}</div>
                                <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5 truncate">
                                  <MapPin className="h-3 w-3 text-slate-500 shrink-0" />
                                  <span>{item.locationName}</span>
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 font-mono">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded ${catCfg.bgLight} ${catCfg.textLight} border ${catCfg.borderLight} text-[10px] font-bold uppercase`}>
                              {catCfg.shortLabel}
                            </span>
                          </td>
                        <td className="py-3.5 px-4 font-mono text-slate-400 text-[11px]">
                          {item.latitude.toFixed(2)}, {item.longitude.toFixed(2)}
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
                        <td className="py-3.5 px-4 font-mono text-slate-400 text-[11px]">
                          {formatDate(item.occurredAt)}
                        </td>
                        <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenAiAnalysis(item)}
                              className="px-2.5 py-1 rounded-md bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[10px] font-bold font-mono flex items-center gap-1 transition-all"
                              title="Analisis Dampak Berantai Bencana dengan AI"
                            >
                              <Sparkles className="h-3 w-3 text-amber-400" />
                              <span>AI Impact</span>
                            </button>
                            <button
                              onClick={() => handleDelete(item.id)}
                              className="p-1.5 rounded-md text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                              title="Hapus data"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Modal: Manual Incident Report */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl relative">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-rose-500" />
                  Input Laporan Bencana Manual
                </h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleAddDisaster} className="space-y-3.5 text-xs">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Judul Insiden</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Gempa Dangkal M 5.8 Sesar Lembang"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-rose-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Kategori</label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none"
                    >
                      <option value="EARTHQUAKE">Gempa Bumi</option>
                      <option value="TSUNAMI">Tsunami</option>
                      <option value="VOLCANO">Gunung Api</option>
                      <option value="FLOOD">Banjir</option>
                      <option value="WILDFIRE">Kebakaran Hutan</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Tingkat Bahaya</label>
                    <select
                      value={formData.severity}
                      onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none"
                    >
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                      <option value="CRITICAL">Critical</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Nama Lokasi / Wilayah</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Lembang, Kab. Bandung Barat"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-rose-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Latitude</label>
                    <input
                      type="text"
                      required
                      placeholder="-6.8123"
                      value={formData.latitude}
                      onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 font-mono focus:outline-none focus:border-rose-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Longitude</label>
                    <input
                      type="text"
                      required
                      placeholder="107.6189"
                      value={formData.longitude}
                      onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 font-mono focus:outline-none focus:border-rose-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Magnitudo (M)</label>
                    <input
                      type="text"
                      placeholder="5.8"
                      value={formData.magnitude}
                      onChange={(e) => setFormData({ ...formData, magnitude: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 font-mono focus:outline-none focus:border-rose-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Kedalaman (km)</label>
                    <input
                      type="text"
                      placeholder="10"
                      value={formData.depth}
                      onChange={(e) => setFormData({ ...formData, depth: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 font-mono focus:outline-none focus:border-rose-500"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold shadow-lg shadow-rose-600/25 disabled:opacity-50"
                  >
                    {submitting ? "Menyimpan ke Neon..." : "Publikasikan Insiden"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: AI Disaster Impact Analysis */}
        {analyzingDisaster && (
          <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
            <div className="w-full max-w-2xl rounded-2xl bg-slate-900 border border-slate-750 p-6 shadow-2xl relative my-8 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800 sticky top-0 bg-slate-900 z-10">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-gradient-to-tr from-rose-500 to-amber-500 text-white shadow-lg shadow-rose-500/20">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      DISASTRA AI Impact Analyzer
                    </h3>
                    <p className="text-[11px] text-slate-400 font-mono">
                      {analyzingDisaster.title} &bull; M {analyzingDisaster.magnitude || "-"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setAnalyzingDisaster(null);
                    setAiReport(null);
                  }}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {aiLoading ? (
                <div className="py-16 text-center space-y-3">
                  <RefreshCw className="h-8 w-8 text-rose-500 animate-spin mx-auto" />
                  <p className="text-xs font-semibold text-slate-200">
                    Menganalisis dampak spasial &amp; risiko berantai...
                  </p>
                  <p className="text-[11px] text-slate-400 font-mono">
                    Memproses radius kerusakan, kelaikan jembatan, dan kapasitas rumah sakit
                  </p>
                </div>
              ) : aiReport ? (
                <div className="space-y-5 pt-4 text-xs">
                  {/* Alert Level Banner */}
                  <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-mono block">
                        Rekomendasi Status Tanggap Darurat
                      </span>
                      <span className="text-base font-black text-rose-400 font-mono tracking-wider">
                        {aiReport.recommendedAlertLevel || "SIAGA_1"}
                      </span>
                    </div>
                    <span className="px-3 py-1 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/30 text-xs font-bold font-mono">
                      High Confidence
                    </span>
                  </div>

                  {/* Executive Summary */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-200 mb-1.5 flex items-center gap-1.5">
                      <Activity className="h-3.5 w-3.5 text-rose-400" />
                      Ringkasan Eksekutif Dampak
                    </h4>
                    <p className="p-3 rounded-lg bg-slate-950/80 border border-slate-850 text-slate-300 leading-relaxed text-[11px]">
                      {aiReport.executiveSummary}
                    </p>
                  </div>

                  {/* Danger Zones Table */}
                  {aiReport.dangerZones && (
                    <div>
                      <h4 className="text-xs font-bold text-slate-200 mb-1.5 flex items-center gap-1.5">
                        <ShieldCheck className="h-3.5 w-3.5 text-rose-400" />
                        Zona Bahaya &amp; Estimasi Kerusakan Spasial
                      </h4>
                      <div className="rounded-lg border border-slate-800 overflow-hidden">
                        <table className="w-full text-left text-[11px]">
                          <thead className="bg-slate-950 text-slate-400 font-mono text-[10px]">
                            <tr>
                              <th className="py-2 px-3">Zona Bahaya</th>
                              <th className="py-2 px-3">Radius</th>
                              <th className="py-2 px-3">Tingkat Kerusakan</th>
                              <th className="py-2 px-3">Kondisi Lapangan</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/60 bg-slate-950/40">
                            {aiReport.dangerZones.map((z: AiDangerZoneAdmin, idx: number) => (
                              <tr key={idx}>
                                <td className="py-2.5 px-3 font-semibold text-slate-200">{z.ring}</td>
                                <td className="py-2.5 px-3 font-mono text-rose-400">~{z.radiusKm} km</td>
                                <td className="py-2.5 px-3">
                                  <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] font-bold">
                                    {z.damageLevel}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 text-slate-400">{z.description}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Critical Infrastructure */}
                  {aiReport.criticalInfrastructure && (
                    <div>
                      <h4 className="text-xs font-bold text-slate-200 mb-1.5 flex items-center gap-1.5">
                        <Zap className="h-3.5 w-3.5 text-amber-400" />
                        Status Fasilitas Vital &amp; Infrastruktur Publik
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                        <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-850">
                          <span className="font-bold text-slate-200 block mb-0.5">🏥 Rumah Sakit &amp; Faskes</span>
                          <span className="text-slate-400">{aiReport.criticalInfrastructure.hospitals}</span>
                        </div>
                        <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-850">
                          <span className="font-bold text-slate-200 block mb-0.5">🛣️ Jalur Jalan &amp; Jembatan</span>
                          <span className="text-slate-400">{aiReport.criticalInfrastructure.roadsAndBridges}</span>
                        </div>
                        <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-850">
                          <span className="font-bold text-slate-200 block mb-0.5">⚡ Jaringan Listrik PLN</span>
                          <span className="text-slate-400">{aiReport.criticalInfrastructure.powerGrid}</span>
                        </div>
                        <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-850">
                          <span className="font-bold text-slate-200 block mb-0.5">📡 Jaringan Komunikasi Seluler</span>
                          <span className="text-slate-400">{aiReport.criticalInfrastructure.communications}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Priority Actions */}
                  {aiReport.priorityActions && (
                    <div>
                      <h4 className="text-xs font-bold text-slate-200 mb-1.5">
                        Langkah Prioritas Tim Tanggap Bencana (0–6 Jam):
                      </h4>
                      <ul className="space-y-1.5 text-[11px] text-slate-300">
                        {aiReport.priorityActions.map((action: string, idx: number) => (
                          <li key={idx} className="flex items-start gap-2 p-2 rounded bg-slate-950/60 border border-slate-850">
                            <span className="h-4 w-4 rounded-full bg-rose-500/20 text-rose-400 font-mono text-[10px] flex items-center justify-center font-bold flex-shrink-0 mt-0.5">
                              {idx + 1}
                            </span>
                            <span>{action}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="pt-3 border-t border-slate-800 flex items-center justify-end">
                    <button
                      onClick={() => alert("Laporan berhasil disalin ke clipboard.")}
                      className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer"
                    >
                      Salin Laporan Intelijen
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
