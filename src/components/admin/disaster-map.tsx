"use client";

import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  Activity,
  Globe2,
  Waves,
  Zap,
} from "lucide-react";
import { getDisasterConfig } from "@/lib/disaster-icons";

export interface DisasterMapItem {
  id: string;
  title: string;
  categoryCode?: string;
  latitude: number;
  longitude: number;
  magnitude?: number | null;
  depthKm?: number | null;
  severityLevel: string;
  locationName: string;
  metadata?: Record<string, unknown> | null;
}

interface DisasterMapProps {
  disasters: DisasterMapItem[];
  selectedDisaster?: DisasterMapItem | null;
  onSelectCoordinate?: (lat: number, lng: number) => void;
  onSelectDisaster?: (disaster: DisasterMapItem) => void;
  interactivePick?: boolean;
}

// Major Tectonic Fault Lines & Subduction Trench Arcs (Indonesian Arc & Ring of Fire)
const TECTONIC_FAULTS = [
  {
    name: "Sunda Megathrust Subduction Arc",
    type: "Subduction Trench",
    coords: [
      [5.5, 93.0],
      [3.0, 95.0],
      [0.0, 97.5],
      [-3.0, 99.5],
      [-6.5, 103.0],
      [-9.0, 107.0],
      [-10.5, 113.0],
      [-11.2, 119.0],
      [-10.5, 124.0],
    ],
    color: "#f43f5e",
  },
  {
    name: "Great Sumatran Fault (Sesar Semangko)",
    type: "Strike-Slip",
    coords: [
      [5.5, 95.3],
      [3.2, 97.1],
      [0.5, 99.8],
      [-2.1, 102.2],
      [-4.8, 104.5],
      [-5.8, 105.7],
    ],
    color: "#f59e0b",
  },
  {
    name: "Sesar Palu-Koro (Sulawesi Tengah)",
    type: "Strike-Slip Fast Slip",
    coords: [
      [1.2, 119.8],
      [-0.8, 119.85],
      [-1.9, 120.3],
      [-3.0, 121.2],
      [-4.5, 122.5],
    ],
    color: "#ec4899",
  },
  {
    name: "Sesar Lembang (Bandung Basin)",
    type: "Normal / Strike-Slip",
    coords: [
      [-6.81, 107.55],
      [-6.815, 107.63],
      [-6.82, 107.72],
      [-6.825, 107.8],
    ],
    color: "#e11d48",
  },
  {
    name: "Sesar Sorong Fault (Papua - Maluku)",
    type: "Transform Fault",
    coords: [
      [-1.2, 127.5],
      [-1.0, 130.0],
      [-0.8, 132.5],
      [-1.5, 136.0],
      [-2.5, 140.0],
    ],
    color: "#fb923c",
  },
  {
    name: "Flores Back-Arc Thrust",
    type: "Thrust Fault",
    coords: [
      [-8.0, 116.0],
      [-7.8, 119.0],
      [-7.5, 122.0],
      [-7.2, 124.5],
    ],
    color: "#a855f7",
  },
];

export default function DisasterMap({
  disasters,
  selectedDisaster,
  onSelectCoordinate,
  onSelectDisaster,
  interactivePick = false,
}: DisasterMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const zonesLayerRef = useRef<L.LayerGroup | null>(null);
  const faultsLayerRef = useRef<L.LayerGroup | null>(null);
  const baseTilesRef = useRef<{ [key: string]: L.LayerGroup }>({});
  const pickedMarkerRef = useRef<L.Marker | null>(null);

  const [activeBasemap, setActiveBasemap] = useState<"dark" | "satellite">("dark");
  const [showFaults, setShowFaults] = useState<boolean>(true);
  const [showShakingZones, setShowShakingZones] = useState<boolean>(true);
  const [showLegend, setShowLegend] = useState<boolean>(false);

  const onSelectRef = useRef(onSelectCoordinate);
  useEffect(() => {
    onSelectRef.current = onSelectCoordinate;
  });

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [-2.5, 118.0], // Indonesia Archipelagic Center
        zoom: 5,
        minZoom: 4,
        maxBounds: [
          [-14.0, 92.0],
          [9.0, 144.0],
        ],
        maxBoundsViscosity: 0.8,
        zoomControl: false,
      });

      L.control.zoom({ position: "bottomright" }).addTo(map);

      // 1. Dark Gray Basemap Layer
      const darkBase = L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}",
        { attribution: "Esri Dark Gray", maxZoom: 16 }
      );
      const darkRef = L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}",
        { maxZoom: 16 }
      );
      const darkGroup = L.layerGroup([darkBase, darkRef]).addTo(map);

      // 2. Satellite Basemap Layer
      const satBase = L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        { attribution: "Esri Satellite Imagery", maxZoom: 18 }
      );
      const satRef = L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
        { maxZoom: 18 }
      );
      const satGroup = L.layerGroup([satBase, satRef]);

      baseTilesRef.current = { dark: darkGroup, satellite: satGroup };

      // Vector Groups
      const faultsGroup = L.layerGroup().addTo(map);
      faultsLayerRef.current = faultsGroup;

      const zonesGroup = L.layerGroup().addTo(map);
      zonesLayerRef.current = zonesGroup;

      const markersGroup = L.layerGroup().addTo(map);
      markersLayerRef.current = markersGroup;

      mapInstanceRef.current = map;

      // Coordinate click picker
      map.on("click", (e: L.LeafletMouseEvent) => {
        if (onSelectRef.current) {
          const { lat, lng } = e.latlng;
          onSelectRef.current(parseFloat(lat.toFixed(4)), parseFloat(lng.toFixed(4)));

          if (pickedMarkerRef.current) {
            pickedMarkerRef.current.setLatLng(e.latlng);
          } else {
            pickedMarkerRef.current = L.marker(e.latlng, {
              icon: L.divIcon({
                className: "custom-pin",
                html: `<div style="background:#f43f5e;width:14px;height:14px;border-radius:50%;border:2px solid white;box-shadow:0 0 12px #f43f5e;"></div>`,
                iconSize: [14, 14],
              }),
            }).addTo(map);
          }
        }
      });
    }

    return () => {
      // Map instance persists across re-renders
    };
  }, []);

  // Handle Basemap Switch
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !baseTilesRef.current.dark || !baseTilesRef.current.satellite) return;

    if (activeBasemap === "dark") {
      map.removeLayer(baseTilesRef.current.satellite);
      map.addLayer(baseTilesRef.current.dark);
    } else {
      map.removeLayer(baseTilesRef.current.dark);
      map.addLayer(baseTilesRef.current.satellite);
    }
  }, [activeBasemap]);

  // Render Tectonic Fault Lines
  useEffect(() => {
    const map = mapInstanceRef.current;
    const faultsGroup = faultsLayerRef.current;
    if (!map || !faultsGroup) return;

    faultsGroup.clearLayers();

    if (showFaults) {
      TECTONIC_FAULTS.forEach((fault) => {
        const polyline = L.polyline(fault.coords as [number, number][], {
          color: fault.color,
          weight: 3,
          dashArray: "6, 8",
          opacity: 0.85,
        });

        polyline.bindTooltip(
          `<strong>${fault.name}</strong><br/><span style="color:#94a3b8;font-size:10px;">Tipe: ${fault.type}</span>`,
          { sticky: true }
        );

        faultsGroup.addLayer(polyline);
      });
    }
  }, [showFaults]);

  // Render Disaster Markers with Rich Badges and Hover Tooltips
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersGroup = markersLayerRef.current;
    if (!map || !markersGroup) return;

    markersGroup.clearLayers();

    disasters.forEach((d) => {
      if (!d.latitude || !d.longitude) return;

      const catConfig = getDisasterConfig(d.categoryCode);
      const isQuake = (d.categoryCode || "EARTHQUAKE").toUpperCase() === "EARTHQUAKE";
      const mag = d.magnitude;
      const isCritical = d.severityLevel === "CRITICAL" || (mag && mag >= 6.5);
      const isHigh = d.severityLevel === "HIGH" || (mag && mag >= 5.5);
      const isSelected = selectedDisaster?.id === d.id;

      let markerColor = catConfig.color;
      let markerGradient = catConfig.gradient;
      let shadowColor = catConfig.shadowColor;

      if (isQuake && mag) {
        if (mag >= 6.5) {
          markerColor = "#e11d48";
          markerGradient = "linear-gradient(135deg, #f43f5e, #be123c)";
          shadowColor = "rgba(225, 29, 72, 0.75)";
        } else if (mag >= 5.5) {
          markerColor = "#f97316";
          markerGradient = "linear-gradient(135deg, #fb923c, #ea580c)";
          shadowColor = "rgba(249, 115, 22, 0.7)";
        } else if (mag >= 4.5) {
          markerColor = "#eab308";
          markerGradient = "linear-gradient(135deg, #facc15, #ca8a04)";
          shadowColor = "rgba(234, 179, 8, 0.65)";
        } else {
          markerColor = "#10b981";
          markerGradient = "linear-gradient(135deg, #34d399, #059669)";
          shadowColor = "rgba(16, 185, 129, 0.6)";
        }
      }

      const badgeSize = isSelected ? 38 : isCritical ? 34 : isHigh ? 30 : 28;
      const iconSize = isSelected ? 18 : 15;

      // Custom Glowing HTML Marker with Disaster-Specific Icon
      const customIcon = L.divIcon({
        className: "custom-disaster-marker",
        iconSize: [badgeSize, badgeSize],
        iconAnchor: [badgeSize / 2, badgeSize / 2],
        html: `
          <div style="position:relative;width:${badgeSize}px;height:${badgeSize}px;display:flex;align-items:center;justify-content:center;cursor:pointer;">
            ${
              isSelected
                ? `<div class="seismic-shockwave" style="position:absolute;inset:-6px;border-radius:50%;border:2px solid ${markerColor};"></div>`
                : ""
            }
            <div style="width:${badgeSize}px;height:${badgeSize}px;background:${markerGradient};border-radius:50%;border:${
              isSelected ? "2.5px solid #ffffff" : "1.5px solid rgba(255,255,255,0.85)"
            };display:flex;align-items:center;justify-content:center;color:white;box-shadow:${
              isSelected ? `0 0 14px ${shadowColor}` : "0 2px 4px rgba(0,0,0,0.5)"
            };">
              <div style="width:${iconSize}px;height:${iconSize}px;display:flex;align-items:center;justify-content:center;color:white;">
                ${catConfig.svgIcon}
              </div>
            </div>
            ${
              isQuake && mag
                ? `<div style="position:absolute;bottom:-6px;right:-7px;background:#090d16;border:1.5px solid ${markerColor};color:#ffffff;font-family:monospace;font-weight:900;font-size:9px;padding:0.5px 3.5px;border-radius:4px;white-space:nowrap;box-shadow:0 2px 5px rgba(0,0,0,0.7);line-height:1.2;">
                    ${mag.toFixed(1)}
                  </div>`
                : ""
            }
          </div>
        `,
      });

      const marker = L.marker([d.latitude, d.longitude], { icon: customIcon });

      // Interactive Tooltip on Hover
      marker.bindTooltip(
        `
        <div style="font-family:sans-serif;padding:4px 6px;min-width:190px;">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:6px;margin-bottom:3px;">
            <span style="background:${markerColor}25;border:1px solid ${markerColor}60;color:${markerColor};font-size:10px;font-weight:800;font-family:monospace;padding:1px 6px;border-radius:4px;text-transform:uppercase;">
              ${catConfig.name}
            </span>
            ${mag ? `<span style="font-family:monospace;font-weight:900;color:${markerColor};font-size:12px;">M ${mag.toFixed(1)}</span>` : ""}
          </div>
          <div style="font-weight:bold;color:#f8fafc;font-size:12px;margin-bottom:2px;line-height:1.25;">
            ${d.title}
          </div>
          <div style="color:#cbd5e1;font-size:11px;margin-bottom:3px;">
            📍 ${d.locationName}
          </div>
          <div style="color:#94a3b8;font-size:10px;border-top:1px solid rgba(255,255,255,0.1);padding-top:3px;display:flex;justify-content:space-between;">
            <span>${d.depthKm ? `Kedalaman: ${d.depthKm} km` : "Kejadian Aktif"}</span>
            <span style="font-weight:bold;color:${markerColor};">${d.severityLevel}</span>
          </div>
        </div>
      `,
        { direction: "top", offset: [0, -badgeSize / 2] }
      );

      // Click to select
      marker.on("click", () => {
        if (onSelectDisaster) {
          onSelectDisaster(d);
        }
      });

      markersGroup.addLayer(marker);
    });
  }, [disasters, selectedDisaster, onSelectDisaster]);

  // Render Detailed MMI Shaking Intensity Zones (Isoseismals) & Tsunami Buffer on Selected Disaster
  useEffect(() => {
    const map = mapInstanceRef.current;
    const zonesGroup = zonesLayerRef.current;
    if (!map || !zonesGroup) return;

    zonesGroup.clearLayers();

    if (!selectedDisaster || !showShakingZones) return;

    const lat = selectedDisaster.latitude;
    const lng = selectedDisaster.longitude;
    const mag = selectedDisaster.magnitude || 5.0;
    const isTsunami =
      selectedDisaster.metadata?.tsunami === 1 ||
      selectedDisaster.title.toLowerCase().includes("tsunami") ||
      (mag >= 7.0 && (selectedDisaster.depthKm || 10) <= 50);

    // Dynamic Isoseismal Radii based on Gutenberg-Richter shaking attenuation
    const r1Meters = Math.max(15000, Math.pow(10, 0.42 * mag) * 900); // Heavy shaking (MMI VII-IX)
    const r2Meters = r1Meters * 2.8; // Moderate shaking (MMI V-VI)
    const r3Meters = r1Meters * 6.0; // Light shaking (MMI III-IV)

    // Zone 3: Felt Shaking Zone (MMI III-IV Yellow)
    const zone3 = L.circle([lat, lng], {
      radius: r3Meters,
      color: "#eab308",
      weight: 1.5,
      dashArray: "8, 6",
      fillColor: "#eab308",
      fillOpacity: 0.06,
    });
    zone3.bindTooltip("Zona Guncangan Terasa (MMI III - IV)", { sticky: true });
    zonesGroup.addLayer(zone3);

    // Zone 2: Moderate Damage Zone (MMI V-VI Orange)
    const zone2 = L.circle([lat, lng], {
      radius: r2Meters,
      color: "#f97316",
      weight: 2,
      dashArray: "6, 4",
      fillColor: "#f97316",
      fillOpacity: 0.12,
    });
    zone2.bindTooltip("Zona Kerusakan Sedang (MMI V - VI)", { sticky: true });
    zonesGroup.addLayer(zone2);

    // Zone 1: Epicenter Heavy Impact Zone (MMI VII-IX Crimson)
    const zone1 = L.circle([lat, lng], {
      radius: r1Meters,
      color: "#e11d48",
      weight: 2.5,
      fillColor: "#e11d48",
      fillOpacity: 0.22,
    });
    zone1.bindTooltip("Zona Episentrum Bahaya Berat (MMI VII - IX)", { sticky: true });
    zonesGroup.addLayer(zone1);

    // Tsunami Wave Propagation Warning Ring
    if (isTsunami) {
      const tsunamiWave = L.circle([lat, lng], {
        radius: r2Meters * 1.4,
        color: "#06b6d4",
        weight: 3,
        dashArray: "4, 4",
        fillColor: "#06b6d4",
        fillOpacity: 0.15,
      });
      tsunamiWave.bindTooltip("🌊 PERINGATAN POTENSI TSUNAMI: Radius Gelombang Pesisir", {
        sticky: true,
      });
      zonesGroup.addLayer(tsunamiWave);
    }

    // Fly camera smoothly to the selected disaster
    map.flyTo([lat, lng], Math.min(8, Math.max(6, 12 - Math.round(mag))), {
      duration: 1.2,
    });
  }, [selectedDisaster, showShakingZones]);

  return (
    <div className="relative w-full h-full overflow-hidden bg-slate-950">
      <div ref={mapContainerRef} className="w-full h-full z-10" />

      {/* Floating Map Controls & Layer Switcher Bar */}
      <div className="absolute top-4 left-4 z-20 flex flex-wrap items-center gap-2">
        {/* Basemap Switcher */}
        <div className="flex items-center rounded-xl bg-slate-950/95 border border-slate-800 p-1 shadow-xl text-xs font-mono">
          <button
            onClick={() => setActiveBasemap("dark")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              activeBasemap === "dark"
                ? "bg-rose-600 text-white font-bold shadow-md"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Activity className="h-3.5 w-3.5" />
            <span>Dark GIS</span>
          </button>
          <button
            onClick={() => setActiveBasemap("satellite")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              activeBasemap === "satellite"
                ? "bg-rose-600 text-white font-bold shadow-md"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Globe2 className="h-3.5 w-3.5" />
            <span>Satelit</span>
          </button>
        </div>

        {/* Tectonic Faults Toggle */}
        <button
          onClick={() => setShowFaults(!showFaults)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border shadow-xl text-xs font-mono transition-all ${
            showFaults
              ? "bg-slate-900/95 text-rose-300 border-rose-500/40 font-bold"
              : "bg-slate-950/90 text-slate-500 border-slate-800"
          }`}
          title="Tampilkan garis sesar dan patahan lempeng tektonik"
        >
          <Zap className="h-3.5 w-3.5 text-rose-500" />
          <span>Garis Sesar {showFaults ? "ON" : "OFF"}</span>
        </button>

        {/* Shaking Zones Toggle */}
        <button
          onClick={() => setShowShakingZones(!showShakingZones)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border shadow-xl text-xs font-mono transition-all ${
            showShakingZones
              ? "bg-slate-900/95 text-amber-300 border-amber-500/40 font-bold"
              : "bg-slate-950/90 text-slate-500 border-slate-800"
          }`}
          title="Tampilkan zona getaran gempa MMI (Isoseismal)"
        >
          <Waves className="h-3.5 w-3.5 text-amber-400" />
          <span>Radius MMI {showShakingZones ? "ON" : "OFF"}</span>
        </button>
      </div>

      {interactivePick && (
        <div className="absolute top-16 right-4 z-20 px-3 py-1.5 rounded-lg bg-slate-950/95 border border-rose-500/40 text-[11px] font-mono text-rose-300 shadow-lg">
          📍 Klik pada peta untuk memilih titik koordinat
        </div>
      )}

      {/* Legend & Telemetry Overlay (Bottom Left) - Collapsible */}
      <div className="absolute bottom-4 left-4 z-20 flex flex-col items-start gap-1.5">
        {showLegend && (
          <div className="p-3 rounded-xl bg-slate-950/95 border border-slate-800 text-[10px] text-slate-300 font-mono shadow-2xl space-y-2 max-w-xs sm:max-w-none animate-fadeIn">
            <div className="flex items-center justify-between gap-3 pb-1 border-b border-slate-850">
              <span className="font-bold text-slate-200 uppercase tracking-wider text-[10px]">Legenda Peta Spasial</span>
              <button
                onClick={() => setShowLegend(false)}
                className="text-slate-400 hover:text-white p-0.5 rounded"
              >
                ✕
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="flex items-center gap-1.5">
                <span className="h-3.5 w-3.5 rounded-full bg-rose-500 flex items-center justify-center text-[9px] text-white">⚡</span>
                <span className="font-bold text-rose-400">Gempa</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-3.5 w-3.5 rounded-full bg-amber-500 flex items-center justify-center text-[9px] text-white">🔥</span>
                <span className="font-bold text-amber-400">Kebakaran (Karhutla)</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-3.5 w-3.5 rounded-full bg-orange-600 flex items-center justify-center text-[9px] text-white">🌋</span>
                <span className="font-bold text-orange-400">Gunung Api</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-3.5 w-3.5 rounded-full bg-sky-500 flex items-center justify-center text-[9px] text-white">🌊</span>
                <span className="font-bold text-sky-400">Banjir/Tsunami</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-3.5 w-3.5 rounded-full bg-purple-500 flex items-center justify-center text-[9px] text-white">🌀</span>
                <span className="font-bold text-purple-400">Cuaca Ekstrem</span>
              </span>
            </div>

            <div className="pt-1.5 border-t border-slate-800 flex items-center gap-3 text-[9px] text-slate-400">
              <span className="flex items-center gap-1">
                <span className="h-0.5 w-4 bg-rose-500 inline-block border-t border-dashed" /> Megathrust Sunda
              </span>
              <span className="flex items-center gap-1">
                <span className="h-0.5 w-4 bg-amber-500 inline-block border-t border-dashed" /> Sesar Semangko
              </span>
              <span className="flex items-center gap-1">
                <span className="h-0.5 w-4 bg-pink-500 inline-block border-t border-dashed" /> Sesar Palu-Koro
              </span>
            </div>
          </div>
        )}

        <button
          onClick={() => setShowLegend(!showLegend)}
          className="px-2.5 py-1.5 rounded-lg bg-slate-950/95 border border-slate-800 text-[11px] font-mono text-slate-300 hover:text-white flex items-center gap-1.5 shadow-lg hover:border-slate-700 transition-colors"
          title="Tampilkan / Sembunyikan Legenda Simbol Peta"
        >
          <span>🗺️</span>
          <span>{showLegend ? "Tutup Legenda" : "Legenda"}</span>
        </button>
      </div>
    </div>
  );
}
