import React from "react";
import {
  Flame,
  Waves,
  CloudRain,
  Wind,
  AlertTriangle,
  Mountain,
} from "lucide-react";

export interface DisasterCategoryConfig {
  code: string;
  name: string;
  shortLabel: string;
  color: string;
  gradient: string;
  shadowColor: string;
  bgLight: string;
  borderLight: string;
  textLight: string;
  svgIcon: string;
}

export const DISASTER_CATEGORIES: Record<string, DisasterCategoryConfig> = {
  EARTHQUAKE: {
    code: "EARTHQUAKE",
    name: "Gempa Bumi (BMKG / USGS)",
    shortLabel: "Gempa",
    color: "#ef4444", // Red-500
    gradient: "linear-gradient(135deg, #f43f5e, #dc2626)",
    shadowColor: "rgba(239, 68, 68, 0.6)",
    bgLight: "bg-rose-500/15",
    borderLight: "border-rose-500/30",
    textLight: "text-rose-400",
    svgIcon: `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" class="h-full w-full">
        <circle cx="12" cy="12" r="9.2" stroke="currentColor" stroke-width="1.3" stroke-dasharray="2 1.5" opacity="0.7"/>
        <circle cx="12" cy="12" r="6.2" stroke="currentColor" stroke-width="1.5" opacity="0.85"/>
        <circle cx="12" cy="12" r="3.2" stroke="currentColor" stroke-width="1.7"/>
        <path d="M12 7l1 3.2 3.2 1-3.2 1-1 3.2-1-3.2-3.2-1 3.2-1L12 7z" fill="currentColor"/>
      </svg>
    `,
  },
  WILDFIRE: {
    code: "WILDFIRE",
    name: "Kebakaran Hutan & Lahan",
    shortLabel: "Karhutla",
    color: "#f59e0b", // Amber-500
    gradient: "linear-gradient(135deg, #f97316, #eab308)",
    shadowColor: "rgba(245, 158, 11, 0.65)",
    bgLight: "bg-amber-500/15",
    borderLight: "border-amber-500/30",
    textLight: "text-amber-400",
    svgIcon: `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="h-full w-full">
        <path d="M12 2c-.6 1.4-1.8 3-2.6 4.3C7.6 9.3 7 11.5 7 13.5A5.5 5.5 0 0 0 12.5 19a5.5 5.5 0 0 0 5.5-5.5c0-1.8-.7-3.8-2.1-5.9C14.7 5.7 13 3.6 12 2zm0 15a3.5 3.5 0 0 1-3.5-3.5c0-1.1.4-2.3 1.3-3.7.8 1.2 1.6 2.2 2.2 3.2.4.6.8 1.1 1.2 1.5-.4 1.4-1.2 2.5-1.2 2.5z"/>
      </svg>
    `,
  },
  VOLCANO: {
    code: "VOLCANO",
    name: "Erupsi Gunung Api",
    shortLabel: "Vulkanik",
    color: "#ea580c", // Orange-600
    gradient: "linear-gradient(135deg, #dc2626, #ea580c)",
    shadowColor: "rgba(234, 88, 12, 0.65)",
    bgLight: "bg-orange-500/15",
    borderLight: "border-orange-500/30",
    textLight: "text-orange-400",
    svgIcon: `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" class="h-full w-full">
        <path d="m2 22 7-14h6l7 14H2Z"/>
        <path d="M9 8c-.5-1.5-1.5-2.5-3-3"/>
        <path d="M12 8V2"/>
        <path d="M15 8c.5-1.5 1.5-2.5 3-3"/>
      </svg>
    `,
  },
  FLOOD: {
    code: "FLOOD",
    name: "Banjir & Bandang",
    shortLabel: "Banjir",
    color: "#0284c7", // Sky-600
    gradient: "linear-gradient(135deg, #0284c7, #2563eb)",
    shadowColor: "rgba(2, 132, 199, 0.65)",
    bgLight: "bg-sky-500/15",
    borderLight: "border-sky-500/30",
    textLight: "text-sky-400",
    svgIcon: `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" class="h-full w-full">
        <path d="M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/>
        <path d="M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/>
        <path d="M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/>
      </svg>
    `,
  },
  TSUNAMI: {
    code: "TSUNAMI",
    name: "Tsunami",
    shortLabel: "Tsunami",
    color: "#06b6d4", // Cyan-500
    gradient: "linear-gradient(135deg, #0891b2, #06b6d4)",
    shadowColor: "rgba(6, 182, 212, 0.65)",
    bgLight: "bg-cyan-500/15",
    borderLight: "border-cyan-500/30",
    textLight: "text-cyan-400",
    svgIcon: `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" class="h-full w-full">
        <path d="M2 12h1a2 2 0 0 1 1.8 1.1l.4.8a2 2 0 0 0 1.8 1.1h1a2 2 0 0 0 1.8-1.1l.4-.8A2 2 0 0 1 12 12h1a2 2 0 0 1 1.8 1.1l.4.8a2 2 0 0 0 1.8 1.1h1a2 2 0 0 0 1.8-1.1l.4-.8A2 2 0 0 1 21 12h1"/>
        <path d="M2 18h1a2 2 0 0 1 1.8 1.1l.4.8a2 2 0 0 0 1.8 1.1h1a2 2 0 0 0 1.8-1.1l.4-.8A2 2 0 0 1 12 18h1a2 2 0 0 1 1.8 1.1l.4.8a2 2 0 0 0 1.8 1.1h1a2 2 0 0 0 1.8-1.1l.4-.8A2 2 0 0 1 21 18h1"/>
        <path d="M3.5 7.5A6.5 6.5 0 0 1 10 1c3.5 0 6 2 6 5 0 2.5-1.5 4-4 4-2 0-3-1-3-2"/>
      </svg>
    `,
  },
  STORM: {
    code: "STORM",
    name: "Cuaca Ekstrem & Siklon",
    shortLabel: "Badai",
    color: "#a855f7", // Purple-500
    gradient: "linear-gradient(135deg, #7c3aed, #a855f7)",
    shadowColor: "rgba(168, 85, 247, 0.65)",
    bgLight: "bg-purple-500/15",
    borderLight: "border-purple-500/30",
    textLight: "text-purple-400",
    svgIcon: `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" class="h-full w-full">
        <path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2"/>
        <path d="M9.6 4.6A2 2 0 1 1 11 8H2"/>
        <path d="M12.6 19.4A2 2 0 1 0 14 16H2"/>
      </svg>
    `,
  },
};

export const DEFAULT_DISASTER_CONFIG: DisasterCategoryConfig = {
  code: "OTHER",
  name: "Bencana Alam",
  shortLabel: "Bencana",
  color: "#f43f5e",
  gradient: "linear-gradient(135deg, #f43f5e, #e11d48)",
  shadowColor: "rgba(244, 63, 94, 0.6)",
  bgLight: "bg-rose-500/15",
  borderLight: "border-rose-500/30",
  textLight: "text-rose-400",
  svgIcon: `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-full w-full">
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
      <line x1="12" y1="9" x2="12" y2="13"/>
      <line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  `,
};

export function getDisasterConfig(categoryCode?: string | null): DisasterCategoryConfig {
  if (!categoryCode) return DEFAULT_DISASTER_CONFIG;
  const upper = categoryCode.toUpperCase();
  return DISASTER_CATEGORIES[upper] || DEFAULT_DISASTER_CONFIG;
}

interface DisasterIconProps {
  categoryCode?: string | null;
  className?: string;
  size?: number;
}

/**
 * Authentic BMKG Earthquake Epicenter Icon
 * Radiating concentric seismic shockwaves with a central 8-point epicenter star
 */
export function BMKGEpicenterIcon({
  className = "h-4 w-4",
  color = "currentColor",
}: {
  className?: string;
  color?: string;
  size?: number;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9.2" stroke={color} strokeWidth="1.2" strokeDasharray="2 1.5" opacity="0.65" />
      <circle cx="12" cy="12" r="6.2" stroke={color} strokeWidth="1.5" opacity="0.85" />
      <circle cx="12" cy="12" r="3.2" stroke={color} strokeWidth="1.7" />
      <path
        d="M12 7l1 3.2 3.2 1-3.2 1-1 3.2-1-3.2-3.2-1 3.2-1L12 7z"
        fill={color}
      />
    </svg>
  );
}

/**
 * Authentic BMKG Hazard Warning Triangle Icon
 * Official equilateral warning triangle with rounded corners and bold exclamation mark
 */
export function BMKGWarningTriangle({
  className = "h-6 w-6",
  color = "#F59E0B",
}: {
  className?: string;
  color?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Outer rounded hazard triangle */}
      <path
        d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
        fill={color}
        stroke="#0f172a"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      {/* Exclamation point body */}
      <path
        d="M12 9v4.5"
        stroke="#000000"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      {/* Exclamation point dot */}
      <circle cx="12" cy="16.5" r="1.2" fill="#000000" />
    </svg>
  );
}

/**
 * Official BMKG Institutional Logo Badge
 */
export function BMKGLogoBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded font-black tracking-widest text-[9px] bg-[#0047BA] text-white font-mono shadow-sm ${className}`}
    >
      BMKG
    </span>
  );
}

export function DisasterIcon({ categoryCode, className = "h-4 w-4", size }: DisasterIconProps) {
  const code = (categoryCode || "").toUpperCase();

  switch (code) {
    case "WILDFIRE":
      return <Flame className={className} size={size} />;
    case "VOLCANO":
      return <Mountain className={className} size={size} />;
    case "FLOOD":
      return <CloudRain className={className} size={size} />;
    case "TSUNAMI":
      return <Waves className={className} size={size} />;
    case "STORM":
      return <Wind className={className} size={size} />;
    case "EARTHQUAKE":
      return <BMKGEpicenterIcon className={className} size={size} />;
    default:
      return <AlertTriangle className={className} size={size} />;
  }
}

export interface BMKGAlertInfo {
  level: "AWAS" | "SIAGA" | "WASPADA";
  headline: string;
  color: string;
  bgLight: string;
  borderLight: string;
  textLight: string;
  tsunamiStatus: string;
  tsunamiRisk: boolean;
  advisory: string;
}

export function getBMKGAlertLevel(disaster?: {
  magnitude?: number | null;
  severityLevel?: string;
  metadata?: Record<string, unknown> | null;
  title?: string;
} | null): BMKGAlertInfo {
  const mag = disaster?.magnitude || 0;
  const isTsunamiRisk =
    disaster?.metadata?.tsunami === 1 ||
    Boolean(disaster?.title?.toLowerCase().includes("tsunami")) ||
    mag >= 7.0;

  if (isTsunamiRisk || mag >= 7.0 || disaster?.severityLevel === "CRITICAL") {
    return {
      level: "AWAS",
      headline: "AWAS - POTENSI TSUNAMI / GEMPA BESAR",
      color: "#ef4444",
      bgLight: "bg-rose-500/15",
      borderLight: "border-rose-500/40",
      textLight: "text-rose-400",
      tsunamiStatus: isTsunamiRisk
        ? "POTENSI TSUNAMI UNTUK DITERUSKAN PADA MASYARAKAT"
        : "TIDAK BERPOTENSI TSUNAMI",
      tsunamiRisk: isTsunamiRisk,
      advisory: "Saran BMKG: Segera menjauhi pantai dan tepian sungai. Ikuti arahan evakuasi BPBD setempat.",
    };
  }

  if (mag >= 6.0 || disaster?.severityLevel === "HIGH") {
    return {
      level: "SIAGA",
      headline: "SIAGA - GEMPA BUMI MERUSAK",
      color: "#f97316",
      bgLight: "bg-orange-500/15",
      borderLight: "border-orange-500/40",
      textLight: "text-orange-400",
      tsunamiStatus: "TIDAK BERPOTENSI TSUNAMI",
      tsunamiRisk: false,
      advisory: "Saran BMKG: Hati-hati terhadap gempabumi susulan yang mungkin terjadi. Periksa kondisi bangunan sebelum kembali ke dalam rumah.",
    };
  }

  return {
    level: "WASPADA",
    headline: "WASPADA - GEMPA DIRASAKAN",
    color: "#eab308",
    bgLight: "bg-amber-500/15",
    borderLight: "border-amber-500/40",
    textLight: "text-amber-400",
    tsunamiStatus: "TIDAK BERPOTENSI TSUNAMI",
    tsunamiRisk: false,
    advisory: "Saran BMKG: Masyarakat diimbau tetap tenang dan tidak terpengaruh oleh isu yang tidak dapat dipertanggungjawabkan.",
  };
}

