import type { SimMechanism } from "../types";

export function estimatePga(magnitude: number, depthKm: number) {
  return Math.min(1.5, Math.pow(10, 0.5 * magnitude - 2.2) / (depthKm + 10));
}

export function estimateTsunamiHeight(magnitude: number, slipMeters: number, mechanism: SimMechanism, depthKm: number) {
  return mechanism === "SUBDUCTION" && depthKm < 70 ? slipMeters * 0.4 * (magnitude / 8) * 0.25 : 0;
}
