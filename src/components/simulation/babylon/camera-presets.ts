import type { CameraPreset, SimDisasterType } from "../types";

export const CAMERA_PRESETS: Record<CameraPreset, { position: [number, number, number]; target: [number, number, number] }> = {
  orbit: { position: [34, 30, 38], target: [0, 1, 0] },
  city: { position: [-18, 13, 22], target: [-12, 2, 0] },
  coast: { position: [-2, 10, 25], target: [6, 2, 8] },
  crater: { position: [28, 16, 14], target: [20, 6, 0] },
  fault: { position: [-17, 6, 26], target: [-14, 0, 0] },
  forest: { position: [-22, 14, 25], target: [-22, 2, -8] },
};

export const CAMERA_BY_DISASTER: Record<SimDisasterType, CameraPreset> = {
  EARTHQUAKE: "city", TSUNAMI: "coast", VOLCANO: "crater", LIQUEFACTION: "city", WILDFIRE: "forest",
};

export const DISASTER_LABELS: Record<SimDisasterType, string> = {
  EARTHQUAKE: "Kota & infrastruktur", TSUNAMI: "Pesisir", VOLCANO: "Kawasan vulkanik",
  LIQUEFACTION: "Permukiman tanah lunak", WILDFIRE: "Hutan & lereng",
};
