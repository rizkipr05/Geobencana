"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle, Building2, Camera as CameraIcon, Droplets, Flame, Globe, Maximize, Moon, Mountain,
  Pause, Play, RotateCcw, Sun, Volume2, VolumeX, Waves, Zap, type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ArcRotateCamera, Engine, PBRMaterial, Scene } from "@babylonjs/core";
import type { CameraPreset, SimDisasterType, ThreeEarthquakeCanvasProps } from "./types";
import { CAMERA_BY_DISASTER, CAMERA_PRESETS } from "./babylon/camera-presets";
import { estimatePga, estimateTsunamiHeight } from "./babylon/physics";

export type { SimDisasterType, SimMechanism } from "./types";

const MODES: { id: SimDisasterType; label: string; Icon: LucideIcon }[] = [
  { id: "EARTHQUAKE", label: "Gempa", Icon: Zap }, { id: "TSUNAMI", label: "Tsunami", Icon: Waves },
  { id: "VOLCANO", label: "Gunung Api", Icon: Mountain }, { id: "LIQUEFACTION", label: "Likuifaksi", Icon: Droplets },
  { id: "WILDFIRE", label: "Kebakaran Hutan", Icon: Flame },
];
const CAMERAS: { id: CameraPreset; label: string; Icon: LucideIcon }[] = [
  { id: "orbit", label: "Orbit Selat", Icon: Globe }, { id: "city", label: "Kota & Gedung", Icon: Building2 },
  { id: "coast", label: "Pesisir & Jembatan", Icon: Waves }, { id: "crater", label: "Kawah Gunung Api", Icon: Mountain },
  { id: "fault", label: "Sesar & Patahan", Icon: Zap }, { id: "forest", label: "Hutan & Lereng", Icon: Flame },
];

export function ThreeEarthquakeCanvas(props: ThreeEarthquakeCanvasProps) {
  const { magnitude, depthKm, slipMeters, isSimulating, mechanism, disasterType, onDisasterTypeChange, onSimulatingChange } = props;
  const wrapperRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const seismoRef = useRef<HTMLCanvasElement>(null);
  const [selectedCamera, setSelectedCamera] = useState<CameraPreset | null>(null);
  const camera = selectedCamera ?? CAMERA_BY_DISASTER[disasterType];
  const [night, setNight] = useState(false);
  const [sound, setSound] = useState(true);
  const [elapsed, setElapsed] = useState(0);
  const [renderError, setRenderError] = useState("");
  const simRef = useRef({ running: isSimulating, magnitude, depthKm, disasterType });
  useEffect(() => { simRef.current = { running: isSimulating, magnitude, depthKm, disasterType }; }, [isSimulating, magnitude, depthKm, disasterType]);
  const warning = !isSimulating ? "" : estimatePga(magnitude, depthKm) > 0.6
    ? "BAHAYA: Guncangan sangat kuat — evakuasi ke area terbuka"
    : disasterType === "TSUNAMI" && estimateTsunamiHeight(magnitude, slipMeters, mechanism, depthKm) > 0
      ? "POTENSI TSUNAMI: Menjauhi pantai dan bergerak ke tempat tinggi"
      : disasterType === "LIQUEFACTION" ? "LIKUEFAKSI: Tanah jenuh air dapat kehilangan daya dukung" : "";
  const audioRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    let disposed = false;
    let engine: Engine | undefined;
    let scene: Scene | undefined;
    let activeCamera: ArcRotateCamera | undefined;
    let unregister: (() => void) | undefined;
    void (async () => {
      const B = await import("@babylonjs/core");
      await import("@babylonjs/loaders");
      const canvas = canvasRef.current;
      if (!canvas || disposed) return;
      try {
        if (!canvas.clientWidth || !canvas.clientHeight) throw new Error("Canvas 3D belum memiliki ukuran.");
        engine = new B.Engine(canvas, true, { preserveDrawingBuffer: false, stencil: true, adaptToDeviceRatio: true, antialias: true });
        scene = new B.Scene(engine);
        scene.clearColor = new B.Color4(0.52, 0.68, 0.75, 1);
        const { createDisasterScene } = await import("./babylon/scene");
        const features = createDisasterScene(scene, disasterType);
        const preset = CAMERA_PRESETS[camera];
        const target = new B.Vector3(...preset.target);
        const offset = new B.Vector3(...preset.position).subtract(target);
        activeCamera = new B.ArcRotateCamera("orbit-camera", Math.atan2(offset.z, offset.x), Math.acos(offset.y / offset.length()), offset.length(), target, scene);
        activeCamera.attachControl(canvas, true);
        activeCamera.lowerRadiusLimit = 5; activeCamera.upperRadiusLimit = 72;
        activeCamera.lowerBetaLimit = 0.2; activeCamera.upperBetaLimit = Math.PI / 2.05;
        activeCamera.minZ = 0.1;
        activeCamera.wheelPrecision = 35;
        scene.activeCamera = activeCamera;
        try {
          const sun = scene.lights.find((light) => light.name === "sun");
          if (sun instanceof B.DirectionalLight && engine.getCaps().standardDerivatives) {
            const shadow = new B.ShadowGenerator(1024, sun);
            shadow.useBlurExponentialShadowMap = true; shadow.blurKernel = 16;
            for (const mesh of scene.meshes) if (mesh.name.startsWith("building-") || mesh.name.startsWith("trunk-")) shadow.addShadowCaster(mesh);
          }
        } catch (error) {
          console.warn("Babylon shadows unavailable; rendering without shadows", error);
        }
        scene.meshes.forEach((mesh) => { mesh.receiveShadows = true; });
        const resize = () => {
          if (!canvas.parentElement || !engine) return;
          const { width, height } = canvas.parentElement.getBoundingClientRect();
          if (width < 2 || height < 2) return;
          const ratio = Math.min(window.devicePixelRatio || 1, 1.75);
          canvas.width = Math.round(width * ratio);
          canvas.height = Math.round(height * ratio);
          canvas.style.width = `${width}px`;
          canvas.style.height = `${height}px`;
          engine.setSize(canvas.width, canvas.height, true);
          activeCamera!.getProjectionMatrix(true);
          scene!.render();
        };
        const observer = new ResizeObserver(resize);
        if (canvas.parentElement) observer.observe(canvas.parentElement);
        window.addEventListener("resize", resize);
        unregister = () => { observer.disconnect(); window.removeEventListener("resize", resize); };
        resize();
        engine.runRenderLoop(() => {
          if (!scene || disposed) return;
          const sim = simRef.current;
          const t = performance.now() / 1000;
          if (sim.running) {
            const amplitude = Math.min(0.11, estimatePga(sim.magnitude, sim.depthKm) * 0.07);
            if (sim.disasterType === "EARTHQUAKE" || sim.disasterType === "LIQUEFACTION") {
              scene.meshes.filter((m) => m.name.startsWith("building-")).forEach((m, i) => { m.rotation.z = Math.sin(t * 9 + i) * amplitude; });
            }
            if (sim.disasterType === "TSUNAMI") features.water.position.y = -0.62 + Math.max(0, Math.sin(t * 1.2) * 0.08);
            if (sim.disasterType === "VOLCANO") features.lava.scaling.y = 1 + Math.sin(t * 2) * 0.05;
            if (sim.disasterType === "WILDFIRE") scene.meshes.filter((m) => m.name.startsWith("crown-")).slice(0, Math.min(48, Math.floor(t * 2))).forEach((m) => { (m.material as PBRMaterial).albedoColor = new B.Color3(0.22, 0.18, 0.12); });
          }
          try { scene.render(); }
          catch (error) { console.error("Babylon scene render failed", error); }
        });
      } catch (error) {
        console.error("Babylon scene initialization failed", error);
        if (!disposed) setRenderError(error instanceof Error ? error.message : "Gagal membuat scene 3D.");
      }
    })();
    return () => { disposed = true; unregister?.(); activeCamera?.detachControl(); engine?.stopRenderLoop(); scene?.dispose(); engine?.dispose(); };
  }, [camera, disasterType]);

  useEffect(() => {
    if (!isSimulating) return;
    const id = window.setInterval(() => setElapsed((v) => v + 1), 1000);
    return () => window.clearInterval(id);
  }, [isSimulating]);

  useEffect(() => {
    const canvas = seismoRef.current; const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    const pga = estimatePga(magnitude, depthKm);
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.strokeStyle = "rgba(255,255,255,.12)"; context.beginPath(); context.moveTo(0, 26); context.lineTo(260, 26); context.stroke();
    context.strokeStyle = pga > 0.6 ? "#ef4444" : pga > 0.3 ? "#f59e0b" : "#38bdf8"; context.lineWidth = 1.7; context.beginPath();
    for (let x = 0; x < canvas.width; x++) {
      const envelope = isSimulating ? Math.min(1, pga * 1.2) : 0.08;
      const y = 26 + Math.sin(x * 0.18 + elapsed * 0.5) * Math.sin(x * 0.051 + elapsed * 0.8) * envelope * 23;
      if (x === 0) context.moveTo(x, y); else context.lineTo(x, y);
    }
    context.stroke();
  }, [magnitude, depthKm, elapsed, isSimulating]);

  useEffect(() => {
    if (!isSimulating || !sound) return;
    const AC = window.AudioContext;
    if (!audioRef.current) audioRef.current = new AC();
    const audio = audioRef.current;
    void audio.resume();
    const oscillator = audio.createOscillator(); const gain = audio.createGain();
    oscillator.type = "sine"; oscillator.frequency.value = 68; gain.gain.value = 0.012;
    oscillator.connect(gain); gain.connect(audio.destination); oscillator.start();
    return () => { oscillator.stop(); oscillator.disconnect(); gain.disconnect(); };
  }, [isSimulating, sound]);

  useEffect(() => () => { void audioRef.current?.close(); }, []);

  const toggleNight = () => {
    const next = !night; setNight(next);
    const canvas = canvasRef.current;
    if (canvas) canvas.style.filter = next ? "brightness(.63) saturate(.8)" : "none";
  };

  return <div ref={wrapperRef} className="relative h-full min-h-[460px] w-full overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl select-none">
    <canvas ref={canvasRef} className="absolute inset-0 z-0 block h-full w-full cursor-grab bg-[#91b6c4] active:cursor-grabbing" />
    {renderError && <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-900/90 p-6 text-center text-sm text-rose-200">Scene 3D gagal dimuat: {renderError}</div>}
    {warning && <div className="absolute left-1/2 top-4 z-30 flex -translate-x-1/2 items-center gap-2 rounded-full border border-rose-400/30 bg-rose-600/95 px-4 py-2 text-xs font-bold text-white shadow-lg"><AlertTriangle className="h-4 w-4" />{warning}</div>}
    <div className="absolute left-3 top-3 z-20 flex max-w-[310px] flex-col gap-2">
      <div className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/90 px-3 py-1.5 text-slate-200 backdrop-blur-md"><span className="h-2 w-2 animate-ping rounded-full bg-rose-500"/><span className="font-mono text-[11px] font-bold uppercase text-white">DISASTRA • Babylon.js</span><span className="ml-auto font-mono text-[10px] text-slate-400">{isSimulating ? `T+${elapsed}s` : "STANDBY"}</span></div>
      <div className="flex flex-wrap gap-1 rounded-xl border border-slate-800 bg-slate-900/85 p-1.5 backdrop-blur-md">{MODES.map(({id,label,Icon}) => <button key={id} type="button" onClick={() => onDisasterTypeChange(id)} className={cn("flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px]", disasterType === id ? "border-rose-500/50 bg-rose-600/80 font-semibold text-white" : "border-transparent text-slate-400 hover:bg-slate-800 hover:text-white")}><Icon className="h-3 w-3"/>{label}</button>)}</div>
    </div>
    <div className="absolute right-3 top-3 z-20 flex flex-col items-end gap-2">
      <div className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900/85 p-1 backdrop-blur-md">
        <button type="button" onClick={toggleNight} title="Beralih Siang/Malam" className="rounded-lg p-1.5 text-slate-300 hover:bg-slate-800">{night ? <Sun className="h-3.5 w-3.5 text-amber-300"/> : <Moon className="h-3.5 w-3.5"/>}</button>
        <button type="button" onClick={() => setSound(!sound)} title="Mute / Aktifkan Suara" className="rounded-lg p-1.5 text-slate-300 hover:bg-slate-800">{sound ? <Volume2 className="h-3.5 w-3.5 text-emerald-400"/> : <VolumeX className="h-3.5 w-3.5 text-rose-400"/>}</button>
        <button type="button" onClick={() => wrapperRef.current?.requestFullscreen().catch(() => {})} title="Fullscreen" className="rounded-lg p-1.5 text-slate-300 hover:bg-slate-800"><Maximize className="h-3.5 w-3.5"/></button>
      </div>
      <div className="flex flex-col gap-1 rounded-xl border border-slate-800 bg-slate-900/85 p-1.5 text-right backdrop-blur-md"><span className="flex items-center justify-end gap-1 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase text-slate-400"><CameraIcon className="h-3 w-3"/>Kamera</span>{CAMERAS.map(({id,label,Icon}) => <button key={id} type="button" onClick={() => setSelectedCamera(id)} className={cn("flex items-center justify-end gap-1.5 rounded-lg border px-2.5 py-1 text-right text-[10px]", camera === id ? "border-sky-400/40 bg-sky-500/20 font-semibold text-sky-300" : "border-transparent text-slate-400 hover:bg-slate-800/50 hover:text-white")}><Icon className="h-3 w-3"/>{label}</button>)}</div>
    </div>
    <div className="absolute bottom-3 left-3 z-20 flex w-[276px] flex-col gap-1 rounded-xl border border-slate-800 bg-slate-900/90 p-2.5 backdrop-blur-md"><div className="flex items-center justify-between px-1 font-mono text-[10px] text-slate-400"><span className="flex items-center gap-1.5 font-bold text-slate-300"><Waves className="h-3 w-3 text-rose-500"/>Seismogram Live</span><span className="font-bold text-amber-400">PGA: {estimatePga(magnitude, depthKm).toFixed(2)}g</span></div><canvas ref={seismoRef} width={260} height={52} className="block h-[52px] w-full rounded-lg border border-slate-800/90 bg-slate-950/80"/></div>
    <div className="absolute bottom-3 right-3 z-20 flex items-center gap-2"><button type="button" onClick={() => { setElapsed(0); onSimulatingChange(false); }} className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900/90 px-3.5 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white"><RotateCcw className="h-3.5 w-3.5"/>Reset</button><button type="button" onClick={() => onSimulatingChange(!isSimulating)} className={cn("flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold text-white shadow-lg", isSimulating ? "bg-amber-600 hover:bg-amber-500" : "bg-emerald-600 hover:bg-emerald-500")}>{isSimulating ? <Pause className="h-3.5 w-3.5"/> : <Play className="h-3.5 w-3.5"/>}{isSimulating ? "Jeda Simulasi" : "Mulai Simulasi"}</button></div>
    <div className="pointer-events-none absolute bottom-3 left-1/2 z-10 hidden -translate-x-1/2 md:block"><span className="rounded-full border border-slate-800/60 bg-slate-950/75 px-3 py-1 font-mono text-[10px] tracking-wider text-slate-300">Tahan &amp; geser untuk rotasi • Scroll untuk zoom</span></div>
  </div>;
}
