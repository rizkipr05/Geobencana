"use client";

import React, { useState, useEffect } from "react";
import { useTheme } from "@/context/theme-context";
import {
  Backpack,
  CheckCircle2,
  Circle,
  AlertTriangle,
  Waves,
  Mountain,
  CloudRain,
  ShieldCheck,
  RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ChecklistItem {
  id: string;
  category: "pangan" | "medis" | "dokumen" | "alat" | "pakaian";
  title: string;
  desc: string;
  essential: boolean;
}

const CHECKLIST_ITEMS: ChecklistItem[] = [
  // Pangan & Air
  {
    id: "water",
    category: "pangan",
    title: "Air Bersih Minum (Minimal 9 Liter / 3 Hari)",
    desc: "Kebutuhan vital 3 liter per hari per orang untuk hidrasi dan sanitasi dasar.",
    essential: true,
  },
  {
    id: "food_ration",
    category: "pangan",
    title: "Makanan Siap Santap Berenergi Tinggi",
    desc: "Biskuit darurat, dendeng, makanan kaleng tanpa perlu dimasak atau dihangatkan.",
    essential: true,
  },
  {
    id: "water_purifier",
    category: "pangan",
    title: "Tablet Pemurni Air / Sedotan Filter Portabel",
    desc: "Untuk memfilter sumber air darurat jika pasokan PDAM terputus total.",
    essential: false,
  },

  // Medis & P3K
  {
    id: "first_aid_kit",
    category: "medis",
    title: "Kotak P3K Lengkap",
    desc: "Kassa steril, perban elastis, antiseptik povidone iodine, plester, gunting, pinset.",
    essential: true,
  },
  {
    id: "prescribed_meds",
    category: "medis",
    title: "Obat Pribadi Rutin (Stok Minimal 7 Hari)",
    desc: "Obat hipertensi, diabetes, inhaler asma, atau obat kronis anggota keluarga.",
    essential: true,
  },
  {
    id: "masks_n95",
    category: "medis",
    title: "Masker Medis / N95 & Tisu Basah Antiseptik",
    desc: "Melindungi saluran pernapasan dari debu reruntuhan gedung atau abu vulkanik.",
    essential: true,
  },

  // Dokumen & Finansial
  {
    id: "waterproof_docs",
    category: "dokumen",
    title: "Salinan Dokumen Berharga Kedap Air",
    desc: "Fotokopi KTP, Kartu Keluarga, Akta Kelahiran, Polis Asuransi dalam pouch plastik kedap air.",
    essential: true,
  },
  {
    id: "emergency_cash",
    category: "dokumen",
    title: "Uang Tunai Pecahan Kecil",
    desc: "ATM & mesin EDC dipastikan lumpuh saat listrik padam. Uang tunai mutlak diperlukan.",
    essential: true,
  },

  // Alat & Komunikasi
  {
    id: "flashlight",
    category: "alat",
    title: "Senter LED Taktis & Baterai Cadangan",
    desc: "Sumber pencahayaan utama saat terjadi pemadaman listrik total malam hari.",
    essential: true,
  },
  {
    id: "emergency_whistle",
    category: "alat",
    title: "Peluit Darurat Tanpa Bola (Pealess Whistle)",
    desc: "Menghasilkan suara 100+ dB untuk memandu tim SAR jika Anda terjebak reruntuhan.",
    essential: true,
  },
  {
    id: "powerbank",
    category: "alat",
    title: "Powerbank Kapasitas Tinggi (Minimal 20.000 mAh)",
    desc: "Untuk menjaga ponsel tetap aktif memantau informasi resmi BMKG dan menghubungi keluarga.",
    essential: true,
  },
  {
    id: "multitool",
    category: "alat",
    title: "Pisau Lipat Serbaguna (Multitool / Swiss Army)",
    desc: "Pembuka kaleng, pemotong tali, obeng, dan tang serbaguna.",
    essential: false,
  },

  // Pakaian & Perlindungan
  {
    id: "thermal_blanket",
    category: "pakaian",
    title: "Selimut Termal Foil Darurat (Mylar Space Blanket)",
    desc: "Mencegah hipotermia saat berada di tempat penampungan terbuka atau malam hari yang dingin.",
    essential: true,
  },
  {
    id: "raincoat",
    category: "pakaian",
    title: "Jas Hujan Ponco Tahan Air",
    desc: "Perlindungan cuaca basah dan dapat digunakan sebagai terpal darurat sementara.",
    essential: false,
  },
];

export default function PreparednessPage() {
  const { isDark } = useTheme();
  const [checkedIds, setCheckedIds] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("disastra_survival_kit");
        if (saved) return JSON.parse(saved);
      } catch {
        // ignore
      }
    }
    return [];
  });
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [activeSopTab, setActiveSopTab] = useState<"gempa" | "tsunami" | "gunung" | "banjir">("gempa");

  useEffect(() => {
    document.title = "Kesiapsiagaan & Panduan Mitigasi | DISASTRA AI";
  }, []);

  const toggleItem = (id: string) => {
    const next = checkedIds.includes(id)
      ? checkedIds.filter((item) => item !== id)
      : [...checkedIds, id];
    setCheckedIds(next);
    try {
      localStorage.setItem("disastra_survival_kit", JSON.stringify(next));
    } catch {
      // ignore
    }
  };

  const handleReset = () => {
    setCheckedIds([]);
    try {
      localStorage.removeItem("disastra_survival_kit");
    } catch {
      // ignore
    }
  };

  const progressPercent = Math.round((checkedIds.length / CHECKLIST_ITEMS.length) * 100);

  const filteredItems =
    activeCategory === "all"
      ? CHECKLIST_ITEMS
      : CHECKLIST_ITEMS.filter((i) => i.category === activeCategory);

  return (
    <div
      className={cn(
        "flex-1 p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto w-full transition-colors duration-200",
        isDark ? "bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-900"
      )}
    >
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="p-1 rounded bg-rose-500/10 text-rose-500 border border-rose-500/20">
              <Backpack className="h-4 w-4" />
            </span>
            <span className="text-xs font-mono font-semibold uppercase tracking-wider text-rose-500">
              72-HOUR SURVIVAL PROTOCOL
            </span>
          </div>
          <h1 className={cn("text-2xl sm:text-3xl font-extrabold transition-colors", isDark ? "text-white" : "text-slate-900")}>
            Kesiapsiagaan Darurat &amp; Tas Siaga Bencana
          </h1>
          <p className={cn("text-xs sm:text-sm mt-1 max-w-2xl transition-colors", isDark ? "text-slate-400" : "text-slate-600")}>
            Panduan mandiri bertahan hidup 72 jam pertama pasca bencana sebelum kedatangan tim bantuan
            resmi dan prosedur standar operasi evakuasi.
          </p>
        </div>

        {/* Readiness Meter Card */}
        <div
          className={cn(
            "p-4 rounded-2xl flex items-center gap-4 shrink-0 shadow-sm border transition-colors",
            isDark ? "bg-slate-900/90 border-slate-800" : "bg-white border-slate-200 shadow-slate-200/50"
          )}
        >
          <div className="relative h-14 w-14 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
              <path
                className={isDark ? "text-slate-800" : "text-slate-200"}
                strokeWidth="3.5"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className="text-rose-500 transition-all duration-500"
                strokeDasharray={`${progressPercent}, 100`}
                strokeWidth="3.5"
                strokeLinecap="round"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <span className={cn("absolute font-mono font-black text-sm", isDark ? "text-white" : "text-slate-900")}>
              {progressPercent}%
            </span>
          </div>

          <div>
            <span className={cn("text-[11px] font-mono uppercase", isDark ? "text-slate-400" : "text-slate-500")}>
              Kesiapan Tas Siaga
            </span>
            <p className={cn("text-xs font-bold mt-0.5", isDark ? "text-white" : "text-slate-900")}>
              {checkedIds.length} dari {CHECKLIST_ITEMS.length} Barang Siap
            </p>
            <span className="text-[10px] text-emerald-500 font-medium">Tersimpan di Peramban</span>
          </div>
        </div>
      </div>

      {/* Section 1: Interactive Checklist */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          {/* Category Tabs */}
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: "all", label: "Semua Kebutuhan" },
              { id: "pangan", label: "Air & Pangan" },
              { id: "medis", label: "Medis & P3K" },
              { id: "dokumen", label: "Dokumen & Finansial" },
              { id: "alat", label: "Alat & Komunikasi" },
              { id: "pakaian", label: "Perlindungan" },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-colors border",
                  activeCategory === cat.id
                    ? isDark
                      ? "bg-rose-600/20 text-rose-300 border-rose-500/40"
                      : "bg-rose-50 text-rose-600 border-rose-200"
                    : isDark
                    ? "bg-slate-900/60 text-slate-400 border-slate-800 hover:text-slate-200"
                    : "bg-white text-slate-600 border-slate-200 hover:text-slate-900 hover:bg-slate-100 shadow-sm"
                )}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {checkedIds.length > 0 && (
            <button
              onClick={handleReset}
              className={cn(
                "text-xs flex items-center gap-1.5 transition-colors self-start sm:self-auto cursor-pointer",
                isDark ? "text-slate-400 hover:text-rose-400" : "text-slate-500 hover:text-rose-600"
              )}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reset Checklist</span>
            </button>
          )}
        </div>

        {/* Checklist Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {filteredItems.map((item) => {
            const isChecked = checkedIds.includes(item.id);
            return (
              <div
                key={item.id}
                onClick={() => toggleItem(item.id)}
                className={cn(
                  "p-4 rounded-xl border transition-all cursor-pointer flex items-start gap-3.5 select-none",
                  isChecked
                    ? isDark
                      ? "bg-rose-950/20 border-rose-500/40 text-slate-200"
                      : "bg-rose-50/70 border-rose-300 text-slate-800 shadow-sm"
                    : isDark
                    ? "bg-slate-900/60 border-slate-800 hover:border-slate-750 text-slate-300"
                    : "bg-white border-slate-200 hover:border-slate-300 text-slate-800 shadow-sm"
                )}
              >
                <button
                  type="button"
                  className={cn(
                    "mt-0.5 shrink-0 transition-colors",
                    isChecked ? "text-rose-500" : isDark ? "text-slate-600" : "text-slate-400"
                  )}
                >
                  {isChecked ? (
                    <CheckCircle2 className="h-5 w-5 fill-rose-500/20" />
                  ) : (
                    <Circle className="h-5 w-5" />
                  )}
                </button>

                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3
                      className={cn(
                        "text-xs sm:text-sm font-bold",
                        isChecked
                          ? isDark
                            ? "line-through text-slate-500"
                            : "line-through text-slate-400"
                          : isDark
                          ? "text-slate-200"
                          : "text-slate-900"
                      )}
                    >
                      {item.title}
                    </h3>
                    {item.essential && (
                      <span
                        className={cn(
                          "text-[9px] font-mono px-1.5 py-0.2 rounded font-bold shrink-0 border",
                          isDark
                            ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                            : "bg-rose-50 text-rose-600 border-rose-200"
                        )}
                      >
                        WAJIB
                      </span>
                    )}
                  </div>
                  <p className={cn("text-xs mt-1 leading-relaxed", isDark ? "text-slate-400" : "text-slate-600")}>
                    {item.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Section 2: Standard Operating Procedures (SOP) by Hazard */}
      <div
        className={cn(
          "p-6 rounded-2xl border transition-colors",
          isDark ? "bg-slate-900/80 border-slate-800 shadow-xl" : "bg-white border-slate-200 shadow-sm"
        )}
      >
        <div className="flex items-center gap-2 mb-2">
          <ShieldCheck className="h-5 w-5 text-emerald-500" />
          <h2 className={cn("text-lg font-bold", isDark ? "text-white" : "text-slate-900")}>
            Panduan SOP Tanggap Darurat Bencana
          </h2>
        </div>
        <p className={cn("text-xs mb-6", isDark ? "text-slate-400" : "text-slate-600")}>
          Pedoman baku tindakan penyelamatan diri berdasarkan jenis ancaman bencana:
        </p>

        {/* Hazard Selector Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6">
          {[
            { id: "gempa", label: "Gempa Bumi", icon: AlertTriangle, color: "text-rose-500" },
            { id: "tsunami", label: "Tsunami", icon: Waves, color: "text-sky-500" },
            { id: "gunung", label: "Erupsi Gunung Api", icon: Mountain, color: "text-amber-500" },
            { id: "banjir", label: "Banjir Bandang", icon: CloudRain, color: "text-cyan-500" },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeSopTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSopTab(tab.id as "gempa" | "tsunami" | "gunung" | "banjir")}
                className={cn(
                  "p-3 rounded-xl border flex items-center gap-2.5 transition-all text-xs font-bold cursor-pointer",
                  isActive
                    ? isDark
                      ? "bg-slate-800 border-rose-500/40 text-white shadow-sm"
                      : "bg-rose-50 border-rose-300 text-rose-700 shadow-sm"
                    : isDark
                    ? "bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200"
                    : "bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                )}
              >
                <Icon className={cn("h-4 w-4", tab.color)} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* SOP Content Cards */}
        {activeSopTab === "gempa" && (
          <div className="space-y-4">
            <div
              className={cn(
                "p-4 rounded-xl border transition-colors",
                isDark ? "bg-slate-950/60 border-slate-850" : "bg-slate-50/80 border-slate-200"
              )}
            >
              <h3 className="text-xs font-mono font-bold text-rose-500 uppercase mb-1">
                Fase 1: Saat Guncangan Berlangsung (Drop - Cover - Hold On)
              </h3>
              <ul className={cn("text-xs space-y-1.5 list-disc list-inside mt-2", isDark ? "text-slate-300" : "text-slate-700")}>
                <li>Segera berlutut (Drop) untuk mencegah terjatuh akibat getaran kuat.</li>
                <li>Lindungi kepala dan leher (Cover) di bawah meja kokoh atau menggunakan lengan.</li>
                <li>Pegang erat kaki meja (Hold On) hingga guncangan sepenuhnya berhenti.</li>
                <li>Jauhi jendela kaca, cermin, lemari gantung, dan dinding luar bangunan.</li>
              </ul>
            </div>
            <div
              className={cn(
                "p-4 rounded-xl border transition-colors",
                isDark ? "bg-slate-950/60 border-slate-850" : "bg-slate-50/80 border-slate-200"
              )}
            >
              <h3 className="text-xs font-mono font-bold text-amber-500 uppercase mb-1">
                Fase 2: Segera Setelah Guncangan Reda
              </h3>
              <ul className={cn("text-xs space-y-1.5 list-disc list-inside mt-2", isDark ? "text-slate-300" : "text-slate-700")}>
                <li>Matikan kompor gas dan turunkan pemutus arus listrik (MCB) rumah.</li>
                <li>Ambil Tas Siaga Bencana dan evakuasi menggunakan tangga darurat (JANGAN LIFT).</li>
                <li>Menuju titik kumpul (Assembly Point) di area terbuka bebas tiang listrik &amp; pohon tua.</li>
              </ul>
            </div>
          </div>
        )}

        {activeSopTab === "tsunami" && (
          <div className="space-y-4">
            <div
              className={cn(
                "p-4 rounded-xl border transition-colors",
                isDark ? "bg-slate-950/60 border-slate-850" : "bg-slate-50/80 border-slate-200"
              )}
            >
              <h3 className="text-xs font-mono font-bold text-sky-500 uppercase mb-1">
                Tanda Alam &amp; Prinsip 20-20-20
              </h3>
              <ul className={cn("text-xs space-y-1.5 list-disc list-inside mt-2", isDark ? "text-slate-300" : "text-slate-700")}>
                <li>Gempa berdurasi &gt;20 detik: Segera evakuasi tanpa menunggu konfirmasi sirine.</li>
                <li>Air laut surut mendadak mengekspos karang &amp; bau garam/belerang menyengat.</li>
                <li>Bergerak cepat menuju elevasi &gt;20 meter di atas permukaan laut atau lantai 3+ gedung TES.</li>
                <li>Tinggalkan kendaraan jika lalu lintas macet; evakuasi jalan kaki jauh lebih lincah.</li>
              </ul>
            </div>
          </div>
        )}

        {activeSopTab === "gunung" && (
          <div className="space-y-4">
            <div
              className={cn(
                "p-4 rounded-xl border transition-colors",
                isDark ? "bg-slate-950/60 border-slate-850" : "bg-slate-50/80 border-slate-200"
              )}
            >
              <h3 className="text-xs font-mono font-bold text-amber-500 uppercase mb-1">
                Mitigasi Erupsi &amp; Hujan Abu Vulkanik
              </h3>
              <ul className={cn("text-xs space-y-1.5 list-disc list-inside mt-2", isDark ? "text-slate-300" : "text-slate-700")}>
                <li>Ketahui posisi Anda terhadap peta Kawasan Rawan Bencana (KRB III, II, I).</li>
                <li>Gunakan kacamata pelindung (goggles) dan masker respirator N95 agar partikel silika tidak merusak paru-paru.</li>
                <li>Tutup seluruh penampungan air bersih dan sumur agar tidak tercemar abu asam.</li>
                <li>Jauhi lembah sungai yang berhulu di puncak gunung untuk menghindari lahar dingin saat hujan.</li>
              </ul>
            </div>
          </div>
        )}

        {activeSopTab === "banjir" && (
          <div className="space-y-4">
            <div
              className={cn(
                "p-4 rounded-xl border transition-colors",
                isDark ? "bg-slate-950/60 border-slate-850" : "bg-slate-50/80 border-slate-200"
              )}
            >
              <h3 className="text-xs font-mono font-bold text-cyan-500 uppercase mb-1">
                Prosedur Evakuasi Banjir Bandang
              </h3>
              <ul className={cn("text-xs space-y-1.5 list-disc list-inside mt-2", isDark ? "text-slate-300" : "text-slate-700")}>
                <li>Matikan sakelar MCB listrik utama sebelum air merendam stop kontak rumah.</li>
                <li>Jangan pernah mencoba menerobos arus air deras setinggi lutut (arus 15 cm mampu menjatuhkan orang dewasa).</li>
                <li>Jangan mengemudi menembus genangan air berarus tinggi.</li>
                <li>Pindahkan lansia, anak-anak, dan dokumen berharga ke lantai atas atau lokasi pengungsian tinggi.</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
