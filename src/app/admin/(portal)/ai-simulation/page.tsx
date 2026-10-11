"use client";

import { useState } from "react";
import { AdminHeader } from "@/components/admin/header";
import { Cpu, Sparkles, Sliders, Save, Play, CheckCircle2 } from "lucide-react";

export default function AdminAISimulationPage() {
  const [selectedModule, setSelectedModule] = useState<"IMPACT" | "EVAC" | "ASSISTANT">("IMPACT");
  const [provider, setProvider] = useState("GOOGLE_GEMINI");
  const [model, setModel] = useState("gemini-1.5-flash");
  const [temperature, setTemperature] = useState(0.4);
  const [maxTokens, setMaxTokens] = useState(2048);

  const [prompts, setPrompts] = useState({
    IMPACT: `Anda adalah AI Disaster Impact Analyzer pada platform DISASTRA.
Tugas Anda adalah memprediksi:
1. Estimasi radius zona bahaya primer dan sekunder berdasarkan magnitudo, kedalaman, dan geologi lokal.
2. Kerusakan fasilitas vital: Rumah sakit, gardu listrik, pasokan air bersih, dan jembatan utama.
3. Estimasi potensi tsunami dan waktu tiba gelombang pertama (jika gempa bawah laut).
Gunakan bahasa analitis, objektif, dan berbasis protokol mitigasi bencana BNPB/USGS.`,
    EVAC: `Anda adalah AI Evacuation Assistant pada platform DISASTRA.
Tugas Anda:
1. Menentukan titik kumpul evakuasi tertinggi dan teraman dari zona bahaya.
2. Mengidentifikasi alternatif rute darurat jika jalan protokol tertutup reruntuhan atau longsor.
3. Memberikan rekomendasi waktu evakuasi emas (golden time) sebelum gelombang atau gempa susulan tiba.`,
    ASSISTANT: `Anda adalah AI Disaster Assistant interaktif DISASTRA.
Berikan panduan keselamatan yang menenangkan, ringkas, terarah, dan mudah dipahami korban bencana.
Prioritaskan keselamatan nyawa (Drop, Cover, Hold On; Jauhi kaca; Menuju tempat terbuka).`,
  });

  const [savedStatus, setSavedStatus] = useState(false);

  const handleSave = () => {
    setSavedStatus(true);
    setTimeout(() => setSavedStatus(false), 2500);
  };

  const presets = [
    {
      id: "sim-1",
      title: "Megathrust Selat Sunda M 8.8",
      type: "EARTHQUAKE & TSUNAMI",
      waveHeight: "15 - 20 meter",
      arrivalMinutes: "25 Menit",
      blackoutRisk: "CRITICAL (90% Kawasan Pesisir)",
    },
    {
      id: "sim-2",
      title: "Patahan Aktif Sesar Lembang M 6.8",
      type: "SHALLOW CRUSTAL FAULT",
      waveHeight: "N/A (Daratan)",
      arrivalMinutes: "Instant",
      blackoutRisk: "HIGH (Bandung Raya & KBB)",
    },
    {
      id: "sim-3",
      title: "Tsunami Mentawai Megathrust M 8.9",
      type: "SUBDUCTION ZONE",
      waveHeight: "18 - 24 meter",
      arrivalMinutes: "18 Menit",
      blackoutRisk: "TOTAL (Sumatera Barat)",
    },
  ];

  return (
    <div>
      <AdminHeader
        title="AI Intelligence & Simulation Configuration"
        subtitle="Manage generative disaster models, system prompts, and 3D simulation cascade rules"
      />

      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        {/* Module Switcher */}
        <div className="flex border-b border-slate-800 gap-2">
          <button
            onClick={() => setSelectedModule("IMPACT")}
            className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 ${
              selectedModule === "IMPACT"
                ? "border-rose-500 text-rose-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            AI Impact Analyzer
          </button>
          <button
            onClick={() => setSelectedModule("EVAC")}
            className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 ${
              selectedModule === "EVAC"
                ? "border-rose-500 text-rose-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            AI Evacuation Assistant
          </button>
          <button
            onClick={() => setSelectedModule("ASSISTANT")}
            className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 ${
              selectedModule === "ASSISTANT"
                ? "border-rose-500 text-rose-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            AI Disaster Q&A Assistant
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Prompt Tuning Column */}
          <div className="lg:col-span-2 space-y-4">
            <div className="p-5 rounded-xl bg-slate-900/70 border border-slate-800 shadow-xl">
              <div className="flex items-center justify-between mb-3">
                <label className="text-xs font-bold text-slate-200 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-rose-400" />
                  System Prompt Directive ({selectedModule})
                </label>
                <span className="text-[10px] text-slate-500 font-mono">Markdown & Instructions</span>
              </div>
              <textarea
                rows={10}
                value={prompts[selectedModule]}
                onChange={(e) =>
                  setPrompts({ ...prompts, [selectedModule]: e.target.value })
                }
                className="w-full p-3.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-xs font-mono leading-relaxed focus:outline-none focus:border-rose-500 transition-all resize-y"
              />

              <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-800/80">
                <span className="text-[11px] text-slate-500">
                  Changes take effect immediately on next inference call
                </span>
                <button
                  onClick={handleSave}
                  className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-lg shadow-rose-600/20 cursor-pointer"
                >
                  {savedStatus ? (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                      <span>Saved!</span>
                    </>
                  ) : (
                    <>
                      <Save className="h-3.5 w-3.5" />
                      <span>Save System Prompt</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Simulation Presets List */}
            <div className="p-5 rounded-xl bg-slate-900/70 border border-slate-800 shadow-xl">
              <h3 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
                <Cpu className="h-4 w-4 text-rose-500" />
                3D What-If Simulation Presets
              </h3>
              <p className="text-xs text-slate-400 mb-4">
                Pre-configured geological scenarios for stress-testing evacuation routes & cascade impact
              </p>

              <div className="space-y-3">
                {presets.map((item) => (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-lg bg-slate-950 border border-slate-850 hover:border-slate-750 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div>
                      <div className="font-bold text-xs text-slate-200">{item.title}</div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                        {item.type} &bull; Wave: {item.waveHeight} &bull; T-Arrival:{" "}
                        {item.arrivalMinutes}
                      </div>
                      <div className="text-[10px] text-rose-400 mt-1 font-mono">
                        Cascade Risk: {item.blackoutRisk}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-semibold flex items-center gap-1.5 self-start sm:self-center"
                    >
                      <Play className="h-3 w-3 text-rose-400" />
                      <span>Test Scenario</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Hyperparameters & Model Settings Column */}
          <div className="space-y-4">
            <div className="p-5 rounded-xl bg-slate-900/70 border border-slate-800 shadow-xl">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-4 flex items-center gap-2">
                <Sliders className="h-4 w-4 text-rose-500" />
                Model Hyperparameters
              </h3>

              <div className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1.5">
                    Foundation Provider
                  </label>
                  <select
                    value={provider}
                    onChange={(e) => setProvider(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none"
                  >
                    <option value="GOOGLE_GEMINI">Google Gemini API (Official)</option>
                    <option value="OPENAI">OpenAI (GPT-4o)</option>
                    <option value="ANTHROPIC">Anthropic Claude</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1.5">Model Variant</label>
                  <select
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none"
                  >
                    <option value="gemini-1.5-flash">gemini-1.5-flash (Fast & Multimodal)</option>
                    <option value="gemini-1.5-pro">gemini-1.5-pro (High Reasoning)</option>
                    <option value="gpt-4o">gpt-4o (OpenAI Omni)</option>
                  </select>
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <label className="text-slate-400 font-semibold">Temperature</label>
                    <span className="font-mono text-rose-400">{temperature}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={temperature}
                    onChange={(e) => setTemperature(parseFloat(e.target.value))}
                    className="w-full accent-rose-500"
                  />
                  <span className="text-[10px] text-slate-500 block mt-1">
                    Lower values = factual & deterministic impact analysis
                  </span>
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <label className="text-slate-400 font-semibold">Max Tokens</label>
                    <span className="font-mono text-rose-400">{maxTokens}</span>
                  </div>
                  <input
                    type="range"
                    min="512"
                    max="4096"
                    step="256"
                    value={maxTokens}
                    onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                    className="w-full accent-rose-500"
                  />
                </div>
              </div>
            </div>

            {/* AI Health Notice */}
            <div className="p-4 rounded-xl bg-slate-900/50 border border-emerald-500/20 text-xs">
              <div className="flex items-center gap-2 text-emerald-400 font-bold mb-1">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                Gemini API Active
              </div>
              <p className="text-slate-400 text-[11px]">
                API Key detected. Responses are streamed with low-latency serverless edge handlers.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
