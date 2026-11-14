import type { CameraPreset, SimDisasterType } from "../types";

export const CAMERA_PRESETS: Record<CameraPreset, { position: [number, number, number]; target: [number, number, number] }> = {
  orbit: { position: [23, 18, 27], target: [0, 1, 0] },
  city: { position: [-10, 9, 13], target: [-8, 3, 0] },
  coast: { position: [3, 8, 17], target: [15, 1, 2] },
  crater: { position: [15, 10, 11], target: [47, 5, -13] },
  fault: { position: [-13, 5, 17], target: [-14, 1, 0] },
  forest: { position: [-15, 10, 17], target: [-25, 2, -5] },
};

export const CAMERA_BY_DISASTER: Record<SimDisasterType, CameraPreset> = {
  EARTHQUAKE: "city", TSUNAMI: "coast", VOLCANO: "crater", LIQUEFACTION: "city", WILDFIRE: "forest",
};

export const DISASTER_LABELS: Record<SimDisasterType, string> = {
  EARTHQUAKE: "Kota & infrastruktur", TSUNAMI: "Pesisir", VOLCANO: "Kawasan vulkanik",
  LIQUEFACTION: "Permukiman tanah lunak", WILDFIRE: "Hutan & lereng",
};
