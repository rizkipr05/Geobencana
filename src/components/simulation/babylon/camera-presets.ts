import type { CameraPreset, SimDisasterType } from "../types";

export const CAMERA_PRESETS: Record<CameraPreset, { position: [number, number, number]; target: [number, number, number] }> = {
  orbit: { position: [30, 26, 32], target: [2, 1, 0] },
  city: { position: [-2, 11, 14], target: [-11, 3, 0] },
  coast: { position: [4, 7, 18], target: [11, 2, 3] },
  crater: { position: [16, 12, 4], target: [23, 5, -6] },
  fault: { position: [-11, 18, 18], target: [-11, 0, 0] },
  forest: { position: [-10, 12, -1], target: [-19, 2, -9] },
};

export const CAMERA_BY_DISASTER: Record<SimDisasterType, CameraPreset> = {
  EARTHQUAKE: "city",
  TSUNAMI: "coast",
  VOLCANO: "crater",
  LIQUEFACTION: "city",
  WILDFIRE: "forest",
};

export const DISASTER_LABELS: Record<SimDisasterType, string> = {
  EARTHQUAKE: "Kota & Infrastruktur",
  TSUNAMI: "Pesisir & Jembatan",
  VOLCANO: "Kawasan Vulkanik",
  LIQUEFACTION: "Permukiman Tanah Lunak",
  WILDFIRE: "Hutan & Lereng",
};
