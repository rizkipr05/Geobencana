import type { CameraPreset, SimDisasterType } from "../types";

export const CAMERA_PRESETS: Record<CameraPreset, { position: [number, number, number]; target: [number, number, number] }> = {
  orbit: { position: [13, 11, 17], target: [-1, 2, 0] },
  city: { position: [-10, 8, 11], target: [-8, 3, 0] },
  coast: { position: [8, 7, 14], target: [19, 1, 1] },
  crater: { position: [15, 10, 11], target: [47, 5, -13] },
  fault: { position: [-13, 5, 17], target: [-14, 1, 0] },
  forest: { position: [-15, 10, 17], target: [-25, 2, -5] },
};

export const CAMERA_BY_DISASTER: Record<SimDisasterType, CameraPreset> = {
  EARTHQUAKE: "city", TSUNAMI: "orbit", VOLCANO: "crater", LIQUEFACTION: "city", WILDFIRE: "forest",
};

export const DISASTER_LABELS: Record<SimDisasterType, string> = {
  EARTHQUAKE: "Kota & infrastruktur", TSUNAMI: "Pesisir", VOLCANO: "Kawasan vulkanik",
  LIQUEFACTION: "Permukiman tanah lunak", WILDFIRE: "Hutan & lereng",
};
