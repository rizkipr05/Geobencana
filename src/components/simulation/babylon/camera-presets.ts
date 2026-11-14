import type { CameraPreset, SimDisasterType } from "../types";

export const CAMERA_PRESETS: Record<CameraPreset, { position: [number, number, number]; target: [number, number, number] }> = {
  orbit: { position: [28, 26, 30], target: [2, 2, 0] },
  city: { position: [-4, 11, 14], target: [-12, 4, 0] },
  coast: { position: [2, 7, 18], target: [10, 3, 4] },
  crater: { position: [15, 14, 4], target: [22, 6, -6] },
  fault: { position: [-12, 16, 18], target: [-12, 0, 0] },
  forest: { position: [-10, 14, -2], target: [-18, 3, -11] },
};

export const CAMERA_BY_DISASTER: Record<SimDisasterType, CameraPreset> = {
  EARTHQUAKE: "city",
  TSUNAMI: "coast",
  VOLCANO: "crater",
  LIQUEFACTION: "city",
  WILDFIRE: "forest",
};

export const DISASTER_LABELS: Record<SimDisasterType, string> = {
  EARTHQUAKE: "Kota & infrastruktur",
  TSUNAMI: "Pesisir & Jembatan",
  VOLCANO: "Kawasan Vulkanik",
  LIQUEFACTION: "Permukiman Tanah Lunak",
  WILDFIRE: "Hutan & Lereng",
};
