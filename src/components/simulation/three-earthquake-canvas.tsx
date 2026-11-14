"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import {
  AlertTriangle,
  Building2,
  Camera as CameraIcon,
  Droplets,
  Flame,
  Globe,
  Maximize,
  Moon,
  Mountain,
  Pause,
  Play,
  RotateCcw,
  Sun,
  Volume2,
  VolumeX,
  Waves,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================================================
// Types & Props
// ============================================================================
export type SimDisasterType =
  | "EARTHQUAKE"
  | "TSUNAMI"
  | "VOLCANO"
  | "LIQUEFACTION"
  | "WILDFIRE";

export type SimMechanism = "SUBDUCTION" | "STRIKE_SLIP" | "NORMAL";

interface ThreeEarthquakeCanvasProps {
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

type MechKey = "megathrust" | "strike" | "normal";
type ModeKey = "quake" | "tsunami" | "volcano" | "liquefaction" | "wildfire";
type CamKey = "orbit" | "city" | "coast" | "crater" | "fault" | "forest";

interface SimState {
  mw: number;
  depth: number;
  slip: number;
  mech: MechKey;
  mode: ModeKey;
  activeDisaster: SimDisasterType;
  cam: CamKey;
  camLerp: number;
  run: boolean;
  night: boolean;
  sound: boolean;
  t: number;
}

// Cinematic isometric camera presets
const CAMERA_PRESETS: Record<CamKey, [[number, number, number], [number, number, number]]> = {
  orbit: [
    [26, 25, 28],
    [0, 2, 0],
  ],
  city: [
    [-6.5, 8.5, 12],
    [-12.5, 2.5, -0.5],
  ],
  coast: [
    [-0.5, 6.2, 13.5],
    [5.0, 2.2, 3.0],
  ],
  crater: [
    [17.5, 9.2, 8.5],
    [13.0, 5.0, 0.0],
  ],
  fault: [
    [-11.5, 0.5, 17.0],
    [-11.8, -0.8, 0.0],
  ],
  forest: [
    [-13.5, 9.5, 15.0],
    [-15.5, 2.2, -5.5],
  ],
};

const MODE_BY_DISASTER: Record<SimDisasterType, ModeKey> = {
  EARTHQUAKE: "quake",
  TSUNAMI: "tsunami",
  VOLCANO: "volcano",
  LIQUEFACTION: "liquefaction",
  WILDFIRE: "wildfire",
};

const MECH_BY_MECHANISM: Record<SimMechanism, MechKey> = {
  SUBDUCTION: "megathrust",
  STRIKE_SLIP: "strike",
  NORMAL: "normal",
};

const CAMERA_BY_DISASTER: Record<SimDisasterType, CamKey> = {
  EARTHQUAKE: "city",
  TSUNAMI: "coast",
  VOLCANO: "crater",
  LIQUEFACTION: "city",
  WILDFIRE: "forest",
};

interface PhysicsResult {
  e: number;
  pga: number;
  th: number;
  eta: number | null;
  fireSpreadRate: number;
  br: number;
  pw: number;
  hs: number;
}

// Rothermel Surface Fire Spread Model combined with seismic dynamics
function computePhysics(s: SimState): PhysicsResult {
  const e = Math.pow(10, 1.5 * s.mw + 4.8) / 4.184e15;
  const pga = Math.min(1.5, Math.pow(10, 0.5 * s.mw - 2.2) / (s.depth + 10));
  const th = s.mech === "megathrust" && s.depth < 70 ? s.slip * 0.4 * (s.mw / 8) * 0.25 : 0;
  const eta = th > 0 ? (150 / (Math.sqrt(9.8 * 3000) * 3.6)) * 60 : null;

  const r0 = 0.45;
  const phiWind = Math.pow(Math.max(1, s.mw - 4.0), 1.35) * 0.35;
  const phiSlope = (s.slip / 15) * 0.85;
  const fireSpreadRate = r0 * (1 + phiWind + phiSlope);

  return {
    e,
    pga,
    th,
    eta,
    fireSpreadRate,
    br: Math.min(100, pga * 75),
    pw: Math.min(100, pga * 82),
    hs: Math.min(100, pga * 88),
  };
}

const DISASTER_MODES: { id: SimDisasterType; label: string; Icon: LucideIcon }[] = [
  { id: "EARTHQUAKE", label: "Gempa", Icon: Zap },
  { id: "TSUNAMI", label: "Tsunami", Icon: Waves },
  { id: "VOLCANO", label: "Gunung Api", Icon: Mountain },
  { id: "LIQUEFACTION", label: "Likuifaksi", Icon: Droplets },
  { id: "WILDFIRE", label: "Kebakaran Hutan", Icon: Flame },
];

const CAMERA_ITEMS: { id: CamKey; label: string; Icon: LucideIcon }[] = [
  { id: "orbit", label: "Orbit Selat", Icon: Globe },
  { id: "city", label: "Kota & Gedung", Icon: Building2 },
  { id: "coast", label: "Pesisir & Jembatan", Icon: Waves },
  { id: "crater", label: "Kawah Gunung Api", Icon: Mountain },
  { id: "fault", label: "Sesar & Patahan", Icon: Zap },
  { id: "forest", label: "Hutan & Lereng", Icon: Flame },
];

// ============================================================================
// Procedural Canvas Texture Generators (High detail, zero external network downloads)
// ============================================================================

// 1. Realistic PBR-like Grass & Terrain Texture (512x512)
function createPbrGrassTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = 512;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#53733a";
  ctx.fillRect(0, 0, 512, 512);

  // Layer 1: Soil patches and earth tone variation
  for (let i = 0; i < 400; i++) {
    const v = (70 + Math.random() * 50) | 0;
    ctx.fillStyle = `rgba(${v + 15},${v + 5},${v - 20},0.28)`;
    const sz = 8 + Math.random() * 24;
    ctx.fillRect(Math.random() * 512, Math.random() * 512, sz, sz);
  }

  // Layer 2: Grass blades & fine organic grain
  for (let i = 0; i < 18000; i++) {
    const g = (85 + Math.random() * 95) | 0;
    const r = (g * 0.72) | 0;
    const b = (g * 0.42) | 0;
    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.fillRect(Math.random() * 512, Math.random() * 512, 2, 2);
  }

  // Layer 3: Lush green moss highlights
  for (let i = 0; i < 600; i++) {
    const v = (130 + Math.random() * 70) | 0;
    ctx.fillStyle = `rgba(${v - 40},${v + 15},${v - 50},0.22)`;
    ctx.beginPath();
    ctx.arc(Math.random() * 512, Math.random() * 512, 3 + Math.random() * 6, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(6, 6);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// 2. Realistic Asphalt Road with Markings (512x512)
function createAsphaltRoadTexture(type: "horizontal" | "vertical" | "bridge"): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = 512;
  const ctx = c.getContext("2d")!;

  // Base asphalt tarmac
  ctx.fillStyle = "#2c2f33";
  ctx.fillRect(0, 0, 512, 512);

  // Asphalt aggregate grain
  for (let i = 0; i < 9000; i++) {
    const v = (38 + Math.random() * 32) | 0;
    ctx.fillStyle = `rgba(${v},${v},${v + 2},0.35)`;
    ctx.fillRect(Math.random() * 512, Math.random() * 512, 2, 2);
  }

  if (type === "horizontal") {
    // Double solid yellow center divider
    ctx.fillStyle = "#f59e0b";
    ctx.fillRect(0, 251, 512, 3);
    ctx.fillRect(0, 258, 512, 3);

    // Dashed white lane dividers
    ctx.fillStyle = "#f8fafc";
    for (let x = 0; x < 512; x += 48) {
      ctx.fillRect(x + 6, 126, 24, 3);
      ctx.fillRect(x + 6, 382, 24, 3);
    }

    // Outer white shoulder lines
    ctx.fillRect(0, 18, 512, 4);
    ctx.fillRect(0, 490, 512, 4);

    // Pedestrian zebra crossings at edges
    ctx.fillStyle = "#ffffff";
    for (let y = 30; y < 482; y += 22) {
      ctx.fillRect(16, y, 22, 12);
      ctx.fillRect(474, y, 22, 12);
    }
  } else if (type === "vertical") {
    // Vertical avenue
    ctx.fillStyle = "#f59e0b";
    ctx.fillRect(251, 0, 3, 512);
    ctx.fillRect(258, 0, 3, 512);

    ctx.fillStyle = "#f8fafc";
    for (let y = 0; y < 512; y += 48) {
      ctx.fillRect(126, y + 6, 3, 24);
      ctx.fillRect(382, y + 6, 3, 24);
    }

    ctx.fillRect(18, 0, 4, 512);
    ctx.fillRect(490, 0, 4, 512);
  } else {
    // Bridge roadway (clean 4-lane with yellow center and white outer edges)
    ctx.fillStyle = "#f59e0b";
    ctx.fillRect(0, 252, 512, 4);
    ctx.fillRect(0, 258, 512, 4);

    ctx.fillStyle = "#f8fafc";
    for (let x = 0; x < 512; x += 40) {
      ctx.fillRect(x + 6, 130, 20, 3);
      ctx.fillRect(x + 6, 378, 20, 3);
    }
    ctx.fillRect(0, 14, 512, 4);
    ctx.fillRect(0, 494, 512, 4);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// 3. Sidewalk Paver Texture (256x256)
function createSidewalkTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#9ba3af";
  ctx.fillRect(0, 0, 256, 256);

  // Paver tile joints
  ctx.strokeStyle = "#7b838f";
  ctx.lineWidth = 2;
  const tileSize = 32;
  for (let x = 0; x <= 256; x += tileSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 256);
    ctx.stroke();
  }
  for (let y = 0; y <= 256; y += tileSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(256, y);
    ctx.stroke();
  }

  // Stone grain noise
  for (let i = 0; i < 2000; i++) {
    const v = (130 + Math.random() * 50) | 0;
    ctx.fillStyle = `rgba(${v},${v},${v + 5},0.25)`;
    ctx.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// 4. Architectural Building Facade Textures with PBR Mullions & Window Lights
type FacadeType = "cbd_glass" | "apartment" | "precast_office" | "residential";

function createBuildingFacadeTexture(type: FacadeType, lit: boolean): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext("2d")!;

  if (type === "cbd_glass") {
    // Glass curtain wall with steel mullions
    ctx.fillStyle = lit ? "#000000" : "#2a3b4c";
    ctx.fillRect(0, 0, 256, 256);

    const cols = 8;
    const rows = 12;
    const cw = 256 / cols;
    const rh = 256 / rows;

    for (let r = 0; r < rows; r++) {
      for (let q = 0; q < cols; q++) {
        const x = q * cw + 2;
        const y = r * rh + 2;
        const w = cw - 4;
        const h = rh - 4;

        if (lit) {
          // Night office interior glow variation (amber, warm white, cyan, or dark off)
          const seed = (r * 11 + q * 17) % 19;
          if (seed < 8) {
            ctx.fillStyle = seed % 3 === 0 ? "#ffd580" : seed % 3 === 1 ? "#fff2d6" : "#bae6fd";
            ctx.fillRect(x, y, w, h);
          } else {
            ctx.fillStyle = "#000000";
            ctx.fillRect(x, y, w, h);
          }
        } else {
          // Day glass: deep reflective blue-teal with metallic mullion frame
          ctx.fillStyle = (r + q) % 2 === 0 ? "#3b556e" : "#32485e";
          ctx.fillRect(x, y, w, h);

          // Internal reflective gradient sheen
          ctx.fillStyle = "rgba(186, 230, 253, 0.15)";
          ctx.fillRect(x, y, w, h * 0.4);

          // Steel frame outline
          ctx.strokeStyle = "#1e293b";
          ctx.lineWidth = 1;
          ctx.strokeRect(x, y, w, h);
        }
      }
    }
  } else if (type === "apartment") {
    // Residential apartment: concrete spandrels, balconies & sliding glass doors
    ctx.fillStyle = lit ? "#000000" : "#cbd5e1";
    ctx.fillRect(0, 0, 256, 256);

    const rows = 8;
    const cols = 6;
    const cw = 256 / cols;
    const rh = 256 / rows;

    for (let r = 0; r < rows; r++) {
      // Concrete floor spandrel band
      if (!lit) {
        ctx.fillStyle = "#94a3b8";
        ctx.fillRect(0, r * rh, 256, 6);
      }
      for (let q = 0; q < cols; q++) {
        const x = q * cw + 4;
        const y = r * rh + 8;
        const w = cw - 8;
        const h = rh - 10;

        if (lit) {
          const isLit = (r * 7 + q * 13) % 4 < 2;
          if (isLit) {
            ctx.fillStyle = (r + q) % 2 === 0 ? "#fef08a" : "#fed7aa";
            ctx.fillRect(x, y, w, h);
          } else {
            ctx.fillStyle = "#000000";
            ctx.fillRect(x, y, w, h);
          }
        } else {
          // Balcony opening with tinted window
          ctx.fillStyle = "#1e293b";
          ctx.fillRect(x, y, w, h);
          ctx.fillStyle = "#38bdf8";
          ctx.fillRect(x + 2, y + 2, w * 0.45, h - 4);
          ctx.fillRect(x + w * 0.52, y + 2, w * 0.45, h - 4);
        }
      }
    }
  } else if (type === "precast_office") {
    // Modern architectural precast concrete panels with punched windows
    ctx.fillStyle = lit ? "#000000" : "#e2e8f0";
    ctx.fillRect(0, 0, 256, 256);

    const rows = 10;
    const cols = 6;
    const cw = 256 / cols;
    const rh = 256 / rows;

    for (let r = 0; r < rows; r++) {
      for (let q = 0; q < cols; q++) {
        const x = q * cw + 6;
        const y = r * rh + 5;
        const w = cw - 12;
        const h = rh - 10;

        if (lit) {
          const isLit = (r * 5 + q * 9) % 3 === 0;
          ctx.fillStyle = isLit ? "#fef3c7" : "#000000";
          ctx.fillRect(x, y, w, h);
        } else {
          ctx.fillStyle = "#0f172a";
          ctx.fillRect(x, y, w, h);
          ctx.fillStyle = "#475569";
          ctx.fillRect(x + 1, y + 1, w - 2, h - 2);
          ctx.fillStyle = "rgba(224, 242, 254, 0.25)";
          ctx.fillRect(x + 2, y + 2, w - 4, (h - 4) * 0.5);
        }
      }
    }
  } else {
    // Low-rise residential / shophouse: textured render, windows & storefronts
    ctx.fillStyle = lit ? "#000000" : "#d1d5db";
    ctx.fillRect(0, 0, 256, 256);

    const rows = 5;
    const cols = 4;
    const cw = 256 / cols;
    const rh = 256 / rows;

    for (let r = 0; r < rows; r++) {
      for (let q = 0; q < cols; q++) {
        const x = q * cw + 8;
        const y = r * rh + 6;
        const w = cw - 16;
        const h = rh - 12;

        if (lit) {
          const isLit = (r * 3 + q * 7) % 2 === 0;
          ctx.fillStyle = isLit ? "#fef08a" : "#000000";
          ctx.fillRect(x, y, w, h);
        } else {
          ctx.fillStyle = "#334155";
          ctx.fillRect(x, y, w, h);
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 1;
          ctx.strokeRect(x, y, w, h);
        }
      }
    }
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// 5. Helipad & Roof Texture
function createHelipadTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const ctx = c.getContext("2d")!;

  ctx.fillStyle = "#475569";
  ctx.fillRect(0, 0, 256, 256);

  // Outer yellow safety ring
  ctx.strokeStyle = "#eab308";
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.arc(128, 128, 96, 0, Math.PI * 2);
  ctx.stroke();

  // White inner circle
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(128, 128, 80, 0, Math.PI * 2);
  ctx.stroke();

  // Bold "H" letter
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(88, 64, 18, 128);
  ctx.fillRect(150, 64, 18, 128);
  ctx.fillRect(88, 118, 80, 20);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// ============================================================================
// Component
// ============================================================================
export function ThreeEarthquakeCanvas({
  magnitude,
  depthKm,
  slipMeters,
  isSimulating,
  mechanism,
  disasterType,
  onDisasterTypeChange,
  onSimulatingChange,
}: ThreeEarthquakeCanvasProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const mountRef = useRef<HTMLDivElement>(null);
  const seismoRef = useRef<HTMLCanvasElement>(null);
  const bannerWrapRef = useRef<HTMLDivElement>(null);
  const bannerTextRef = useRef<HTMLSpanElement>(null);
  const hudTimeRef = useRef<HTMLSpanElement>(null);
  const hudPgaRef = useRef<HTMLSpanElement>(null);

  const [userCam, setUserCam] = useState<{ forDisaster: SimDisasterType; preset: CamKey } | null>(null);
  const [night, setNight] = useState(false);
  const [sound, setSound] = useState(true);

  const cam: CamKey =
    userCam && userCam.forDisaster === disasterType ? userCam.preset : CAMERA_BY_DISASTER[disasterType];

  const simRef = useRef<SimState>({
    mw: 8.8,
    depth: 15,
    slip: 18,
    mech: "megathrust",
    mode: "tsunami",
    activeDisaster: "TSUNAMI",
    cam: "coast",
    camLerp: 0,
    run: false,
    night: false,
    sound: true,
    t: 0,
  });

  const camTargetsRef = useRef({
    pos: new THREE.Vector3(...CAMERA_PRESETS.coast[0]),
    look: new THREE.Vector3(...CAMERA_PRESETS.coast[1]),
  });

  const audioApiRef = useRef<{ triggerAudio: () => void; stopSiren: () => void } | null>(null);

  useEffect(() => {
    const s = simRef.current;
    s.mw = magnitude;
    s.depth = depthKm;
    s.slip = slipMeters;
  }, [magnitude, depthKm, slipMeters]);

  useEffect(() => {
    simRef.current.mech = MECH_BY_MECHANISM[mechanism];
  }, [mechanism]);

  useEffect(() => {
    const s = simRef.current;
    s.activeDisaster = disasterType;
    s.mode = MODE_BY_DISASTER[disasterType];
    if (s.run) audioApiRef.current?.triggerAudio();
  }, [disasterType]);

  useEffect(() => {
    const s = simRef.current;
    s.cam = cam;
    s.camLerp = 2.5;
    const [p, l] = CAMERA_PRESETS[cam];
    camTargetsRef.current.pos.set(p[0], p[1], p[2]);
    camTargetsRef.current.look.set(l[0], l[1], l[2]);
  }, [cam]);

  useEffect(() => {
    const s = simRef.current;
    s.run = isSimulating;
    if (isSimulating) audioApiRef.current?.triggerAudio();
    else audioApiRef.current?.stopSiren();
  }, [isSimulating]);

  useEffect(() => {
    simRef.current.night = night;
  }, [night]);

  useEffect(() => {
    const s = simRef.current;
    s.sound = sound;
    if (!sound) audioApiRef.current?.stopSiren();
    else if (s.run) audioApiRef.current?.triggerAudio();
  }, [sound]);

  const handleReset = () => {
    const s = simRef.current;
    s.run = false;
    s.t = 0;
    audioApiRef.current?.stopSiren();
    if (hudTimeRef.current) hudTimeRef.current.textContent = "STANDBY";
    if (bannerWrapRef.current) bannerWrapRef.current.classList.add("hidden");
    onSimulatingChange(false);
  };

  const toggleRun = () => onSimulatingChange(!isSimulating);
  const toggleNight = () => setNight((v) => !v);
  const toggleSound = () => setSound((v) => !v);

  const toggleFullscreen = () => {
    const el = wrapperRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  // ============================================================================
  // Main Three.js Scene Mount Effect
  // ============================================================================
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const S = simRef.current;
    const camTargets = camTargetsRef.current;

    // ---------------- Web Audio synthesized effects ----------------
    let audioCtx: AudioContext | null = null;
    let sirenInterval: ReturnType<typeof setInterval> | null = null;

    const ensureAudio = () => {
      if (!audioCtx) {
        const AC =
          window.AudioContext ??
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (AC) audioCtx = new AC();
      }
      if (audioCtx && audioCtx.state === "suspended") {
        audioCtx.resume().catch(() => {});
      }
    };

    const playEarthquakeRumble = (duration = 5.0) => {
      if (!S.sound) return;
      ensureAudio();
      if (!audioCtx) return;
      const bufferSize = audioCtx.sampleRate * duration;
      const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
      const data = buffer.getChannelData(0);
      let lastOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        data[i] = (lastOut + 0.03 * white) / 1.03;
        lastOut = data[i];
        data[i] *= 2.8;
      }
      const noise = audioCtx.createBufferSource();
      noise.buffer = buffer;
      const filter = audioCtx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 95;
      const gain = audioCtx.createGain();
      gain.gain.setValueAtTime(0.25, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(audioCtx.destination);
      noise.start();
    };

    const playTsunamiSurge = (duration = 6.0) => {
      if (!S.sound) return;
      ensureAudio();
      if (!audioCtx) return;
      const bufferSize = audioCtx.sampleRate * duration;
      const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * 0.5;
      }
      const noise = audioCtx.createBufferSource();
      noise.buffer = buffer;
      const filter = audioCtx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(220, audioCtx.currentTime);
      filter.frequency.linearRampToValueAtTime(480, audioCtx.currentTime + duration * 0.6);
      const gain = audioCtx.createGain();
      gain.gain.setValueAtTime(0.02, audioCtx.currentTime);
      gain.gain.linearRampToValueAtTime(0.18, audioCtx.currentTime + duration * 0.4);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(audioCtx.destination);
      noise.start();
    };

    const playVolcanoBlast = (duration = 5.0) => {
      playEarthquakeRumble(duration);
      playTsunamiSurge(duration * 0.8);
    };

    const playTransformerSparks = () => {
      if (!S.sound) return;
      ensureAudio();
      if (!audioCtx) return;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(140, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(55, audioCtx.currentTime + 0.45);
      gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.005, audioCtx.currentTime + 0.45);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.45);
    };

    const stopEmergencySiren = () => {
      if (sirenInterval) {
        clearInterval(sirenInterval);
        sirenInterval = null;
      }
    };

    const startEmergencySiren = () => {
      stopEmergencySiren();
      if (!S.sound) return;
      ensureAudio();
      if (!audioCtx) return;
      const ctx = audioCtx;
      const pulseSiren = () => {
        if (!S.run || !S.sound) return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(580, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(880, ctx.currentTime + 0.9);
        osc.frequency.linearRampToValueAtTime(580, ctx.currentTime + 1.8);
        gain.gain.setValueAtTime(0.04, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.005, ctx.currentTime + 1.8);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 1.8);
      };
      pulseSiren();
      sirenInterval = setInterval(pulseSiren, 2200);
    };

    const triggerDisasterAudio = () => {
      if (!S.run || !S.sound) {
        stopEmergencySiren();
        return;
      }
      if (S.activeDisaster === "VOLCANO") {
        playVolcanoBlast(5.0);
      } else if (S.activeDisaster === "TSUNAMI") {
        playTsunamiSurge(6.5);
        playEarthquakeRumble(5.0);
        startEmergencySiren();
      } else if (S.activeDisaster === "EARTHQUAKE") {
        playEarthquakeRumble(5.0);
        setTimeout(() => playTransformerSparks(), 1400);
        if (S.mw >= 7.0) startEmergencySiren();
      } else if (S.activeDisaster === "LIQUEFACTION") {
        playEarthquakeRumble(6.0);
      } else if (S.activeDisaster === "WILDFIRE") {
        playTransformerSparks();
        playTsunamiSurge(5.0);
        startEmergencySiren();
      }
    };

    audioApiRef.current = { triggerAudio: triggerDisasterAudio, stopSiren: stopEmergencySiren };

    // ---------------- Renderer, Scene, Camera, Controls ----------------
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(46, container.clientWidth / container.clientHeight, 0.1, 400);
    camera.position.set(...CAMERA_PRESETS.coast[0]);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 - 0.02;
    controls.minDistance = 6;
    controls.maxDistance = 160;
    controls.target.set(...CAMERA_PRESETS.coast[1]);

    // ---------------- Lighting Rig ----------------
    const hemiLight = new THREE.HemisphereLight(0x90caf9, 0x4a5d3f, 1.1);
    const sunLight = new THREE.DirectionalLight(0xfff8e7, 1.6);
    sunLight.position.set(18, 30, 14);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.set(4096, 4096);
    Object.assign(sunLight.shadow.camera, {
      left: -50,
      right: 50,
      top: 50,
      bottom: -50,
      near: 0.5,
      far: 120,
    });
    sunLight.shadow.bias = -0.0003;
    sunLight.shadow.radius = 2.5;

    const fillLight = new THREE.DirectionalLight(0xbae6fd, 0.45);
    fillLight.position.set(-20, 15, -15);

    const backRimLight = new THREE.DirectionalLight(0xfef08a, 0.25);
    backRimLight.position.set(5, 8, -25);

    scene.add(hemiLight, sunLight, fillLight, backRimLight);

    const world = new THREE.Group();
    scene.add(world);

    // Helper material function
    const mat = (c: number, o: Partial<THREE.MeshStandardMaterialParameters> = {}) =>
      new THREE.MeshStandardMaterial({ color: c, roughness: 0.8, ...o });

    // ---------------- Procedural Textures Init ----------------
    const grassTex = createPbrGrassTexture();
    const roadHTex = createAsphaltRoadTexture("horizontal");
    const roadVTex = createAsphaltRoadTexture("vertical");
    const bridgeRoadTex = createAsphaltRoadTexture("bridge");
    const sidewalkTex = createSidewalkTexture();
    const helipadTex = createHelipadTexture();

    // Facade materials
    const facadeTypes: FacadeType[] = ["cbd_glass", "apartment", "precast_office", "residential"];
    const facadeMats = facadeTypes.map((t) => {
      const dayTex = createBuildingFacadeTexture(t, false);
      const nightTex = createBuildingFacadeTexture(t, true);
      return mat(0xffffff, {
        map: dayTex,
        roughness: t === "cbd_glass" ? 0.2 : 0.75,
        metalness: t === "cbd_glass" ? 0.5 : 0.1,
        emissive: 0xffffff,
        emissiveMap: nightTex,
        emissiveIntensity: 0,
      });
    });

    const roofMat = mat(0x475569, { roughness: 0.9 });
    const concreteMat = mat(0x94a3b8, { roughness: 0.75 });
    const metalMat = mat(0xe2e8f0, { metalness: 0.85, roughness: 0.25 });
    const darkMetalMat = mat(0x1e293b, { metalness: 0.6, roughness: 0.4 });

    // ============================================================================
    // 1. TERRAIN & GEOLOGY (Kota Barat, Pantai Landai & Dasar Laut)
    // ============================================================================
    // Main city ground slab (X: -22 s/d -2.5)
    const groundGeo = new THREE.BoxGeometry(19.5, 1.0, 30);
    const ground = new THREE.Mesh(groundGeo, mat(0x658245, { map: grassTex, roughness: 0.88 }));
    ground.position.set(-12.25, -0.5, 0);
    ground.receiveShadow = true;
    world.add(ground);

    // Natural sloping sandy beach (X: -2.5 s/d 0.0)
    const beachGeo = new THREE.PlaneGeometry(2.5, 30, 16, 32);
    beachGeo.rotateX(-Math.PI / 2);
    const bPos = beachGeo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < bPos.count; i++) {
      const bx = bPos.getX(i);
      // Slope from land level (y = 0.0) at bx = -1.25 down to underwater (y = -0.45) at bx = 1.25
      const slope = (bx + 1.25) / 2.5;
      bPos.setY(i, -0.02 - slope * 0.42);
    }
    beachGeo.computeVertexNormals();
    const beach = new THREE.Mesh(beachGeo, mat(0xdcc59b, { roughness: 0.6, metalness: 0.1 }));
    beach.position.set(-1.25, 0, 0);
    beach.receiveShadow = true;
    world.add(beach);

    // Sub-surface geological strata
    const geologicalLayer = new THREE.Mesh(new THREE.BoxGeometry(19.5, 1.2, 30), mat(0x991b1b));
    geologicalLayer.position.set(-12.25, -1.6, 0);
    world.add(geologicalLayer);

    const tectonicBedrock = new THREE.Mesh(new THREE.BoxGeometry(19.5, 6, 30), mat(0x1e293b));
    tectonicBedrock.position.set(-12.25, -5.2, 0);
    world.add(tectonicBedrock);

    // Deep seabed with underwater relief
    const seabedGeo = new THREE.PlaneGeometry(32, 32, 32, 32);
    seabedGeo.rotateX(-Math.PI / 2);
    const sbPos = seabedGeo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < sbPos.count; i++) {
      const sx = sbPos.getX(i);
      const sz = sbPos.getZ(i);
      const depth = -4.5 + Math.sin(sx * 0.2 + sz * 0.15) * 0.6;
      sbPos.setY(i, depth);
    }
    seabedGeo.computeVertexNormals();
    const seabed = new THREE.Mesh(seabedGeo, mat(0x0f172a, { roughness: 0.95 }));
    seabed.position.set(13.5, 0, 0);
    seabed.receiveShadow = true;
    world.add(seabed);

    // Coastal seawall protecting promenade
    const seawall = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.4, 30), mat(0x64748b, { roughness: 0.85 }));
    seawall.position.set(-2.5, 0.18, 0);
    seawall.receiveShadow = seawall.castShadow = true;
    world.add(seawall);

    // ============================================================================
    // 2. URBAN STREET NETWORK, SIDEWALKS & STREET LIGHTING
    // ============================================================================
    // Coastal Highway (Runs N-S along the shore, directly feeding bridge approach)
    const coastalAvenue = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 30), mat(0xffffff, { map: roadVTex, roughness: 0.9 }));
    coastalAvenue.rotation.x = -Math.PI / 2;
    coastalAvenue.position.set(-3.5, 0.02, 0);
    coastalAvenue.receiveShadow = true;
    world.add(coastalAvenue);

    // Inland Main Avenues (Horizontal, East-West)
    const roadGridMat = mat(0xffffff, { map: roadHTex, roughness: 0.9 });
    const avenueZ = [-9.5, -4.5, 0.5, 5.5, 10.5];
    avenueZ.forEach((z) => {
      const road = new THREE.Mesh(new THREE.PlaneGeometry(17.5, 1.4), roadGridMat);
      road.rotation.x = -Math.PI / 2;
      road.position.set(-13.0, 0.02, z);
      road.receiveShadow = true;
      world.add(road);
    });

    // Cross Streets (Vertical, North-South)
    const crossStreetX = [-19.5, -15.5, -11.5, -7.5];
    crossStreetX.forEach((x) => {
      const road = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 30), mat(0xffffff, { map: roadVTex, roughness: 0.9 }));
      road.rotation.x = -Math.PI / 2;
      road.position.set(x, 0.02, 0);
      road.receiveShadow = true;
      world.add(road);
    });

    // Elevated concrete sidewalks along streets
    const swMaterial = mat(0xffffff, { map: sidewalkTex, roughness: 0.95 });
    const sidewalkBlocks = [
      { x: -5.0, z: -7.0, w: 1.8, d: 3.2 },
      { x: -9.5, z: -7.0, w: 2.2, d: 3.2 },
      { x: -13.5, z: -7.0, w: 2.2, d: 3.2 },
      { x: -17.5, z: -7.0, w: 2.2, d: 3.2 },
      { x: -5.0, z: -2.0, w: 1.8, d: 3.2 },
      { x: -9.5, z: -2.0, w: 2.2, d: 3.2 },
      { x: -13.5, z: -2.0, w: 2.2, d: 3.2 },
      { x: -17.5, z: -2.0, w: 2.2, d: 3.2 },
      { x: -5.0, z: 3.0, w: 1.8, d: 3.2 },
      { x: -9.5, z: 3.0, w: 2.2, d: 3.2 },
      { x: -13.5, z: 3.0, w: 2.2, d: 3.2 },
      { x: -17.5, z: 3.0, w: 2.2, d: 3.2 },
      { x: -5.0, z: 8.0, w: 1.8, d: 3.2 },
      { x: -9.5, z: 8.0, w: 2.2, d: 3.2 },
      { x: -13.5, z: 8.0, w: 2.2, d: 3.2 },
      { x: -17.5, z: 8.0, w: 2.2, d: 3.2 },
    ];

    sidewalkBlocks.forEach((b) => {
      const sw = new THREE.Mesh(new THREE.BoxGeometry(b.w, 0.07, b.d), swMaterial);
      sw.position.set(b.x, 0.035, b.z);
      sw.receiveShadow = true;
      world.add(sw);
    });

    // Realistic Modern Curved Street Lamps
    const streetLampsGroup = new THREE.Group();
    world.add(streetLampsGroup);
    const lampLightList: THREE.PointLight[] = [];

    const addStreetLamp = (x: number, z: number, rotY = 0) => {
      const lampG = new THREE.Group();
      lampG.position.set(x, 0.07, z);
      lampG.rotation.y = rotY;

      // Pole
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.03, 1.2, 8), darkMetalMat);
      pole.position.y = 0.6;
      lampG.add(pole);

      // Curved arm
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.35, 6), darkMetalMat);
      arm.rotation.z = Math.PI / 3;
      arm.position.set(0.12, 1.25, 0);
      lampG.add(arm);

      // Luminaire head
      const lum = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.04, 0.06), metalMat);
      lum.position.set(0.24, 1.34, 0);
      lampG.add(lum);

      // Glowing lens
      const lens = new THREE.Mesh(
        new THREE.BoxGeometry(0.1, 0.01, 0.04),
        new THREE.MeshBasicMaterial({ color: 0xffedd5 })
      );
      lens.position.set(0.24, 1.31, 0);
      lampG.add(lens);

      const pl = new THREE.PointLight(0xffeed9, 0, 8);
      pl.position.set(0.24, 1.28, 0);
      lampG.add(pl);
      lampLightList.push(pl);

      streetLampsGroup.add(lampG);
    };

    [-9.5, -4.5, 0.5, 5.5, 10.5].forEach((z) => {
      addStreetLamp(-4.2, z + 0.9, 0);
      addStreetLamp(-10.2, z + 0.9, 0);
      addStreetLamp(-16.2, z + 0.9, 0);
    });

    // ============================================================================
    // 3. REALISTIC DETAILED VEHICLES (Cars, SUVs, Buses & Emergency Vehicles)
    // ============================================================================
    interface VehicleInfo {
      group: THREE.Group;
      baseX: number;
      baseZ: number;
      speed: number;
      dir: number; // 1 or -1
      axis: "x" | "z";
      isEmergency?: boolean;
      beaconLight?: THREE.PointLight;
    }

    const vehicles: VehicleInfo[] = [];
    const vehicleCarColors = [0xef4444, 0x3b82f6, 0xf8fafc, 0x1e293b, 0x64748b, 0xf59e0b];

    const createVehicleMesh = (type: "car" | "suv" | "bus" | "ambulance") => {
      const g = new THREE.Group();
      let length = 0.7;
      let width = 0.35;
      let height = 0.25;
      let color = vehicleCarColors[(Math.random() * vehicleCarColors.length) | 0];

      if (type === "bus") {
        length = 1.3;
        width = 0.42;
        height = 0.4;
        color = 0x0284c7;
      } else if (type === "ambulance") {
        length = 0.85;
        width = 0.38;
        height = 0.36;
        color = 0xffffff;
      } else if (type === "suv") {
        length = 0.78;
        width = 0.38;
        height = 0.32;
      }

      // Chassis body
      const bodyMat = mat(color, { metalness: 0.7, roughness: 0.3 });
      const body = new THREE.Mesh(new THREE.BoxGeometry(length, height * 0.55, width), bodyMat);
      body.position.y = height * 0.35;
      body.castShadow = true;
      g.add(body);

      // Cabin / Greenhouse
      const glassMat = mat(0x0f172a, { roughness: 0.1, metalness: 0.9 });
      const cabinLen = type === "bus" ? length * 0.92 : length * 0.55;
      const cabin = new THREE.Mesh(new THREE.BoxGeometry(cabinLen, height * 0.55, width * 0.88), glassMat);
      cabin.position.set(type === "bus" ? 0 : -length * 0.05, height * 0.75, 0);
      cabin.castShadow = true;
      g.add(cabin);

      // Wheels
      const wheelMat = mat(0x18181b, { roughness: 0.9 });
      const wheelGeo = new THREE.CylinderGeometry(0.065, 0.065, 0.05, 8);
      wheelGeo.rotateX(Math.PI / 2);
      const wheelXOffsets = type === "bus" ? [-0.45, 0.45] : [-length * 0.28, length * 0.28];

      wheelXOffsets.forEach((wx) => {
        const w1 = new THREE.Mesh(wheelGeo, wheelMat);
        w1.position.set(wx, 0.065, width * 0.48);
        const w2 = new THREE.Mesh(wheelGeo, wheelMat);
        w2.position.set(wx, 0.065, -width * 0.48);
        g.add(w1, w2);
      });

      // Headlights & Taillights
      const headMat = new THREE.MeshBasicMaterial({ color: 0xffedd5 });
      const tailMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
      const hl = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.04, 0.08), headMat);
      hl.position.set(length * 0.5, height * 0.35, width * 0.25);
      const hr = hl.clone();
      hr.position.z = -width * 0.25;
      const tl = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.04, 0.08), tailMat);
      tl.position.set(-length * 0.5, height * 0.35, width * 0.25);
      const tr = tl.clone();
      tr.position.z = -width * 0.25;
      g.add(hl, hr, tl, tr);

      // Ambulance Lightbar
      if (type === "ambulance") {
        const redCross = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.04, 0.02), new THREE.MeshBasicMaterial({ color: 0xdc2626 }));
        redCross.position.set(0, height * 0.6, width * 0.46);
        g.add(redCross);

        const bar = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.05, 0.22), new THREE.MeshBasicMaterial({ color: 0xef4444 }));
        bar.position.set(0, height * 1.08, 0);
        g.add(bar);

        const emLight = new THREE.PointLight(0xef4444, 0, 6);
        emLight.position.set(0, height * 1.2, 0);
        g.add(emLight);
        return { group: g, isEmergency: true, beaconLight: emLight };
      }

      return { group: g, isEmergency: false };
    };

    // Spawn vehicles on roads & bridge
    const spawnVehicles = () => {
      // Avenue traffic
      for (let i = 0; i < 8; i++) {
        const vType = i === 0 ? "ambulance" : i % 3 === 0 ? "bus" : i % 2 === 0 ? "suv" : "car";
        const v = createVehicleMesh(vType);
        const z = avenueZ[i % avenueZ.length] + (i % 2 === 0 ? 0.35 : -0.35);
        const startX = -20 + Math.random() * 15;
        v.group.position.set(startX, 0.03, z);
        if (i % 2 !== 0) v.group.rotation.y = Math.PI;
        world.add(v.group);
        vehicles.push({
          group: v.group,
          baseX: startX,
          baseZ: z,
          speed: 1.2 + Math.random() * 0.8,
          dir: i % 2 === 0 ? 1 : -1,
          axis: "x",
          isEmergency: v.isEmergency,
          beaconLight: v.beaconLight,
        });
      }

      // Coastal highway traffic
      for (let i = 0; i < 4; i++) {
        const v = createVehicleMesh(i === 1 ? "suv" : "car");
        const x = -3.5 + (i % 2 === 0 ? 0.38 : -0.38);
        const startZ = -12 + i * 6;
        v.group.position.set(x, 0.03, startZ);
        v.group.rotation.y = i % 2 === 0 ? Math.PI / 2 : -Math.PI / 2;
        world.add(v.group);
        vehicles.push({
          group: v.group,
          baseX: x,
          baseZ: startZ,
          speed: 1.5 + Math.random() * 0.6,
          dir: i % 2 === 0 ? 1 : -1,
          axis: "z",
          isEmergency: v.isEmergency,
          beaconLight: v.beaconLight,
        });
      }
    };
    spawnVehicles();

    // ============================================================================
    // 4. ARCHITECTURAL CITY BUILDINGS (Skyscrapers, Condos, Apartments & Townhomes)
    // ============================================================================
    interface BuildingMeta {
      mesh: THREE.Group;
      baseX: number;
      baseZ: number;
      baseY: number;
      height: number;
      type: "cbd" | "apartment" | "residential";
      phase: number;
      roofProps: THREE.Object3D[];
    }

    const buildingList: BuildingMeta[] = [];
    const cityGroup = new THREE.Group();
    world.add(cityGroup);

    // Architectural building builder
    const createArchitecturalBuilding = (
      type: "cbd" | "apartment" | "residential",
      x: number,
      z: number,
      width: number,
      depth: number,
      height: number
    ): BuildingMeta => {
      const bGroup = new THREE.Group();
      bGroup.position.set(x, 0, z);
      const roofProps: THREE.Object3D[] = [];

      const facadeIndex =
        type === "cbd" ? 0 : type === "apartment" ? (Math.random() < 0.5 ? 1 : 2) : 3;
      const bMat = facadeMats[facadeIndex];

      if (type === "cbd") {
        // --- High-Rise CBD Commercial Tower with Tiered Setbacks & Glass Crown ---
        const tier1H = height * 0.55;
        const tier1 = new THREE.Mesh(new THREE.BoxGeometry(width, tier1H, depth), [
          bMat, bMat, roofMat, concreteMat, bMat, bMat
        ]);
        tier1.position.y = tier1H / 2;
        tier1.castShadow = tier1.receiveShadow = true;
        bGroup.add(tier1);

        // Tier 2 (Setback)
        const tier2W = width * 0.82;
        const tier2D = depth * 0.82;
        const tier2H = height * 0.35;
        const tier2 = new THREE.Mesh(new THREE.BoxGeometry(tier2W, tier2H, tier2D), [
          bMat, bMat, roofMat, roofMat, bMat, bMat
        ]);
        tier2.position.y = tier1H + tier2H / 2;
        tier2.castShadow = true;
        bGroup.add(tier2);

        // Tier 3 (Glass Crown / Mechanical Penthouse)
        const crownH = height * 0.1;
        const crown = new THREE.Mesh(new THREE.BoxGeometry(tier2W * 0.65, crownH, tier2D * 0.65), metalMat);
        crown.position.y = tier1H + tier2H + crownH / 2;
        crown.castShadow = true;
        bGroup.add(crown);

        // Helipad on top of Tier 1 or Tier 2
        if (width > 1.2) {
          const heli = new THREE.Mesh(
            new THREE.PlaneGeometry(tier2W * 0.7, tier2D * 0.7),
            mat(0xffffff, { map: helipadTex, roughness: 0.9 })
          );
          heli.rotation.x = -Math.PI / 2;
          heli.position.set(0, tier1H + 0.02, 0);
          bGroup.add(heli);
        }

        // Rooftop Communications Mast with red flashing beacon
        const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.04, 1.4, 6), metalMat);
        mast.position.set(0, height + 0.7, 0);
        bGroup.add(mast);

        const beacon = new THREE.Mesh(
          new THREE.SphereGeometry(0.04, 6, 6),
          new THREE.MeshBasicMaterial({ color: 0xef4444 })
        );
        beacon.position.set(0, height + 1.4, 0);
        bGroup.add(beacon);
        roofProps.push(beacon);

        // Ground-level double-height entrance lobby & canopy
        const canopy = new THREE.Mesh(new THREE.BoxGeometry(width * 0.5, 0.05, 0.4), darkMetalMat);
        canopy.position.set(0, 0.4, depth / 2 + 0.2);
        bGroup.add(canopy);

      } else if (type === "apartment") {
        // --- Multi-Story Residential Apartment Block with 3D Balconies ---
        const main = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), [
          bMat, bMat, roofMat, concreteMat, bMat, bMat
        ]);
        main.position.y = height / 2;
        main.castShadow = main.receiveShadow = true;
        bGroup.add(main);

        // Tiered 3D Balconies on front and back
        const floors = Math.max(2, Math.floor(height / 0.65));
        const balcMat = mat(0x94a3b8, { roughness: 0.7 });
        const balcGlassMat = mat(0x38bdf8, { roughness: 0.2, metalness: 0.8, transparent: true, opacity: 0.7 });

        for (let f = 1; f < floors; f++) {
          const by = f * 0.65;
          // Front balcony slab
          const slabF = new THREE.Mesh(new THREE.BoxGeometry(width * 0.85, 0.05, 0.3), balcMat);
          slabF.position.set(0, by, depth / 2 + 0.15);
          // Front glass railing
          const railF = new THREE.Mesh(new THREE.BoxGeometry(width * 0.85, 0.18, 0.02), balcGlassMat);
          railF.position.set(0, by + 0.1, depth / 2 + 0.29);
          bGroup.add(slabF, railF);
        }

        // Rooftop water tank & elevator shaft
        const shaft = new THREE.Mesh(new THREE.BoxGeometry(width * 0.35, 0.45, depth * 0.35), concreteMat);
        shaft.position.set(-width * 0.2, height + 0.22, 0);
        shaft.castShadow = true;
        bGroup.add(shaft);

        const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.3, 12), metalMat);
        tank.position.set(width * 0.22, height + 0.25, 0);
        bGroup.add(tank);
        roofProps.push(shaft, tank);

      } else {
        // --- Low-Rise Residential Townhouse / Shophouse ---
        const main = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), [
          bMat, bMat, roofMat, concreteMat, bMat, bMat
        ]);
        main.position.y = height / 2;
        main.castShadow = true;
        bGroup.add(main);

        // Pitched roof
        const roofGeo = new THREE.ConeGeometry(Math.max(width, depth) * 0.75, 0.55, 4);
        roofGeo.rotateY(Math.PI / 4);
        const roofPitched = new THREE.Mesh(roofGeo, mat(0xb91c1c, { roughness: 0.8 }));
        roofPitched.position.y = height + 0.27;
        bGroup.add(roofPitched);
        roofProps.push(roofPitched);
      }

      cityGroup.add(bGroup);

      return {
        mesh: bGroup,
        baseX: x,
        baseZ: z,
        baseY: 0,
        height,
        type,
        phase: Math.random() * Math.PI * 2,
        roofProps,
      };
    };

    // Generate balanced urban districts
    // District A: High-Density CBD Financial Core (Skyscrapers)
    const cbdPositions = [
      { x: -5.0, z: -7.0, w: 1.5, d: 1.5, h: 7.5 },
      { x: -9.5, z: -7.0, w: 1.8, d: 1.6, h: 9.2 },
      { x: -13.5, z: -7.0, w: 1.6, d: 1.6, h: 8.4 },
      { x: -5.0, z: -2.0, w: 1.6, d: 1.5, h: 8.8 },
      { x: -9.5, z: -2.0, w: 1.9, d: 1.8, h: 10.5 }, // Central Landmark Spire
      { x: -13.5, z: -2.0, w: 1.6, d: 1.5, h: 8.0 },
      { x: -5.0, z: 3.0, w: 1.5, d: 1.5, h: 6.8 },
      { x: -9.5, z: 3.0, w: 1.7, d: 1.6, h: 8.5 },
    ];

    cbdPositions.forEach((p) => {
      buildingList.push(createArchitecturalBuilding("cbd", p.x, p.z, p.w, p.d, p.h));
    });

    // District B: Mid-Rise Apartments & Condos
    const aptPositions = [
      { x: -5.0, z: 8.0, w: 1.5, d: 1.4, h: 4.8 },
      { x: -9.5, z: 8.0, w: 1.7, d: 1.5, h: 5.5 },
      { x: -13.5, z: 3.0, w: 1.6, d: 1.4, h: 5.2 },
      { x: -13.5, z: 8.0, w: 1.5, d: 1.4, h: 4.6 },
      { x: -5.0, z: 12.0, w: 1.4, d: 1.4, h: 4.2 },
      { x: -9.5, z: 12.0, w: 1.6, d: 1.4, h: 4.8 },
      { x: -13.5, z: 12.0, w: 1.5, d: 1.4, h: 4.5 },
      { x: -5.0, z: -11.5, w: 1.4, d: 1.4, h: 4.2 },
      { x: -9.5, z: -11.5, w: 1.6, d: 1.5, h: 4.9 },
    ];

    aptPositions.forEach((p) => {
      buildingList.push(createArchitecturalBuilding("apartment", p.x, p.z, p.w, p.d, p.h));
    });

    // District C: Low-Rise Residential & Suburban Foothills
    const resPositions = [
      { x: -17.5, z: -7.0, w: 1.4, d: 1.4, h: 2.2 },
      { x: -17.5, z: -2.0, w: 1.4, d: 1.4, h: 2.6 },
      { x: -17.5, z: 3.0, w: 1.4, d: 1.4, h: 2.4 },
      { x: -17.5, z: 8.0, w: 1.4, d: 1.4, h: 2.2 },
      { x: -17.5, z: 12.0, w: 1.4, d: 1.4, h: 2.0 },
      { x: -17.5, z: -11.5, w: 1.4, d: 1.4, h: 2.0 },
    ];

    resPositions.forEach((p) => {
      buildingList.push(createArchitecturalBuilding("residential", p.x, p.z, p.w, p.d, p.h));
    });

    // ============================================================================
    // 5. NATURAL MOUNTAINOUS BACKDROP & TERRAIN (Lereng Pegunungan Alami)
    // ============================================================================
    const mountainMeshes: THREE.Mesh[] = [];
    const mountainGroup = new THREE.Group();
    world.add(mountainGroup);

    // Realistic multi-peak continental ridge generated via heightfield synthesis
    const mtnGeo = new THREE.PlaneGeometry(30, 14, 48, 28);
    mtnGeo.rotateX(-Math.PI / 2);
    const mPos = mtnGeo.attributes.position as THREE.BufferAttribute;
    const mColors = new Float32Array(mPos.count * 3);

    for (let i = 0; i < mPos.count; i++) {
      const mx = mPos.getX(i);
      const mz = mPos.getZ(i);

      // Procedural mountain ridge equations (layered harmonics)
      const distFromCenter = Math.abs(mx) / 15;
      const primaryRidge = Math.exp(-Math.pow((mz + 3) / 3.8, 2)) * 6.8;
      const noise1 = Math.sin(mx * 0.45 + mz * 0.6) * 1.4;
      const noise2 = Math.cos(mx * 0.9 - mz * 0.8) * 0.8;
      const noise3 = Math.sin(mx * 1.8 + mz * 1.5) * 0.35;

      let my = Math.max(0, primaryRidge * (1 - distFromCenter * 0.4) + noise1 + noise2 + noise3);
      if (mz > 3) my *= Math.max(0, (7 - mz) / 4); // taper into city edge

      mPos.setY(i, my);

      // Stratified geological elevation colors:
      // lush green forest at foot -> dark rocky crags -> snow-dusted alpine summits
      const tHeight = Math.min(1, Math.max(0, my / 7.5));
      let r = 0.28, g = 0.42, b = 0.22; // forest base
      if (tHeight > 0.35 && tHeight <= 0.72) {
        // Exposed rock crags
        const rt = (tHeight - 0.35) / 0.37;
        r = THREE.MathUtils.lerp(0.32, 0.45, rt);
        g = THREE.MathUtils.lerp(0.36, 0.42, rt);
        b = THREE.MathUtils.lerp(0.32, 0.40, rt);
      } else if (tHeight > 0.72) {
        // Alpine snow cap
        const st = (tHeight - 0.72) / 0.28;
        r = THREE.MathUtils.lerp(0.45, 0.94, st);
        g = THREE.MathUtils.lerp(0.42, 0.96, st);
        b = THREE.MathUtils.lerp(0.40, 0.98, st);
      }

      mColors[i * 3] = r;
      mColors[i * 3 + 1] = g;
      mColors[i * 3 + 2] = b;
    }

    mtnGeo.setAttribute("color", new THREE.BufferAttribute(mColors, 3));
    mtnGeo.computeVertexNormals();

    const mtnMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.9,
      metalness: 0.05,
      flatShading: false,
    });
    const mountainRidge = new THREE.Mesh(mtnGeo, mtnMat);
    mountainRidge.position.set(-12.5, 0, -18.0);
    mountainRidge.castShadow = mountainRidge.receiveShadow = true;
    mountainGroup.add(mountainRidge);
    mountainMeshes.push(mountainRidge);

    // Dynamic fire light for wildfire simulation
    const fireLight = new THREE.PointLight(0xff5500, 0, 30);
    fireLight.position.set(-16, 3.5, -8);
    world.add(fireLight);

    // ============================================================================
    // 6. REALISTIC VEGETATION (Deciduous Trees, Pines, Coastal Palms & Shrubs)
    // ============================================================================
    interface VegData {
      group: THREE.Group;
      x: number;
      z: number;
      scale: number;
      type: "tree" | "pine" | "palm";
      distFromIgnition: number;
      foliageMeshes: THREE.Mesh[];
      trunkMesh: THREE.Mesh;
    }

    const vegetationList: VegData[] = [];
    const vegGroup = new THREE.Group();
    world.add(vegGroup);

    const trunkMat = mat(0x4a3525, { roughness: 0.9 });
    const leafColors = [0x2e6930, 0x3b823e, 0x245828, 0x4d964f];
    const palmFrondColor = 0x2d7a36;

    // Organic Deciduous Tree with fluffy multi-cluster canopy
    const createDeciduousTree = (x: number, z: number, s: number): VegData => {
      const tg = new THREE.Group();
      tg.position.set(x, 0, z);
      tg.scale.set(s, s, s);

      // Curved woody trunk
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.14, 0.9, 7), trunkMat);
      trunk.position.y = 0.45;
      trunk.castShadow = true;
      tg.add(trunk);

      // Multi-cluster foliage canopy
      const fMeshes: THREE.Mesh[] = [];
      const col = leafColors[(Math.random() * leafColors.length) | 0];
      const folMat = mat(col, { roughness: 0.85 });

      const clusterOffsets = [
        [0, 1.15, 0, 0.48],
        [-0.22, 1.0, 0.18, 0.38],
        [0.24, 0.98, -0.16, 0.36],
        [0.15, 1.35, 0.12, 0.32],
      ];

      clusterOffsets.forEach(([ox, oy, oz, rad]) => {
        const sphere = new THREE.Mesh(new THREE.DodecahedronGeometry(rad, 1), folMat);
        sphere.position.set(ox, oy, oz);
        sphere.castShadow = true;
        tg.add(sphere);
        fMeshes.push(sphere);
      });

      vegGroup.add(tg);

      const dx = x - (-20.0);
      const dz = z - (-12.0);
      return {
        group: tg,
        x,
        z,
        scale: s,
        type: "tree",
        distFromIgnition: Math.sqrt(dx * dx + dz * dz),
        foliageMeshes: fMeshes,
        trunkMesh: trunk,
      };
    };

    // Coastal Palm Tree (Along Coastal Promenade & Beach)
    const createPalmTree = (x: number, z: number, s: number): VegData => {
      const tg = new THREE.Group();
      tg.position.set(x, 0, z);
      tg.scale.set(s, s, s);

      // Slender curved trunk
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 1.4, 6), mat(0x6b5344, { roughness: 0.9 }));
      trunk.position.y = 0.7;
      trunk.rotation.z = 0.08;
      trunk.castShadow = true;
      tg.add(trunk);

      // Arching palm fronds
      const fMeshes: THREE.Mesh[] = [];
      const frondMat = mat(palmFrondColor, { roughness: 0.7 });
      const numFronds = 6;
      for (let i = 0; i < numFronds; i++) {
        const frond = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.85, 4), frondMat);
        frond.rotation.z = Math.PI / 2.6;
        frond.rotation.y = (i * Math.PI * 2) / numFronds;
        frond.position.set(0, 1.38, 0);
        frond.castShadow = true;
        tg.add(frond);
        fMeshes.push(frond);
      }

      vegGroup.add(tg);

      const dx = x - (-20.0);
      const dz = z - (-12.0);
      return {
        group: tg,
        x,
        z,
        scale: s,
        type: "palm",
        distFromIgnition: Math.sqrt(dx * dx + dz * dz),
        foliageMeshes: fMeshes,
        trunkMesh: trunk,
      };
    };

    // Spawn Palm Trees along coastal boulevard
    for (let z = -12; z <= 12; z += 2.2) {
      vegetationList.push(createPalmTree(-2.7, z, 0.85 + Math.random() * 0.25));
    }

    // Spawn Forest & Hillside Deciduous Trees
    for (let i = 0; i < 55; i++) {
      const tx = -21.5 + Math.random() * 18.0;
      const tz = -14.5 + Math.random() * 28.0;
      // Keep clear of CBD buildings and roads
      if (tx > -16.0 && tx < -4.0 && tz > -8.5 && tz < 6.5) continue;
      const scale = 0.75 + Math.random() * 0.65;
      vegetationList.push(createDeciduousTree(tx, tz, scale));
    }

    // ============================================================================
    // 7. REALISTIC VOLCANIC ISLAND & CRATER (Stratovolcano Krakatau)
    // ============================================================================
    const volcanoGroup = new THREE.Group();
    volcanoGroup.position.set(13.0, 0, 0);
    world.add(volcanoGroup);

    // Island base emerging from seabed
    const volcanoIslandBase = new THREE.Mesh(
      new THREE.CylinderGeometry(6.6, 8.4, 1.4, 36),
      mat(0x27272a, { roughness: 0.95 })
    );
    volcanoIslandBase.position.y = -0.2;
    volcanoIslandBase.receiveShadow = true;
    volcanoGroup.add(volcanoIslandBase);

    // Rugged Stratovolcano Cone with caldera rim and erosion gullies
    const volGeo = new THREE.CylinderGeometry(1.2, 4.4, 5.2, 48, 20, true);
    const volPos = volGeo.attributes.position as THREE.BufferAttribute;
    const volColors = new Float32Array(volPos.count * 3);

    for (let i = 0; i < volPos.count; i++) {
      const vx = volPos.getX(i);
      const vy = volPos.getY(i);
      const vz = volPos.getZ(i);

      // Natural erosion chutes and crags
      const angle = Math.atan2(vz, vx);
      const gully = Math.sin(angle * 7) * 0.14 + Math.cos(angle * 13) * 0.08;
      const radial = 1 + gully * (1 - (vy + 2.6) / 5.2);

      volPos.setX(i, vx * radial);
      volPos.setZ(i, vz * radial);

      // Basalt rock, ash talus, and volcanic sulfur coloring
      const tH = (vy + 2.6) / 5.2;
      const isSulfur = Math.sin(angle * 5) > 0.7 && tH > 0.6;
      let r = 0.18 + tH * 0.08;
      let g = 0.16 + tH * 0.06;
      let b = 0.15 + tH * 0.05;

      if (isSulfur) {
        r = 0.85;
        g = 0.68;
        b = 0.18;
      }

      volColors[i * 3] = r;
      volColors[i * 3 + 1] = g;
      volColors[i * 3 + 2] = b;
    }

    volGeo.setAttribute("color", new THREE.BufferAttribute(volColors, 3));
    volGeo.computeVertexNormals();

    const volMat = mat(0xffffff, {
      vertexColors: true,
      roughness: 0.92,
      emissive: 0xff4500,
      emissiveIntensity: 0,
    });
    const volcanoMesh = new THREE.Mesh(volGeo, volMat);
    volcanoMesh.position.y = 2.6;
    volcanoMesh.castShadow = volcanoMesh.receiveShadow = true;
    volcanoGroup.add(volcanoMesh);

    // Glowing Molten Lava Lake inside the crater
    const lavaLake = new THREE.Mesh(
      new THREE.CircleGeometry(1.22, 32),
      new THREE.MeshBasicMaterial({ color: 0xff5500 })
    );
    lavaLake.rotation.x = -Math.PI / 2;
    lavaLake.position.y = 5.15;
    volcanoGroup.add(lavaLake);

    // Active Lava Chute cascading into the ocean
    const lavaChute = new THREE.Mesh(
      new THREE.BoxGeometry(0.42, 4.2, 0.18),
      mat(0xff3700, { emissive: 0xff2200, emissiveIntensity: 0.9 })
    );
    lavaChute.position.set(-1.8, 2.3, 0.7);
    lavaChute.rotation.set(0.35, -0.4, -0.65);
    volcanoGroup.add(lavaChute);

    const volcanoPointLight = new THREE.PointLight(0xff5500, 0, 32);
    volcanoPointLight.position.set(0, 6.2, 0);
    volcanoGroup.add(volcanoPointLight);

    // ============================================================================
    // 8. REALISTIC CABLE-STAYED / SUSPENSION BRIDGE
    // ============================================================================
    const bridgeGroup = new THREE.Group();
    bridgeGroup.position.set(2.0, 0, 5.0);
    world.add(bridgeGroup);

    // Abutments connecting city coastal avenue and island
    const abutmentCity = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.4, 2.2), concreteMat);
    abutmentCity.position.set(-5.6, 0.45, 0);
    bridgeGroup.add(abutmentCity);

    const abutmentIsland = new THREE.Mesh(new THREE.CylinderGeometry(2.0, 2.6, 1.4, 18), concreteMat);
    abutmentIsland.position.set(5.6, 0.2, 0);
    bridgeGroup.add(abutmentIsland);

    // Heavy reinforced concrete pier caissons embedded in the seabed
    const pier1 = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.55, 2.4, 24), concreteMat);
    pier1.position.set(-2.8, 0.2, 0);
    const pier2 = pier1.clone();
    pier2.position.set(2.8, 0.2, 0);
    bridgeGroup.add(pier1, pier2);

    // Central Pylon Base (Diamond / A-Frame Tower Base)
    const pylonBase = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.2, 2.4), concreteMat);
    pylonBase.position.set(0, -0.1, 0);
    bridgeGroup.add(pylonBase);

    // Twin Sculpted Aerodynamic Towers (Pylons)
    const pylonLeg1 = new THREE.Mesh(new THREE.BoxGeometry(0.38, 4.2, 0.38), metalMat);
    pylonLeg1.position.set(0, 2.9, 0.95);
    const pylonLeg2 = pylonLeg1.clone();
    pylonLeg2.position.set(0, 2.9, -0.95);

    // Cross portal beam & tower top
    const crossPortal = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.2, 2.2), metalMat);
    crossPortal.position.set(0, 4.1, 0);
    const pylonCrown = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.35, 2.2), metalMat);
    pylonCrown.position.set(0, 4.95, 0);

    // Red/White aviation warning beacons on top of pylon
    const pylonBeacon1 = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), new THREE.MeshBasicMaterial({ color: 0xef4444 }));
    pylonBeacon1.position.set(0, 5.2, 0.95);
    const pylonBeacon2 = pylonBeacon1.clone();
    pylonBeacon2.position.z = -0.95;

    bridgeGroup.add(pylonLeg1, pylonLeg2, crossPortal, pylonCrown, pylonBeacon1, pylonBeacon2);

    // Streamlined Hollow Steel Box Girder Deck
    const bridgeDeck = new THREE.Group();
    bridgeDeck.position.set(0, 1.4, 0);
    bridgeGroup.add(bridgeDeck);

    const deckGirder = new THREE.Mesh(new THREE.BoxGeometry(11.2, 0.3, 1.7), darkMetalMat);
    deckGirder.castShadow = true;
    bridgeDeck.add(deckGirder);

    // 4-lane roadway with markings
    const bridgeRoadMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(11.0, 1.5),
      mat(0xffffff, { map: bridgeRoadTex, roughness: 0.9 })
    );
    bridgeRoadMesh.rotation.x = -Math.PI / 2;
    bridgeRoadMesh.position.y = 0.16;
    bridgeRoadMesh.receiveShadow = true;
    bridgeDeck.add(bridgeRoadMesh);

    // Concrete median divider barrier & steel guardrails
    const centerBarrier = new THREE.Mesh(new THREE.BoxGeometry(11.0, 0.16, 0.08), concreteMat);
    centerBarrier.position.y = 0.24;
    const outerRail1 = new THREE.Mesh(new THREE.BoxGeometry(11.0, 0.26, 0.05), metalMat);
    outerRail1.position.set(0, 0.28, 0.82);
    const outerRail2 = outerRail1.clone();
    outerRail2.position.z = -0.82;
    bridgeDeck.add(centerBarrier, outerRail1, outerRail2);

    // High-Tensile Steel Stay Cables in Fan Array
    const stayCableMat = mat(0xf1f5f9, { metalness: 0.85, roughness: 0.2 });
    const addStayCable = (deckX: number, pylonY: number, zSide: number) => {
      const p1 = new THREE.Vector3(deckX, 0.2, zSide * 0.82);
      const p2 = new THREE.Vector3(0, pylonY - 1.4, zSide * 0.95);
      const dir = new THREE.Vector3().subVectors(p2, p1);
      const len = dir.length();
      const mid = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);

      const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, len, 6), stayCableMat);
      cable.position.copy(mid);
      cable.setRotationFromQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize()));
      bridgeDeck.add(cable);
    };

    [
      [-4.6, 4.6],
      [-3.4, 4.3],
      [-2.2, 3.9],
      [-1.0, 3.4],
      [1.0, 3.4],
      [2.2, 3.9],
      [3.4, 4.3],
      [4.6, 4.6],
    ].forEach(([dx, py]) => {
      addStayCable(dx, py, 1);
      addStayCable(dx, py, -1);
    });

    // Street Lamps along bridge deck
    for (let x = -4.5; x <= 4.5; x += 3.0) {
      const bLamp = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.55, 6), metalMat);
      bLamp.position.set(x, 0.44, 0.82);
      const bLight = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.03, 0.04), new THREE.MeshBasicMaterial({ color: 0xffedd5 }));
      bLight.position.set(x, 0.72, 0.8);
      bridgeDeck.add(bLamp, bLight);
    }

    // Moving commuter vehicle on the bridge
    const bridgeCarMesh = createVehicleMesh("car");
    bridgeCarMesh.group.position.set(-3.0, 0.17, 0.35);
    bridgeDeck.add(bridgeCarMesh.group);

    // ============================================================================
    // 9. REALISTIC OCEAN WATER, WAVES & TSUNAMI FLOOD
    // ============================================================================
    const seaGeo = new THREE.PlaneGeometry(32, 32, 128, 128);
    seaGeo.rotateX(-Math.PI / 2);
    seaGeo.setAttribute("color", new THREE.BufferAttribute(new Float32Array(seaGeo.attributes.position.count * 3), 3));

    const seaMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.88,
      roughness: 0.08,
      metalness: 0.3,
      envMapIntensity: 0.8,
    });
    const sea = new THREE.Mesh(seaGeo, seaMat);
    sea.position.set(13.5, -0.28, 0);
    sea.receiveShadow = true;
    world.add(sea);

    // Tsunami Inland Inundation Water Sheet
    const flood = new THREE.Mesh(
      new THREE.BoxGeometry(16, 1.4, 30),
      mat(0x0e7490, { transparent: true, opacity: 0.8, roughness: 0.1, metalness: 0.2 })
    );
    flood.position.set(-2.5, -0.3, 0);
    flood.scale.x = 0.001;
    world.add(flood);

    // Liquefaction mud boils & surface slurry pool
    const mudPool = new THREE.Mesh(
      new THREE.CircleGeometry(8.5, 36),
      mat(0x573e23, { transparent: true, opacity: 0, roughness: 0.95 })
    );
    mudPool.rotation.x = -Math.PI / 2;
    mudPool.position.set(-11.5, 0.04, -2.0);
    world.add(mudPool);

    // Tectonic fault fissures
    const faultCracks: THREE.Mesh[] = [];
    for (let i = 0; i < 14; i++) {
      const crack = new THREE.Mesh(new THREE.BoxGeometry(1, 0.04, 0.14), mat(0x09090b, { roughness: 1.0 }));
      crack.position.set(-11.5 + (Math.random() - 0.5) * 2.8, 0.035, -10 + i * 1.5);
      crack.rotation.y = Math.PI / 2 + (Math.random() - 0.5) * 1.1;
      crack.scale.x = 0.001;
      crack.userData.maxLen = 1.6 + Math.random() * 2.4;
      world.add(crack);
      faultCracks.push(crack);
    }

    // ============================================================================
    // 10. MULTI-PURPOSE GPU PARTICLE SYSTEM (Volcano, Rubble, Fire, Smoke & Rain)
    // ============================================================================
    const NP = 1200;
    const pp = new Float32Array(NP * 3).fill(-100);
    const pc = new Float32Array(NP * 3);
    const pv = new Float32Array(NP * 3);
    const pl = new Float32Array(NP);
    const pk = new Uint8Array(NP);
    let pi = 0;

    const pg = new THREE.BufferGeometry();
    pg.setAttribute("position", new THREE.BufferAttribute(pp, 3));
    pg.setAttribute("color", new THREE.BufferAttribute(pc, 3));
    const ps = new Float32Array(NP);
    const pa = new Float32Array(NP);
    const pL0 = new Float32Array(NP).fill(1);
    pg.setAttribute("sz", new THREE.BufferAttribute(ps, 1));
    pg.setAttribute("al", new THREE.BufferAttribute(pa, 1));

    const PU = { uS: { value: 800 } };
    const pts = new THREE.Points(
      pg,
      new THREE.ShaderMaterial({
        uniforms: PU,
        vertexColors: true,
        transparent: true,
        depthWrite: false,
        vertexShader: `
          attribute float sz;
          attribute float al;
          varying vec3 vc;
          varying float va;
          uniform float uS;
          void main() {
            vc = color;
            va = al;
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = sz * uS / -mv.z;
            gl_Position = projectionMatrix * mv;
          }
        `,
        fragmentShader: `
          varying vec3 vc;
          varying float va;
          void main() {
            float d = length(gl_PointCoord - 0.5);
            float a = smoothstep(0.5, 0.1, d) * va;
            if (a < 0.01) discard;
            gl_FragColor = vec4(vc, a);
          }
        `,
      })
    );
    pts.frustumCulled = false;
    world.add(pts);

    const emit = (
      k: number,
      x: number,
      y: number,
      z: number,
      vx: number,
      vy: number,
      vz: number,
      life: number
    ) => {
      const i = pi++ % NP;
      pp.set([x, y, z], i * 3);
      pv.set([vx, vy, vz], i * 3);
      pl[i] = pL0[i] = life;
      pk[i] = k;
    };

    // Sky Background Canvas Textures
    const makeSkyTexture = (a: string, b: string, c: string) => {
      const k = document.createElement("canvas");
      k.width = 2;
      k.height = 256;
      const x = k.getContext("2d")!;
      const g = x.createLinearGradient(0, 0, 0, 256);
      g.addColorStop(0, a);
      g.addColorStop(0.6, b);
      g.addColorStop(1, c);
      x.fillStyle = g;
      x.fillRect(0, 0, 2, 256);
      const t = new THREE.CanvasTexture(k);
      t.colorSpace = THREE.SRGBColorSpace;
      return t;
    };
    const skyDay = makeSkyTexture("#1e40af", "#38bdf8", "#e0f2fe");
    const skyNight = makeSkyTexture("#020617", "#0f172a", "#1e293b");
    const nightFogColor = new THREE.Color(0x090d16);
    const dayFogColor = new THREE.Color(0xcbe4f2);
    const currentFogColor = new THREE.Color();
    scene.fog = new THREE.FogExp2(0xcbe4f2, 0.007);

    // ---------------- Resize Handling ----------------
    const handleResize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w === 0 || h === 0) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      PU.uS.value = h * renderer.getPixelRatio() * 1.08;
    };
    handleResize();
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);
    window.addEventListener("resize", handleResize);

    // ---------------- Animation Loop ----------------
    const seismoHist = new Array<number>(260).fill(0);
    let seismoFrameCount = 0;
    const clock = new THREE.Clock();
    let tm = 0;
    let disposed = false;
    let rafId = 0;
    const colorScratch = new THREE.Color();

    const frame = () => {
      if (disposed) return;
      rafId = requestAnimationFrame(frame);
      const dt = Math.min(clock.getDelta(), 0.05);
      tm += dt;

      if (S.run) {
        S.t += dt;
        if (hudTimeRef.current) hudTimeRef.current.textContent = `${S.t.toFixed(1)}s`;
      }

      const t = S.t;
      const c = computePhysics(S);
      const m = S.mode;
      const run = S.run;
      const dur = 4 + (S.mw - 5) * 3;
      const shake =
        run && t < dur && m !== "wildfire"
          ? c.pga * (1 - (0.5 * t) / dur) * (m === "volcano" ? 0.35 : 1)
          : 0;
      const prog = Math.min(1, t / dur);

      // 1. World Ground Motion
      world.position.set(
        (Math.random() - 0.5) * shake * 0.14,
        (Math.random() - 0.5) * shake * 0.07,
        (Math.random() - 0.5) * shake * 0.14
      );

      // 2. City Buildings: Elastic Sway, Failure & Differential Settlement
      const collapse = m === "quake" && run ? Math.max(0, Math.min(1, (c.pga - 0.6) / 0.9)) * prog : 0;
      const liq = m === "liquefaction" ? Math.min(1, t / 12) * Math.min(1, c.pga / 0.5) : 0;

      buildingList.forEach((b, i) => {
        const sw = Math.sin(t * 18 + b.phase) * shake * 0.055;
        const cl = i % 3 === 0 ? collapse : 0;
        const lq = liq * (0.3 + (i % 4) * 0.22);

        b.mesh.position.set(
          b.baseX + sw * (b.height * 0.3),
          b.baseY - lq - cl * (b.height * 0.28),
          b.baseZ
        );

        b.mesh.rotation.set(
          cl * 0.45 * (i % 2 ? 1 : -1),
          0,
          sw + (lq ? lq * 0.15 * (i % 2 ? 1 : -1) : 0) + cl * 0.35 * (i % 2 ? -1 : 1)
        );

        // Falling debris / dust clouds
        if (cl > 0.3 && run && Math.random() < 0.25) {
          emit(
            3,
            b.baseX + (Math.random() - 0.5) * 1.5,
            b.height * (1 - cl * 0.5),
            b.baseZ + (Math.random() - 0.5) * 1.5,
            (Math.random() - 0.5) * 1.2,
            1.4 + Math.random() * 1.5,
            (Math.random() - 0.5) * 1.2,
            2.2
          );
        }
      });

      // 3. Animated Urban Traffic & Emergency Flashing
      vehicles.forEach((v, vi) => {
        if (v.axis === "x") {
          let nx = v.group.position.x + v.speed * v.dir * dt;
          if (nx > -3.8) {
            nx = -20;
          } else if (nx < -20.2) {
            nx = -4.0;
          }
          v.group.position.x = nx;
        } else {
          let nz = v.group.position.z + v.speed * v.dir * dt;
          if (nz > 14) nz = -14;
          else if (nz < -14) nz = 14;
          v.group.position.z = nz;
        }

        // Emergency lightbar flashing
        if (v.isEmergency && v.beaconLight) {
          const isFlashing = Math.sin(tm * 20 + vi) > 0;
          v.beaconLight.intensity = isFlashing ? 3.0 : 0.2;
        }
      });

      // 4. Wildfire Simulation (Rothermel Rate of Spread)
      const fireRadius = m === "wildfire" && run ? t * c.fireSpreadRate : 0;
      let burningTreesCount = 0;
      let charredTreesCount = 0;
      let sumBurnX = 0;
      let sumBurnZ = 0;

      vegetationList.forEach((veg, idx) => {
        if (m === "wildfire" && t > 0) {
          const d = fireRadius - veg.distFromIgnition;
          if (d < 0) {
            // Healthy unburnt tree
            veg.foliageMeshes.forEach((fm) => {
              (fm.material as THREE.MeshStandardMaterial).color.setHex(0x2e6930);
            });
            veg.group.scale.set(veg.scale, veg.scale, veg.scale);
          } else if (d < 5.0) {
            // Actively blazing tree
            burningTreesCount++;
            sumBurnX += veg.x;
            sumBurnZ += veg.z;
            const flicker = 0.5 + 0.5 * Math.sin(tm * 18 + idx * 2.2);

            veg.foliageMeshes.forEach((fm) => {
              (fm.material as THREE.MeshStandardMaterial).color.setRGB(1.0, 0.25 + flicker * 0.45, 0.05);
            });

            // Flame particles
            if (run && Math.random() < 0.35) {
              emit(
                4,
                veg.x + (Math.random() - 0.5) * 0.6,
                0.8 + Math.random() * veg.scale * 1.2,
                veg.z + (Math.random() - 0.5) * 0.6,
                0.35 + Math.random() * 0.4,
                1.8 + Math.random() * 2.4,
                0.25 + (Math.random() - 0.5) * 0.5,
                0.8 + Math.random() * 0.6
              );
            }
            // Dense smoke plume
            if (run && Math.random() < 0.24) {
              emit(
                5,
                veg.x + (Math.random() - 0.5) * 0.7,
                1.5 * veg.scale,
                veg.z + (Math.random() - 0.5) * 0.7,
                0.8 + Math.random() * 0.8,
                2.2 + Math.random() * 2.0,
                0.4 + (Math.random() - 0.5) * 0.5,
                4.8 + Math.random() * 2.5
              );
            }
            veg.group.scale.set(veg.scale, veg.scale * (1 - d * 0.04), veg.scale);
          } else {
            // Charred black tree
            charredTreesCount++;
            veg.foliageMeshes.forEach((fm) => {
              (fm.material as THREE.MeshStandardMaterial).color.setHex(0x18181b);
            });
            veg.group.scale.set(veg.scale * 0.7, veg.scale * 0.6, veg.scale * 0.7);
          }
        } else {
          // Normal state
          veg.foliageMeshes.forEach((fm) => {
            (fm.material as THREE.MeshStandardMaterial).color.setHex(0x2e6930);
          });
          veg.group.scale.set(veg.scale, veg.scale, veg.scale);
        }
      });

      // Wildfire Dynamic Fire Light & Mountain Scorching
      if (m === "wildfire" && run) {
        mountainMeshes.forEach((mt) => {
          const burnProgress = Math.min(1, fireRadius / 15);
          (mt.material as THREE.MeshStandardMaterial).color
            .setHex(0xffffff)
            .lerp(colorScratch.setHex(0x33261d), burnProgress * 0.6);
        });

        if (burningTreesCount > 0) {
          fireLight.position.set(sumBurnX / burningTreesCount, 3.2, sumBurnZ / burningTreesCount);
          fireLight.intensity = (2.2 + Math.min(4.0, burningTreesCount * 0.22)) * (0.85 + Math.random() * 0.3);
        } else {
          fireLight.intensity = 1.0;
        }
      } else {
        fireLight.intensity = 0;
        mountainMeshes.forEach((mt) => {
          (mt.material as THREE.MeshStandardMaterial).color.setHex(0xffffff);
        });
      }

      // 5. Ground, Mud & Fault Ruptures
      const wildfireChar = m === "wildfire" ? Math.min(0.65, (charredTreesCount / Math.max(1, vegetationList.length)) * 0.85) : 0;
      (ground.material as THREE.MeshStandardMaterial).color
        .setHex(0x658245)
        .lerp(colorScratch.setHex(0x5a4a35), liq)
        .lerp(colorScratch.setHex(0x272421), wildfireChar);

      (mudPool.material as THREE.MeshStandardMaterial).opacity = liq * 0.75;
      geologicalLayer.position.x = -12.25 + (m === "quake" && run ? Math.min(S.slip * 0.04, 1.2) * prog : 0);
      geologicalLayer.position.z = m === "quake" && run ? Math.sin(t * 3) * shake * 0.03 : 0;

      faultCracks.forEach((k) => {
        const v =
          (m === "quake" || m === "liquefaction") && t > 0
            ? Math.min(1, t / dur) * Math.min(1, c.pga / 0.35)
            : 0;
        k.scale.x = Math.max(0.001, v * (k.userData.maxLen as number));
      });

      // 6. Suspension Bridge Dynamics
      const bridgeDamage = m === "quake" && run ? Math.max(0, Math.min(1, (c.pga - 0.82) / 0.5)) * prog : 0;
      bridgeDeck.position.y = 1.4 + Math.sin(t * 14) * shake * 0.08 - bridgeDamage * 0.75;
      bridgeDeck.rotation.z = bridgeDamage * 0.32;

      // 7. Oceanic Current, Tsunami Swell & Inundation Surge
      const etaArr = run && m === "tsunami" ? c.eta : null;
      const fx = etaArr !== null ? 26 - 28.5 * Math.min(1, t / etaArr) : 35;
      const hit = etaArr !== null ? Math.max(0, Math.min(1, (t - etaArr) / 6.0)) : 0;
      const lvl = Math.min(c.th * 1.25, 4.8);
      const sPos = seaGeo.attributes.position as THREE.BufferAttribute;
      const sCol = seaGeo.attributes.color as THREE.BufferAttribute;

      for (let i = 0; i < sPos.count; i++) {
        const sx = sPos.getX(i);
        const sz = sPos.getZ(i);
        const wx = 13.5 + sx;

        // Oceanic swell & shoreline ripples
        let wy = Math.sin(wx * 0.45 + tm * 1.8) * 0.08 + Math.cos(sz * 0.4 + tm * 1.2) * 0.06;

        // Tsunami Wave Wall Front
        if (etaArr !== null) {
          const dist = wx - fx;
          const spread = dist < 0 ? 2.2 : 6.2;
          wy +=
            lvl * 0.98 * Math.exp(-Math.pow(dist / spread, 2)) +
            (Math.abs(dist) < 3.8 ? Math.sin(wx * 4.5 + tm * 9) * 0.07 * lvl : 0);
        }
        sPos.setY(i, wy);

        // Realistic ocean water depth colors: deep ocean navy -> turquoise -> whitecap foam
        const depthFactor = Math.min(1, Math.max(0, (wx + 2.5) / 25));
        const foam = Math.max(0, Math.min(1, (wy - 0.12) / 0.5));
        sCol.setXYZ(
          i,
          0.02 + depthFactor * 0.03 + foam * 0.95,
          0.32 + depthFactor * 0.18 + foam * 0.7,
          0.58 + depthFactor * 0.38 + foam * 0.5
        );
      }
      sPos.needsUpdate = true;
      sCol.needsUpdate = true;
      seaGeo.computeVertexNormals();

      sea.position.y = -0.28 + lvl * 0.35 * hit;
      flood.scale.x = Math.max(0.001, hit);
      flood.position.x = -2.5 - 7.5 * hit;
      flood.scale.y = 1 + lvl * hit * 0.85;

      // 8. Volcanic Eruption & Magma Lake Pulsing
      const er = m === "volcano" ? Math.min(1, t / 3.0) * Math.max(0.2, (S.mw - 4) / 4) : 0;
      volMat.emissiveIntensity = m === "volcano" ? 0.08 + er * 0.25 : 0;
      (lavaLake.material as THREE.MeshBasicMaterial).color.setHSL(0.045, 1, m === "volcano" ? 0.42 + Math.random() * 0.18 : 0.08);
      (lavaChute.material as THREE.MeshStandardMaterial).emissiveIntensity =
        m === "volcano" ? 0.95 + Math.sin(t * 8) * 0.35 : 0.2;
      volcanoPointLight.intensity = m === "volcano" ? (1.5 + er * 3.2) * (0.85 + Math.random() * 0.3) : 0;

      // Volcanic Pyroclasts & Plume Particle Emissions
      if (m === "volcano" && run) {
        for (let k = 0; k < Math.floor(er * 8); k++) {
          emit(
            0,
            13 + (Math.random() - 0.5) * 1.0,
            5.2,
            (Math.random() - 0.5) * 1.0,
            (Math.random() - 0.5) * 3.2,
            5.5 + Math.random() * 5.5 * er,
            (Math.random() - 0.5) * 3.2,
            1.8
          );
        }
        if (Math.random() < er * 1.8) {
          emit(
            1,
            13 + (Math.random() - 0.5) * 1.2,
            5.4,
            (Math.random() - 0.5) * 1.2,
            0.45 + Math.random() * 0.65,
            2.8 + Math.random() * 2.8,
            Math.random() - 0.5,
            6.5
          );
        }
        emit(2, -10 + Math.random() * 28, 15, -10 + Math.random() * 22, 0, -1.2, 0, 10);
      }

      // Tsunami rain & sea spray
      if (m === "tsunami" && run && t > 2) {
        for (let ri = 0; ri < 5; ri++) {
          emit(
            6,
            -20 + Math.random() * 40,
            18,
            -15 + Math.random() * 30,
            (Math.random() - 0.5) * 0.3,
            -14 - Math.random() * 4,
            (Math.random() - 0.5) * 0.3,
            1.2 + Math.random() * 0.4
          );
        }
      }

      // Particle Physics Update
      for (let i = 0; i < NP; i++) {
        if (pl[i] <= 0) continue;
        pl[i] -= dt;
        const j = i * 3;
        const k = pk[i];
        if (pl[i] <= 0) {
          pp[j + 1] = -100;
          continue;
        }
        pv[j + 1] -= (k === 0 ? 9.2 : k === 1 || k === 5 ? -0.65 : k === 4 ? -1.3 : 0) * dt;
        pp[j] += pv[j] * dt;
        pp[j + 1] += pv[j + 1] * dt;
        pp[j + 2] += pv[j + 2] * dt;

        if (k === 0 && pp[j + 1] < -0.3) {
          pl[i] = 0;
          pp[j + 1] = -100;
        }

        const L = pl[i] / pL0[i];
        let r = 1, g = 1, b2 = 1, s = 0.3, a = 1;

        if (k === 0) {
          // Pyroclastic lava bomb
          r = 1; g = 0.35 + 0.45 * L; b2 = 0.08; s = 0.28; a = 1;
        } else if (k === 1) {
          // Volcanic ash plume
          r = g = b2 = 0.18 + 0.28 * (1 - L); s = 0.9 + (1 - L) * 2.8; a = 0.65 * L;
        } else if (k === 2) {
          // Ashfall
          r = g = b2 = 0.52; s = 0.2; a = 0.7 * Math.min(1, L * 3);
        } else if (k === 4) {
          // Fire flame
          r = 1.0; g = 0.22 + 0.68 * L; b2 = 0.05 * L; s = 0.38 + (1 - L) * 0.6; a = 0.95 * L;
        } else if (k === 5) {
          // Wildfire smoke
          r = g = b2 = 0.15 + 0.2 * (1 - L); s = 0.75 + (1 - L) * 2.4; a = 0.6 * L;
        } else if (k === 6) {
          // Rain / spray drops
          r = 0.75 + 0.25 * L; g = 0.88 + 0.12 * L; b2 = 1.0; s = 0.09; a = 0.6 * L;
        } else {
          // Building collapse dust
          r = 0.72; g = 0.65; b2 = 0.55; s = 0.55 + (1 - L) * 2.2; a = 0.6 * L;
        }

        pc[j] = r; pc[j + 1] = g; pc[j + 2] = b2;
        ps[i] = s; pa[i] = a;
      }
      pg.attributes.position.needsUpdate = true;
      pg.attributes.color.needsUpdate = true;
      pg.attributes.sz.needsUpdate = true;
      pg.attributes.al.needsUpdate = true;

      // 9. Day & Night Transition
      const n = S.night ? 1 : 0;
      currentFogColor.copy(dayFogColor).lerp(nightFogColor, n);
      scene.background = S.night ? skyNight : skyDay;
      if (scene.fog) {
        scene.fog.color.copy(currentFogColor);
        (scene.fog as THREE.FogExp2).density = S.night ? 0.012 : 0.007;
      }

      hemiLight.intensity = 1.1 - 0.85 * n;
      sunLight.intensity = 1.6 - 1.4 * n;

      // Turn on building window emissives & street lamps at night
      facadeMats.forEach((fm) => {
        fm.emissiveIntensity = 0.65 * n;
      });
      lampLightList.forEach((pl) => {
        pl.intensity = 1.8 * n;
      });

      // 10. Smooth Camera Orbit Lerp
      if (S.camLerp > 0) {
        S.camLerp -= dt;
        camera.position.lerp(camTargets.pos, 0.07);
        controls.target.lerp(camTargets.look, 0.07);
      }
      controls.update();
      renderer.render(scene, camera);

      // 11. Warning Alert Banner
      let bannerMsg = "";
      if (run) {
        if (m === "quake" && c.pga > 0.6 && t < dur + 3) {
          bannerMsg = "KERUNTUHAN STRUKTUR: GETARAN SEISMIK EKSTREM (PGA > 0.6g)";
        } else if (m === "tsunami") {
          if (c.eta !== null) {
            bannerMsg =
              t < c.eta
                ? `PERINGATAN DINI: Tsunami tiba dalam ${(c.eta - t).toFixed(1)} menit!`
                : "TSUNAMI MENERJANG DARATAN & JEMBATAN KOTA!";
          } else {
            bannerMsg = "Tidak ada potensi tsunami destruktif (bukan subduksi megathrust dangkal)";
          }
        } else if (m === "volcano") {
          bannerMsg = "ERUPSI GUNUNG BERAPI: Awan panas piroklastik & semburan magma!";
        } else if (m === "liquefaction" && liq > 0.2) {
          bannerMsg = "LIKUIFAKSI TANAH: Tanah jenuh air mencair & fondasi kota amblas!";
        } else if (m === "wildfire") {
          const pctBurned = Math.min(
            100,
            Math.round(((burningTreesCount + charredTreesCount) / Math.max(1, vegetationList.length)) * 100)
          );
          bannerMsg = `KEBAKARAN HUTAN (Model Rothermel): Laju rambat ${c.fireSpreadRate.toFixed(1)} m/s • Area terdampak ${pctBurned}%`;
        }
      }

      if (bannerWrapRef.current && bannerTextRef.current) {
        if (bannerMsg) {
          bannerTextRef.current.textContent = bannerMsg;
          bannerWrapRef.current.classList.remove("hidden");
        } else {
          bannerWrapRef.current.classList.add("hidden");
        }
      }

      // 12. Seismograph Drawing Engine
      seismoFrameCount++;
      const seismoCanvas = seismoRef.current;
      if (seismoFrameCount % 2 === 0 && seismoCanvas) {
        const pgaShown = m === "wildfire" ? 0.02 : c.pga;
        if (hudPgaRef.current) hudPgaRef.current.textContent = `PGA: ${pgaShown.toFixed(2)}g`;

        const sctx = seismoCanvas.getContext("2d");
        if (sctx) {
          seismoHist.shift();
          seismoHist.push(
            run ? (Math.random() * 2 - 1) * Math.min(1, shake * 0.9 + 0.03) : (Math.random() - 0.5) * 0.04
          );
          sctx.clearRect(0, 0, 260, 52);

          sctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
          sctx.lineWidth = 1;
          sctx.beginPath();
          sctx.moveTo(0, 26);
          sctx.lineTo(260, 26);
          sctx.stroke();

          sctx.strokeStyle = c.pga > 0.6 ? "#ef4444" : c.pga > 0.3 ? "#f59e0b" : "#38bdf8";
          sctx.lineWidth = 1.6;
          sctx.beginPath();
          seismoHist.forEach((v, idx) => {
            if (idx === 0) sctx.moveTo(idx, 26);
            else sctx.lineTo(idx, 26 + v * 24);
          });
          sctx.stroke();
        }
      }
    };
    frame();

    // ---------------- Cleanup on Unmount ----------------
    return () => {
      disposed = true;
      cancelAnimationFrame(rafId);
      stopEmergencySiren();
      audioApiRef.current = null;
      resizeObserver.disconnect();
      window.removeEventListener("resize", handleResize);
      controls.dispose();
      scene.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
        const material = mesh.material;
        if (Array.isArray(material)) material.forEach((m) => m.dispose());
        else if (material) material.dispose();
      });
      renderer.dispose();
      if (renderer.domElement.parentElement === container) {
        container.removeChild(renderer.domElement);
      }
      if (audioCtx && audioCtx.state !== "closed") {
        audioCtx.close().catch(() => {});
      }
    };
  }, []);

  // ============================================================================
  // Render JSX & UI
  // ============================================================================
  return (
    <div
      ref={wrapperRef}
      className="relative w-full h-full min-h-[460px] rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 shadow-2xl select-none"
    >
      {/* 3D Canvas Mount Point */}
      <div ref={mountRef} className="absolute inset-0 cursor-grab active:cursor-grabbing" />

      {/* Warning Alert Banner (Top Center) */}
      <div
        ref={bannerWrapRef}
        className="hidden absolute top-4 left-1/2 -translate-x-1/2 z-30 pointer-events-none animate-pulse"
      >
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-rose-600/95 text-white font-bold text-xs tracking-wide shadow-lg shadow-rose-600/50 backdrop-blur-md border border-rose-400/30">
          <AlertTriangle className="h-4 w-4 shrink-0 text-white" />
          <span ref={bannerTextRef} className="whitespace-nowrap">
            {""}
          </span>
        </div>
      </div>

      {/* Top Left: HUD Status & Mode Selection */}
      <div className="absolute top-3 left-3 z-20 flex flex-col gap-2 max-w-[310px]">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 backdrop-blur-md text-slate-200">
          <span className="h-2 w-2 rounded-full bg-rose-500 animate-ping" />
          <span className="text-[11px] font-bold tracking-tight text-white uppercase font-mono">
            3D Disaster Simulator Pro
          </span>
          <span ref={hudTimeRef} className="text-[10px] text-slate-400 font-mono ml-auto">
            STANDBY
          </span>
        </div>

        {/* Disaster Mode Switcher */}
        <div className="p-1.5 rounded-xl bg-slate-900/85 border border-slate-800 backdrop-blur-md flex flex-wrap gap-1">
          {DISASTER_MODES.map(({ id, label, Icon }) => {
            const isActive = disasterType === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => onDisasterTypeChange(id)}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] transition-all",
                  isActive
                    ? "bg-rose-600/80 text-white font-semibold shadow-sm border border-rose-500/50"
                    : "text-slate-400 font-medium hover:text-white hover:bg-slate-800/60 border border-transparent"
                )}
              >
                <Icon className="h-3 w-3" />
                <span>{label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Top Right: Visual Tools & Camera Presets */}
      <div className="absolute top-3 right-3 z-20 flex flex-col items-end gap-2">
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900/85 border border-slate-800 backdrop-blur-md">
          <button
            type="button"
            onClick={toggleNight}
            title="Beralih Siang/Malam"
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
          >
            {night ? <Sun className="h-3.5 w-3.5 text-amber-300" /> : <Moon className="h-3.5 w-3.5" />}
          </button>
          <button
            type="button"
            onClick={toggleSound}
            title="Mute / Aktifkan Suara"
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
          >
            {sound ? (
              <Volume2 className="h-3.5 w-3.5 text-emerald-400" />
            ) : (
              <VolumeX className="h-3.5 w-3.5 text-rose-400" />
            )}
          </button>
          <button
            type="button"
            onClick={toggleFullscreen}
            title="Fullscreen"
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <Maximize className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Camera Presets Bar */}
        <div className="p-1.5 rounded-xl bg-slate-900/85 border border-slate-800 backdrop-blur-md flex flex-col gap-1 text-right">
          <span className="text-[10px] font-mono font-semibold text-slate-400 px-2 py-0.5 uppercase flex items-center justify-end gap-1">
            <CameraIcon className="h-3 w-3" />
            <span>Kamera:</span>
          </span>
          <div className="flex flex-col gap-0.5">
            {CAMERA_ITEMS.map(({ id, label, Icon }) => {
              const isActive = cam === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setUserCam({ forDisaster: disasterType, preset: id })}
                  className={cn(
                    "flex items-center justify-end gap-1.5 px-2.5 py-1 rounded-lg text-[10px] text-right transition-all",
                    isActive
                      ? "bg-sky-500/20 text-sky-300 border border-sky-400/40 font-semibold"
                      : "text-slate-400 font-medium hover:text-white hover:bg-slate-800/50 border border-transparent"
                  )}
                >
                  <Icon className="h-3 w-3 shrink-0" />
                  <span>{label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom Left: Live Seismogram Oscillograph */}
      <div className="absolute bottom-3 left-3 z-20 flex flex-col gap-1 p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 backdrop-blur-md w-[276px]">
        <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 px-1">
          <span className="flex items-center gap-1.5 text-slate-300 font-bold">
            <Waves className="h-3 w-3 text-rose-500" />
            <span>Seismogram Live</span>
          </span>
          <span ref={hudPgaRef} className="text-amber-400 font-bold">
            PGA: 1.50g
          </span>
        </div>
        <canvas
          ref={seismoRef}
          width={260}
          height={52}
          className="w-full h-[52px] rounded-lg border border-slate-800/90 bg-slate-950/80 block"
        />
      </div>

      {/* Bottom Right: Play / Pause / Reset Interactive Controls */}
      <div className="absolute bottom-3 right-3 z-20 flex items-center gap-2">
        <button
          type="button"
          onClick={handleReset}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white text-xs font-semibold backdrop-blur-md transition-all shadow-md"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span>Reset</span>
        </button>
        <button
          type="button"
          onClick={toggleRun}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold tracking-wide transition-all shadow-lg backdrop-blur-md text-white",
            isSimulating
              ? "bg-amber-600 hover:bg-amber-500 shadow-amber-600/30"
              : "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30"
          )}
        >
          {isSimulating ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          <span>{isSimulating ? "Jeda Simulasi" : "Mulai Simulasi"}</span>
        </button>
      </div>

      {/* OrbitControls Hint */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 pointer-events-none hidden md:block">
        <span className="text-[10px] text-slate-400/90 font-mono tracking-wider bg-slate-950/75 px-3 py-1 rounded-full border border-slate-800/60">
          Tahan &amp; geser mouse untuk rotasi 3D • Scroll untuk zoom
        </span>
      </div>
    </div>
  );
}
