import { ReactNode } from "react";
import type { Metadata } from "next";
import { PublicShell } from "@/components/public/public-shell";

export const metadata: Metadata = {
  title: {
    default: "DISASTRA AI - Platform Intelijen & Pemantauan Bencana Indonesia",
    template: "%s | DISASTRA AI",
  },
  description:
    "DISASTRA AI — Platform pemantauan geospasial real-time, simulasi 3D multi-bencana, analisis dampak berbasis Google Gemini AI, dan asisten tanggap darurat mitigasi bencana di Indonesia.",
};

export default function PublicLayout({ children }: { children: ReactNode }) {
  return <PublicShell>{children}</PublicShell>;
}
