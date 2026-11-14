export type SimDisasterType = "EARTHQUAKE" | "TSUNAMI" | "VOLCANO" | "LIQUEFACTION" | "WILDFIRE";
export type SimMechanism = "SUBDUCTION" | "STRIKE_SLIP" | "NORMAL";
export type CameraPreset = "orbit" | "city" | "coast" | "crater" | "fault" | "forest";

export interface ThreeEarthquakeCanvasProps {
  magnitude: number;
  depthKm: number;
  slipMeters: number;
  isTsunamiActive: boolean;
  isSimulating: boolean;
  mechanism: SimMechanism;
  disasterType: SimDisasterType;
  onDisasterTypeChange: (type: SimDisasterType) => void;
  onSimulatingChange: (running: boolean) => void;
}
