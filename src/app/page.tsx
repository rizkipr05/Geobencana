import type { Metadata } from "next";
import { HomeContent } from "@/components/public/home-content";

export const metadata: Metadata = {
  title: "DISASTRA AI - Platform Intelijen & Pemantauan Bencana Indonesia",
  description:
    "DISASTRA AI — Platform pemantauan geospasial real-time, simulasi 3D multi-bencana, analisis dampak berbasis Google Gemini AI, dan asisten tanggap darurat mitigasi bencana di Indonesia.",
};

export default function HomePage() {
  return <HomeContent />;
}
