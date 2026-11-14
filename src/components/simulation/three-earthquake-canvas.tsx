"use client";

import { useEffect, useRef, useState } from "react";
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
import type { ArcRotateCamera, Engine, Scene, StandardMaterial } from "@babylonjs/core";
import type { CameraPreset, SimDisasterType, ThreeEarthquakeCanvasProps } from "./types";
import { CAMERA_BY_DISASTER, CAMERA_PRESETS } from "./babylon/camera-presets";
import { estimatePga, estimateTsunamiHeight } from "./babylon/physics";
import type { DisasterSceneFeatures } from "./babylon/scene";

export type { SimDisasterType, SimMechanism } from "./types";

const MODES: { id: SimDisasterType; label: string; Icon: LucideIcon }[] = [
  { id: "EARTHQUAKE", label: "Gempa", Icon: Zap },
  { id: "TSUNAMI", label: "Tsunami", Icon: Waves },
  { id: "VOLCANO", label: "Gunung Api", Icon: Mountain },
  { id: "LIQUEFACTION", label: "Likuifaksi", Icon: Droplets },
  { id: "WILDFIRE", label: "Kebakaran Hutan", Icon: Flame },
];

const CAMERAS: { id: CameraPreset; label: string; Icon: LucideIcon }[] = [
  { id: "orbit", label: "Orbit Selat", Icon: Globe },
  { id: "city", label: "Kota & Gedung", Icon: Building2 },
  { id: "coast", label: "Pesisir & Jembatan", Icon: Waves },
  { id: "crater", label: "Kawah Gunung Api", Icon: Mountain },
  { id: "fault", label: "Sesar & Patahan", Icon: Zap },
  { id: "forest", label: "Hutan & Lereng", Icon: Flame },
];

export function ThreeEarthquakeCanvas(props: ThreeEarthquakeCanvasProps) {
  const {
    magnitude,
    depthKm,
    slipMeters,
    isSimulating,
    mechanism,
    disasterType,
    onDisasterTypeChange,
    onSimulatingChange,
  } = props;

  const wrapperRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const seismoRef = useRef<HTMLCanvasElement>(null);

  const [selectedCamera, setSelectedCamera] = useState<CameraPreset | null>(null);
  const cameraPreset = selectedCamera ?? CAMERA_BY_DISASTER[disasterType];

  const [night, setNight] = useState(false);
  const [sound, setSound] = useState(true);
  const [elapsed, setElapsed] = useState(0);
  const [renderError, setRenderError] = useState("");

  const activeCameraRef = useRef<ArcRotateCamera | null>(null);
  const featuresRef = useRef<DisasterSceneFeatures | null>(null);

  const simRef = useRef({
    running: isSimulating,
    magnitude,
    depthKm,
    slipMeters,
    mechanism,
    disasterType,
    t: 0,
    night,
    sound,
  });

  useEffect(() => {
    simRef.current.running = isSimulating;
    simRef.current.magnitude = magnitude;
    simRef.current.depthKm = depthKm;
    simRef.current.slipMeters = slipMeters;
    simRef.current.mechanism = mechanism;
    simRef.current.disasterType = disasterType;
    simRef.current.night = night;
    simRef.current.sound = sound;
  }, [isSimulating, magnitude, depthKm, slipMeters, mechanism, disasterType, night, sound]);

  // Audio synthesis reference
  const audioCtxRef = useRef<AudioContext | null>(null);

  const playRumble = (duration = 4.0) => {
    if (!simRef.current.sound || typeof window === "undefined") return;
    try {
      if (!audioCtxRef.current) {
        const AC =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AC) audioCtxRef.current = new AC();
      }
      const ctx = audioCtxRef.current;
      if (!ctx) return;
      if (ctx.state === "suspended") void ctx.resume();

      const bufferSize = ctx.sampleRate * duration;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      let last = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        data[i] = (last + 0.03 * white) / 1.03;
        last = data[i];
        data[i] *= 2.5;
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 100;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      noise.start();
    } catch {
      // Autoplay policy
    }
  };

  useEffect(() => {
    if (isSimulating) {
      playRumble(5.0);
    }
  }, [isSimulating, disasterType]);

  // Camera preset switcher
  const handleCameraSelect = (preset: CameraPreset) => {
    setSelectedCamera(preset);
    const p = CAMERA_PRESETS[preset];
    if (activeCameraRef.current) {
      void import("@babylonjs/core").then((B) => {
        if (activeCameraRef.current) {
          activeCameraRef.current.setTarget(new B.Vector3(...p.target));
          activeCameraRef.current.setPosition(new B.Vector3(...p.position));
        }
      });
    }
  };

  // Switch camera when disaster type changes
  useEffect(() => {
    const recommended = CAMERA_BY_DISASTER[disasterType];
    setSelectedCamera(recommended);
    const p = CAMERA_PRESETS[recommended];
    if (activeCameraRef.current) {
      void import("@babylonjs/core").then((B) => {
        if (activeCameraRef.current) {
          activeCameraRef.current.setTarget(new B.Vector3(...p.target));
          activeCameraRef.current.setPosition(new B.Vector3(...p.position));
        }
      });
    }
  }, [disasterType]);

  // Night mode toggle trigger
  useEffect(() => {
    if (featuresRef.current) {
      featuresRef.current.updateNightMode(night);
    }
  }, [night]);

  // --------------------------------------------------------------------------
  // Main Babylon.js Initialization (Mounts ONCE)
  // --------------------------------------------------------------------------
  useEffect(() => {
    let disposed = false;
    let engine: Engine | undefined;
    let scene: Scene | undefined;
    let activeCamera: ArcRotateCamera | undefined;
    let ro: ResizeObserver | undefined;

    void (async () => {
      try {
        const canvas = canvasRef.current;
        if (!canvas || disposed) return;

        const B = await import("@babylonjs/core");
        await import("@babylonjs/loaders");

        if (disposed) return;

        // Initialize Engine
        engine = new B.Engine(canvas, true, {
          preserveDrawingBuffer: true,
          stencil: true,
          adaptToDeviceRatio: true,
          antialias: true,
        });

        // Initialize Scene
        scene = new B.Scene(engine);

        // Load 3D Disaster Environment
        const { createDisasterScene } = await import("./babylon/scene");
        const features = createDisasterScene(scene, simRef.current.disasterType);
        featuresRef.current = features;

        // Initialize Camera with preset position & target
        const p = CAMERA_PRESETS[CAMERA_BY_DISASTER[simRef.current.disasterType]];
        activeCamera = new B.ArcRotateCamera(
          "mainOrbitCam",
          Math.PI / 4,
          Math.PI / 3.2,
          48,
          new B.Vector3(...p.target),
          scene
        );
        activeCamera.setPosition(new B.Vector3(...p.position));
        activeCamera.setTarget(new B.Vector3(...p.target));
        activeCamera.attachControl(canvas, true);
        activeCamera.lowerRadiusLimit = 6;
        activeCamera.upperRadiusLimit = 120;
        activeCamera.lowerBetaLimit = 0.1;
        activeCamera.upperBetaLimit = Math.PI / 2.05;
        activeCamera.wheelPrecision = 20;
        activeCamera.panningSensibility = 100;
        scene.activeCamera = activeCamera;
        activeCameraRef.current = activeCamera;

        // Apply night mode if initial state is night
        features.updateNightMode(simRef.current.night);

        // Responsive Resize Handler
        const handleResize = () => {
          if (engine && !engine.isDisposed) {
            engine.resize();
          }
        };
        window.addEventListener("resize", handleResize);

        if (canvas.parentElement) {
          ro = new ResizeObserver(() => handleResize());
          ro.observe(canvas.parentElement);
        }
        handleResize();

        // --------------------------------------------------------------------
        // Render Loop
        // --------------------------------------------------------------------
        let lastTime = performance.now();

        engine.runRenderLoop(() => {
          if (!scene || disposed || !engine) return;

          const now = performance.now();
          const dt = Math.min((now - lastTime) / 1000, 0.06);
          lastTime = now;

          const sim = simRef.current;
          if (sim.running) {
            sim.t += dt;
          }

          const t = sim.t;
          const pga = estimatePga(sim.magnitude, sim.depthKm);

          // Disaster Simulation Dynamics
          if (features) {
            // Natural Water Ripple Animation
            if (features.water) {
              features.water.position.y = -0.28 + Math.sin(now * 0.002) * 0.04;
            }

            // A. TSUNAMI SIMULATION
            if (sim.disasterType === "TSUNAMI" && sim.running) {
              const surgeProgress = Math.min(1.0, t / 8.0);
              const maxSurge = Math.min(
                3.8,
                estimateTsunamiHeight(sim.magnitude, sim.slipMeters, sim.mechanism, sim.depthKm) * 0.45 + 1.2
              );
              const currentLevel = maxSurge * surgeProgress;

              features.water.position.y = -0.28 + currentLevel * 0.4;
              features.floodWater.scaling.x = Math.max(0.001, surgeProgress);
              features.floodWater.position.x = 2.0 - 10.0 * surgeProgress;
              features.floodWater.position.y = -0.22 + currentLevel * 0.35;
            } else if (sim.disasterType !== "TSUNAMI") {
              features.floodWater.scaling.x = 0.001;
            }

            // B. VOLCANO ERUPTION SIMULATION
            if (sim.disasterType === "VOLCANO") {
              const er = sim.running ? Math.min(1.0, t / 4.0) : 0.2;
              features.craterMagma.scaling.y = 1.0 + Math.sin(now * 0.008) * 0.15 * er;
              features.volcanoLight.intensity = (1.8 + er * 3.2) * (0.85 + Math.random() * 0.3);
            } else {
              features.volcanoLight.intensity = 0.8;
            }

            // C. EARTHQUAKE & LIQUEFACTION
            if ((sim.disasterType === "EARTHQUAKE" || sim.disasterType === "LIQUEFACTION") && sim.running) {
              const shakeIntensity = Math.min(0.14, pga * 0.09) * Math.max(0, 1 - t / 14);

              features.buildings.forEach((b, i) => {
                const swayFreq = 12 + (i % 5);
                const sway = Math.sin(t * swayFreq + i) * shakeIntensity * (b.height / 3.5);
                b.mesh.rotation.z = sway;
                b.mesh.rotation.x = Math.cos(t * (swayFreq * 0.8) + i) * (sway * 0.6);

                if (sim.disasterType === "LIQUEFACTION") {
                  const sinkProgress = Math.min(1.0, t / 10.0);
                  const sinkAmt = (0.2 + (i % 4) * 0.25) * sinkProgress;
                  b.mesh.position.y = b.originalY - sinkAmt;
                  b.mesh.rotation.z += (i % 2 === 0 ? 0.08 : -0.08) * sinkProgress;
                }
              });

              const crackProgress = Math.min(1.0, t / 6.0);
              features.faultCracks.forEach((c) => {
                c.scaling.x = Math.max(0.001, crackProgress * 1.8);
              });

              if (sim.disasterType === "LIQUEFACTION") {
                const mudMat = features.mudLake.material as StandardMaterial;
                if (mudMat) mudMat.alpha = Math.min(0.85, t / 8.0);
              }
            } else if (!sim.running) {
              features.buildings.forEach((b) => {
                b.mesh.rotation.z = 0;
                b.mesh.rotation.x = 0;
                b.mesh.position.y = b.originalY;
              });
              features.faultCracks.forEach((c) => {
                c.scaling.x = 0.001;
              });
              const mudMat = features.mudLake.material as StandardMaterial;
              if (mudMat) mudMat.alpha = 0;
            }

            // D. WILDFIRE (Rothermel Propagation)
            if (sim.disasterType === "WILDFIRE" && sim.running) {
              const spreadRate = 1.4;
              const fireRadius = t * spreadRate;
              let burningCount = 0;
              let centerBurnX = 0;
              let centerBurnZ = 0;

              features.trees.forEach((tree) => {
                const d = fireRadius - tree.distFromIgnition;
                if (d > 0 && d < 6.0) {
                  burningCount++;
                  centerBurnX += tree.x;
                  centerBurnZ += tree.z;
                  const flicker = 0.7 + Math.random() * 0.3;
                  tree.crowns.forEach((crw) => {
                    const mat = crw.material as StandardMaterial;
                    if (mat) {
                      mat.diffuseColor = new B.Color3(1.0, 0.3 * flicker, 0.05);
                      mat.emissiveColor = new B.Color3(0.9 * flicker, 0.2, 0.02);
                    }
                  });
                } else if (d >= 6.0) {
                  tree.crowns.forEach((crw) => {
                    const mat = crw.material as StandardMaterial;
                    if (mat) {
                      mat.diffuseColor = new B.Color3(0.18, 0.16, 0.15);
                      mat.emissiveColor = new B.Color3(0, 0, 0);
                    }
                  });
                }
              });

              if (burningCount > 0) {
                features.fireLight.position.set(centerBurnX / burningCount, 2.5, centerBurnZ / burningCount);
                features.fireLight.intensity =
                  (1.5 + Math.min(4.0, burningCount * 0.2)) * (0.85 + Math.random() * 0.3);
              }
            } else if (sim.disasterType !== "WILDFIRE" || !sim.running) {
              features.fireLight.intensity = 0;
            }
          }

          // Render Scene
          try {
            scene.render();
          } catch (e) {
            setRenderError(e instanceof Error ? e.message : String(e));
          }
        });
      } catch (error) {
        console.error("Babylon initialization failed:", error);
        if (!disposed) {
          setRenderError(error instanceof Error ? error.message : "Gagal memuat engine 3D.");
        }
      }
    })();

    return () => {
      disposed = true;
      if (ro) ro.disconnect();
      if (activeCamera) activeCamera.detachControl();
      if (engine) {
        engine.stopRenderLoop();
        scene?.dispose();
        engine.dispose();
      }
      if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
        void audioCtxRef.current.close().catch(() => {});
      }
    };
  }, []); // Run ONCE on mount

  // Timer counter for elapsed time
  useEffect(() => {
    if (!isSimulating) {
      setElapsed(0);
      return;
    }
    const timer = window.setInterval(() => setElapsed((v) => v + 1), 1000);
    return () => window.clearInterval(timer);
  }, [isSimulating]);

  // Seismograph Live Canvas Waveform Drawing
  useEffect(() => {
    const canvas = seismoRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const pga = estimatePga(magnitude, depthKm);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, 26);
    ctx.lineTo(260, 26);
    ctx.stroke();

    ctx.strokeStyle = pga > 0.6 ? "#ef4444" : pga > 0.3 ? "#f59e0b" : "#38bdf8";
    ctx.lineWidth = 1.6;
    ctx.beginPath();

    for (let x = 0; x < canvas.width; x++) {
      const envelope = isSimulating ? Math.min(1.0, pga * 1.3) : 0.06;
      const y =
        26 +
        Math.sin(x * 0.22 + elapsed * 3.5) *
          Math.sin(x * 0.055 + elapsed * 1.8) *
          envelope *
          22;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }, [magnitude, depthKm, elapsed, isSimulating]);

  const pga = estimatePga(magnitude, depthKm);
  const tsunamiH = estimateTsunamiHeight(magnitude, slipMeters, mechanism, depthKm);
  const warningText = !isSimulating
    ? ""
    : disasterType === "EARTHQUAKE" && pga > 0.6
    ? "PERINGATAN SEISMIK EKSTREM (PGA > 0.6g): Potensi keruntuhan struktur bangunan perkotaan!"
    : disasterType === "TSUNAMI" && tsunamiH > 0
    ? `PERINGATAN TSUNAMI: Estimasi tinggi gelombang ${tsunamiH.toFixed(1)}m menerjang pesisir & jembatan!`
    : disasterType === "VOLCANO"
    ? "ERUPSI GUNUNG BERAPI: Semburan magma pijar, awan abu vulkanik & aliran lava!"
    : disasterType === "LIQUEFACTION"
    ? "LIKUEFAKSI TANAH: Penurunan daya dukung tanah & fondasi bangunan amblas!"
    : disasterType === "WILDFIRE"
    ? "KEBAKARAN HUTAN: Perambatan api aktif & asap tebal di lereng bukit!"
    : "";

  return (
    <div
      ref={wrapperRef}
      className="relative w-full h-full min-h-[460px] rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 shadow-2xl select-none"
    >
      {/* 3D Canvas Mount Point */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 z-0 block w-full h-full cursor-grab active:cursor-grabbing outline-none"
      />

      {/* Render Error Overlay */}
      {renderError && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-950/90 p-6 text-center text-sm text-rose-300">
          Scene 3D gagal dimuat: {renderError}
        </div>
      )}

      {/* Warning Alert Banner (Top Center) */}
      {warningText && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 pointer-events-none animate-pulse">
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-rose-600/95 text-white font-bold text-xs tracking-wide shadow-lg shadow-rose-600/50 backdrop-blur-md border border-rose-400/30">
            <AlertTriangle className="h-4 w-4 shrink-0 text-white" />
            <span className="whitespace-nowrap">{warningText}</span>
          </div>
        </div>
      )}

      {/* Top Left: HUD Status & Mode Selection */}
      <div className="absolute top-3 left-3 z-20 flex flex-col gap-2 max-w-[310px]">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 backdrop-blur-md text-slate-200">
          <span className="h-2 w-2 rounded-full bg-rose-500 animate-ping" />
          <span className="text-[11px] font-bold tracking-tight text-white uppercase font-mono">
            3D DISASTER SIMULATOR
          </span>
          <span className="text-[10px] text-slate-400 font-mono ml-auto">
            {isSimulating ? `T+${elapsed}s` : "STANDBY"}
          </span>
        </div>

        {/* Disaster Mode Switcher */}
        <div className="p-1.5 rounded-xl bg-slate-900/85 border border-slate-800 backdrop-blur-md flex flex-wrap gap-1">
          {MODES.map(({ id, label, Icon }) => {
            const isActive = disasterType === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => onDisasterTypeChange(id)}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] transition-all cursor-pointer",
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
            onClick={() => setNight(!night)}
            title="Beralih Siang/Malam"
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            {night ? <Sun className="h-3.5 w-3.5 text-amber-300" /> : <Moon className="h-3.5 w-3.5" />}
          </button>
          <button
            type="button"
            onClick={() => setSound(!sound)}
            title="Mute / Aktifkan Suara"
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            {sound ? (
              <Volume2 className="h-3.5 w-3.5 text-emerald-400" />
            ) : (
              <VolumeX className="h-3.5 w-3.5 text-rose-400" />
            )}
          </button>
          <button
            type="button"
            onClick={() => wrapperRef.current?.requestFullscreen().catch(() => {})}
            title="Fullscreen"
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
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
            {CAMERAS.map(({ id, label, Icon }) => {
              const isActive = cameraPreset === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => handleCameraSelect(id)}
                  className={cn(
                    "flex items-center justify-end gap-1.5 px-2.5 py-1 rounded-lg text-[10px] text-right transition-all cursor-pointer",
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
          <span className="text-amber-400 font-bold">PGA: {pga.toFixed(2)}g</span>
        </div>
        <canvas
          ref={seismoRef}
          width={260}
          height={52}
          className="w-full h-[52px] rounded-lg border border-slate-800/90 bg-slate-950/80 block"
        />
      </div>

      {/* Bottom Right: Interactive Controls (Reset & Play/Pause) */}
      <div className="absolute bottom-3 right-3 z-20 flex items-center gap-2">
        <button
          type="button"
          onClick={() => {
            setElapsed(0);
            simRef.current.t = 0;
            onSimulatingChange(false);
          }}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white text-xs font-semibold backdrop-blur-md transition-all shadow-md cursor-pointer"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span>Reset</span>
        </button>
        <button
          type="button"
          onClick={() => onSimulatingChange(!isSimulating)}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold tracking-wide transition-all shadow-lg backdrop-blur-md text-white cursor-pointer",
            isSimulating
              ? "bg-amber-600 hover:bg-amber-500 shadow-amber-600/30"
              : "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30"
          )}
        >
          {isSimulating ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          <span>{isSimulating ? "Jeda Simulasi" : "Mulai Simulasi"}</span>
        </button>
      </div>

      {/* OrbitControls Mouse Hint */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 pointer-events-none hidden md:block">
        <span className="text-[10px] text-slate-400/90 font-mono tracking-wider bg-slate-950/75 px-3 py-1 rounded-full border border-slate-800/60">
          Tahan &amp; geser mouse untuk rotasi 3D • Scroll untuk zoom
        </span>
      </div>
    </div>
  );
}
