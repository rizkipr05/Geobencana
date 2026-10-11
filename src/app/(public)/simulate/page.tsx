"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import {
  Cpu,
  Layers,
  AlertTriangle,
  Play,
  RotateCcw,
  Waves,
  Zap,
  Building2,
  Navigation,
  Activity,
  Flame,
  FileSpreadsheet,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Dynamically import 3D Canvas with ssr: false
const ThreeEarthquakeCanvas = dynamic(
  () =>
    import("@/components/simulation/three-earthquake-canvas").then(
      (mod) => mod.ThreeEarthquakeCanvas
    ),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full min-h-[460px] rounded-2xl border border-slate-800 bg-slate-950 flex flex-col items-center justify-center text-slate-500">
        <Activity className="h-8 w-8 text-rose-500 animate-spin mb-3" />
        <span className="font-mono text-xs">Memuat WebGL 3D Simulation Engine...</span>
      </div>
    ),
  }
);

interface Preset {
  name: string;
  location: string;
  magnitude: number;
  depthKm: number;
  slipMeters: number;
  mechanism: "SUBDUCTION" | "STRIKE_SLIP" | "NORMAL";
  description: string;
}

const PRESETS: Preset[] = [
  {
    name: "Megathrust Selat Sunda",
    location: "Selat Sunda / Banten",
    magnitude: 8.8,
    depthKm: 15,
    slipMeters: 18,
    mechanism: "SUBDUCTION",
    description: "Skenario ruptur penuh segmen Selat Sunda - Jawa Barat dengan potensi tsunami pesisir Anyer & Lampung.",
  },
  {
    name: "Sesar Lembang",
    location: "Cekungan Bandung, Jawa Barat",
    magnitude: 6.8,
    depthKm: 10,
    slipMeters: 2.8,
    mechanism: "STRIKE_SLIP",
    description: "Skenario sesar darat aktif membelah utara Bandung, guncangan tanah sangat kuat di area padat penduduk.",
  },
  {
    name: "Megathrust Mentawai",
    location: "Kepulauan Mentawai, Sumatera Barat",
    magnitude: 8.9,
    depthKm: 18,
    slipMeters: 20,
    mechanism: "SUBDUCTION",
    description: "Zona seismic gap Mentawai, potensi tsunami tinggi menuju pesisir Kota Padang dan Bengkulu.",
  },
  {
    name: "Sesar Palu-Koro",
    location: "Teluk Palu, Sulawesi Tengah",
    magnitude: 7.5,
    depthKm: 10,
    slipMeters: 6.0,
    mechanism: "STRIKE_SLIP",
    description: "Skenario sesar mendatar geser cepat memicu longsoran dasar laut & tsunami teluk sempit.",
  },
];

export default function SimulatePage() {
  const [magnitude, setMagnitude] = useState<number>(8.8);
  const [depthKm, setDepthKm] = useState<number>(15);
  const [slipMeters, setSlipMeters] = useState<number>(18);
  const [mechanism, setMechanism] = useState<"SUBDUCTION" | "STRIKE_SLIP" | "NORMAL">("SUBDUCTION");
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [activePreset, setActivePreset] = useState<string>("Megathrust Selat Sunda");

  // Physics & Impact Calculations
  const isTsunamiPotential = magnitude >= 7.0 && depthKm <= 50 && mechanism === "SUBDUCTION";
  const energyJoules = Math.pow(10, 4.8 + 1.5 * magnitude);
  const megatonsTNT = energyJoules / 4.184e15;
  const pgaEstimated = Math.min(1.8, ((Math.pow(10, 0.3 * magnitude) / Math.sqrt(depthKm * 20)) * 0.15)).toFixed(2);
  
  // Cascade damage estimation
  const bridgeRisk = Math.min(96, Math.round(magnitude * 10.5 - depthKm * 0.2));
  const gridBlackout = Math.min(99, Math.round(magnitude * 11.2 - depthKm * 0.15));
  const hospitalOverload = Math.min(98, Math.round(magnitude * 10.8));
  const estimatedWaveHeight = isTsunamiPotential ? (slipMeters * 0.75 + (magnitude - 7) * 4.2).toFixed(1) : "0";
  const estimatedEtaMins = isTsunamiPotential ? Math.max(12, Math.round(depthKm * 0.8 + 14)) : 0;

  const handleApplyPreset = (p: Preset) => {
    setActivePreset(p.name);
    setMagnitude(p.magnitude);
    setDepthKm(p.depthKm);
    setSlipMeters(p.slipMeters);
    setMechanism(p.mechanism);
  };

  const triggerRunSimulation = () => {
    setIsSimulating(true);
    setTimeout(() => setIsSimulating(false), 3500);
  };

  const handleExportJSON = () => {
    const report = {
      scenario: activePreset,
      parameters: { magnitude, depthKm, slipMeters, mechanism },
      physics: {
        energyJoules,
        megatonsTNT,
        pga_g: pgaEstimated,
        tsunami: isTsunamiPotential,
        waveHeightMeters: estimatedWaveHeight,
        arrivalMins: estimatedEtaMins,
      },
      cascadeImpact: {
        bridgeFailureRiskPercent: bridgeRisk,
        powerGridBlackoutPercent: gridBlackout,
        hospitalOverloadPercent: hospitalOverload,
      },
      generatedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `simulation-${activePreset.toLowerCase().replace(/\s+/g, "-")}.json`;
    a.click();
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-950 text-slate-100 p-4 sm:p-6 lg:p-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="p-1 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <Cpu className="h-4 w-4" />
            </span>
            <span className="text-xs font-mono font-semibold uppercase tracking-wider text-rose-400">
              PHYSICS &amp; TECTONIC DYNAMICS ENGINE
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            AI What-If 3D Disaster Simulator
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">
            Simulasikan dinamika ruptur lempeng tektonik, deformasi dasar laut, perambatan tsunami, dan
            analisis dampak berantai terhadap infrastruktur perkotaan.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={triggerRunSimulation}
            disabled={isSimulating}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs tracking-wider uppercase transition-all shadow-lg",
              isSimulating
                ? "bg-rose-700 text-slate-200 cursor-not-allowed"
                : "bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30 hover:scale-[1.02]"
            )}
          >
            <Play className={cn("h-4 w-4", isSimulating && "animate-spin")} />
            <span>{isSimulating ? "Simulasi Berjalan..." : "Jalankan Simulasi"}</span>
          </button>

          <button
            onClick={handleExportJSON}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-750 text-slate-300 hover:text-white text-xs font-semibold transition-all"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-400" />
            <span className="hidden sm:inline">Ekspor Data</span>
          </button>
        </div>
      </div>

      {/* Preset Badges Bar */}
      <div className="mb-6 p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <span className="text-xs font-mono font-semibold text-slate-400 flex items-center gap-1.5 shrink-0">
          <Layers className="h-3.5 w-3.5 text-rose-400" />
          <span>Skenario Standar:</span>
        </span>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => {
            const isSelected = activePreset === p.name;
            return (
              <button
                key={p.name}
                onClick={() => handleApplyPreset(p)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium transition-all border",
                  isSelected
                    ? "bg-rose-600/20 text-rose-300 border-rose-500/50 shadow-sm font-semibold"
                    : "bg-slate-950/60 text-slate-400 border-slate-800 hover:text-slate-200 hover:bg-slate-800/50"
                )}
              >
                {p.name} (M {p.magnitude})
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Grid: 3D Canvas + Controls & Cascade Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: 3D Canvas & Physics Metrics (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          <div className="h-[480px]">
            <ThreeEarthquakeCanvas
              magnitude={magnitude}
              depthKm={depthKm}
              slipMeters={slipMeters}
              isTsunamiActive={isTsunamiPotential}
              isSimulating={isSimulating}
            />
          </div>

          {/* Quick Real-Time Telemetry Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
              <span className="text-[10px] font-mono text-slate-400 uppercase">Energi Terlepas</span>
              <p className="text-base font-extrabold text-white mt-0.5 font-mono">
                {megatonsTNT.toFixed(1)} MT
              </p>
              <span className="text-[10px] text-slate-500">Eqv. Trinitrotoluena</span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
              <span className="text-[10px] font-mono text-slate-400 uppercase">Estimasi PGA</span>
              <p className="text-base font-extrabold text-amber-400 mt-0.5 font-mono">
                {pgaEstimated} g
              </p>
              <span className="text-[10px] text-slate-500">Percepatan Tanah</span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
              <span className="text-[10px] font-mono text-slate-400 uppercase">Potensi Tsunami</span>
              <p
                className={cn(
                  "text-base font-extrabold mt-0.5 font-mono",
                  isTsunamiPotential ? "text-rose-400" : "text-emerald-400"
                )}
              >
                {isTsunamiPotential ? "TINGGI" : "NIHIL"}
              </p>
              <span className="text-[10px] text-slate-500">
                {isTsunamiPotential ? `H ≈ ${estimatedWaveHeight} m` : "Tanpa Deformasi Air"}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
              <span className="text-[10px] font-mono text-slate-400 uppercase">Estimasi ETA Ombak</span>
              <p className="text-base font-extrabold text-sky-400 mt-0.5 font-mono">
                {isTsunamiPotential ? `${estimatedEtaMins} mnt` : "—"}
              </p>
              <span className="text-[10px] text-slate-500">Waktu Hingga Pesisir</span>
            </div>
          </div>
        </div>

        {/* Right Column: Parameters & Cascade Impact Analyzer (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          {/* Parameter Sliders Card */}
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800">
            <h2 className="text-sm font-bold text-white flex items-center justify-between mb-4">
              <span className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-rose-500" />
                <span>Parameter Seismik &amp; Sesar</span>
              </span>
              <button
                onClick={() => {
                  setMagnitude(7.0);
                  setDepthKm(20);
                  setSlipMeters(5);
                  setMechanism("SUBDUCTION");
                }}
                className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Reset</span>
              </button>
            </h2>

            <div className="space-y-4">
              {/* Magnitude Slider */}
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-slate-300 font-medium">Magnitudo Momen (Mw)</span>
                  <span className="font-mono font-bold text-rose-400">M {magnitude.toFixed(1)}</span>
                </div>
                <input
                  type="range"
                  min="5.0"
                  max="9.5"
                  step="0.1"
                  value={magnitude}
                  onChange={(e) => setMagnitude(parseFloat(e.target.value))}
                  className="w-full accent-rose-500 bg-slate-800 h-2 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500 mt-0.5">
                  <span>5.0 (Kuat)</span>
                  <span>7.0 (Merusak)</span>
                  <span>9.5 (Katastrofik)</span>
                </div>
              </div>

              {/* Depth Slider */}
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-slate-300 font-medium">Kedalaman Hiposenter</span>
                  <span className="font-mono font-bold text-amber-400">{depthKm} km</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="150"
                  step="5"
                  value={depthKm}
                  onChange={(e) => setDepthKm(parseInt(e.target.value))}
                  className="w-full accent-amber-500 bg-slate-800 h-2 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500 mt-0.5">
                  <span>5 km (Sangat Dangkal)</span>
                  <span>60 km</span>
                  <span>150 km (Menengah)</span>
                </div>
              </div>

              {/* Fault Slip Slider */}
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-slate-300 font-medium">Pergeseran Sesar (Displacement Slip)</span>
                  <span className="font-mono font-bold text-sky-400">{slipMeters} meter</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="25"
                  step="0.5"
                  value={slipMeters}
                  onChange={(e) => setSlipMeters(parseFloat(e.target.value))}
                  className="w-full accent-sky-500 bg-slate-800 h-2 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500 mt-0.5">
                  <span>0.5 m</span>
                  <span>12 m</span>
                  <span>25 m</span>
                </div>
              </div>

              {/* Fault Mechanism */}
              <div>
                <label className="text-xs text-slate-300 font-medium block mb-1.5">
                  Mekanisme Patahan
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "SUBDUCTION", label: "Megathrust" },
                    { id: "STRIKE_SLIP", label: "Strike-Slip" },
                    { id: "NORMAL", label: "Normal Fault" },
                  ].map((mech) => (
                    <button
                      key={mech.id}
                      type="button"
                      onClick={() => setMechanism(mech.id as any)}
                      className={cn(
                        "py-2 px-2 rounded-lg text-xs font-semibold text-center transition-all border",
                        mechanism === mech.id
                          ? "bg-slate-800 text-rose-400 border-rose-500/50"
                          : "bg-slate-950/60 text-slate-400 border-slate-800 hover:text-slate-200"
                      )}
                    >
                      {mech.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* AI Cascade Impact Analyzer Card */}
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 flex-1">
            <h2 className="text-sm font-bold text-white flex items-center gap-2 mb-3">
              <Zap className="h-4 w-4 text-amber-400" />
              <span>AI Cascade Impact Analyzer</span>
            </h2>
            <p className="text-xs text-slate-400 mb-4">
              Prediksi dampak rantai kerusakan terhadap fasilitas publik &amp; jalur evakuasi:
            </p>

            <div className="space-y-3.5">
              {/* Bridge and Roads */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-300 flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 text-rose-400" />
                    <span>Jembatan &amp; Koridor Jalan Rusak</span>
                  </span>
                  <span className="font-mono font-bold text-rose-400">{bridgeRisk}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-rose-500 transition-all duration-500"
                    style={{ width: `${bridgeRisk}%` }}
                  />
                </div>
              </div>

              {/* Power Grid */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-300 flex items-center gap-1.5">
                    <Zap className="h-3.5 w-3.5 text-amber-400" />
                    <span>Probabilitas Pemadaman Listrik Gardu</span>
                  </span>
                  <span className="font-mono font-bold text-amber-400">{gridBlackout}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-amber-500 transition-all duration-500"
                    style={{ width: `${gridBlackout}%` }}
                  />
                </div>
              </div>

              {/* Hospitals */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-300 flex items-center gap-1.5">
                    <Activity className="h-3.5 w-3.5 text-sky-400" />
                    <span>Overload Kapasitas Rumah Sakit</span>
                  </span>
                  <span className="font-mono font-bold text-sky-400">{hospitalOverload}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-sky-500 transition-all duration-500"
                    style={{ width: `${hospitalOverload}%` }}
                  />
                </div>
              </div>
            </div>

            {/* AI Evacuation Recommendation Banner */}
            <div className="mt-5 p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/80">
              <div className="flex items-start gap-2.5">
                <Navigation className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-white">Rekomendasi Rute Evakuasi AI</h4>
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                    {isTsunamiPotential
                      ? `Peringatan Tsunami Dikeluarkan! Waktu evakuasi horizontal ${estimatedEtaMins} menit. Jauhi garis pantai menuju dataran tinggi > 20 mdpl. Hindari jembatan sungai.`
                      : `Guncangan tanah diperkirakan kuat (PGA ${pgaEstimated}g). Utamakan evakuasi tanah lapang, waspadai retakan tanah dan material kaca perkotaan.`}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
