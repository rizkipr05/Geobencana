"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export interface MapDisasterItem {
  id: string;
  title: string;
  latitude: number;
  longitude: number;
  magnitude?: number | null;
  depthKm?: number | null;
  severityLevel: string;
  locationName: string;
  radiusKm?: number;
}

interface DisasterMapProps {
  disasters: MapDisasterItem[];
  selectedDisaster?: MapDisasterItem | null;
  onSelectCoordinate?: (lat: number, lng: number) => void;
  interactivePick?: boolean;
}

export default function DisasterMap({
  disasters,
  selectedDisaster,
  onSelectCoordinate,
  interactivePick = false,
}: DisasterMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const pickedMarkerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      // Default center: Indonesia archipelagic region
      const map = L.map(mapContainerRef.current, {
        center: [-2.5489, 118.0149],
        zoom: 5,
        zoomControl: true,
      });

      // Esri World Dark Gray Canvas (High-resolution, free GIS service, no watermark)
      L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}",
        {
          attribution: "Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ",
          maxZoom: 16,
        }
      ).addTo(map);

      // Boundaries & City Names Reference Overlay
      L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}",
        {
          attribution: "",
          maxZoom: 16,
        }
      ).addTo(map);

      const markersGroup = L.layerGroup().addTo(map);
      markersLayerRef.current = markersGroup;
      mapInstanceRef.current = map;

      // Handle map clicks for coordinate picking
      map.on("click", (e: L.LeafletMouseEvent) => {
        if (onSelectCoordinate) {
          const { lat, lng } = e.latlng;
          onSelectCoordinate(
            parseFloat(lat.toFixed(4)),
            parseFloat(lng.toFixed(4))
          );

          if (pickedMarkerRef.current) {
            pickedMarkerRef.current.setLatLng(e.latlng);
          } else {
            pickedMarkerRef.current = L.marker(e.latlng, {
              icon: L.divIcon({
                className: "custom-pin",
                html: `<div style="background:#f43f5e;width:14px;height:14px;border-radius:50%;border:2px solid white;box-shadow:0 0 10px #f43f5e;"></div>`,
                iconSize: [14, 14],
              }),
            }).addTo(map);
          }
        }
      });
    }

    const map = mapInstanceRef.current;
    const markersGroup = markersLayerRef.current;

    if (map && markersGroup) {
      markersGroup.clearLayers();

      disasters.forEach((d) => {
        if (!d.latitude || !d.longitude) return;

        const isCritical = d.severityLevel === "CRITICAL";
        const isHigh = d.severityLevel === "HIGH";
        const color = isCritical
          ? "#ef4444"
          : isHigh
          ? "#f97316"
          : d.severityLevel === "MEDIUM"
          ? "#eab308"
          : "#10b981";

        const radius = Math.max(6, (d.magnitude || 4) * 2.5);

        const circleMarker = L.circleMarker([d.latitude, d.longitude], {
          radius,
          fillColor: color,
          color: "#ffffff",
          weight: 1.5,
          opacity: 0.9,
          fillOpacity: 0.75,
        });

        const popupContent = `
          <div style="font-family:sans-serif;color:#0f172a;min-width:180px;font-size:12px;">
            <div style="font-weight:bold;color:${color};margin-bottom:4px;font-size:13px;">
              ${d.title}
            </div>
            <div style="color:#64748b;margin-bottom:2px;">📍 ${d.locationName}</div>
            ${d.magnitude ? `<div><strong>Magnitude:</strong> M ${d.magnitude}</div>` : ""}
            ${d.depthKm ? `<div><strong>Kedalaman:</strong> ${d.depthKm} km</div>` : ""}
            <div style="margin-top:4px;"><span style="background:${color};color:white;padding:2px 6px;border-radius:4px;font-size:10px;font-weight:bold;">${d.severityLevel}</span></div>
          </div>
        `;

        circleMarker.bindPopup(popupContent);
        markersGroup.addLayer(circleMarker);
      });
    }

    return () => {
      // Map cleanup on unmount handled by ref check
    };
  }, [disasters, onSelectCoordinate]);

  // If a specific disaster is selected, fly to it and draw radius circle
  useEffect(() => {
    if (!mapInstanceRef.current || !selectedDisaster) return;
    const map = mapInstanceRef.current;
    map.flyTo([selectedDisaster.latitude, selectedDisaster.longitude], 8, {
      duration: 1.2,
    });
  }, [selectedDisaster]);

  return (
    <div className="relative w-full h-full min-h-[380px] rounded-xl overflow-hidden border border-slate-800 shadow-2xl">
      <div ref={mapContainerRef} className="w-full h-full min-h-[380px] z-10" />

      {interactivePick && (
        <div className="absolute top-3 right-3 z-20 px-3 py-1.5 rounded-lg bg-slate-950/85 backdrop-blur-md border border-rose-500/40 text-[11px] font-mono text-rose-300 shadow-lg">
          📍 Klik pada peta untuk memilih titik koordinat
        </div>
      )}

      {/* Legend overlay */}
      <div className="absolute bottom-3 left-3 z-20 px-3 py-2 rounded-lg bg-slate-950/85 backdrop-blur-md border border-slate-800 text-[10px] text-slate-300 font-mono shadow-lg flex items-center gap-3">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-500" /> Critical (M≥7.0)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-orange-500" /> High (M≥5.5)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-amber-500" /> Medium
        </span>
      </div>
    </div>
  );
}
