import { ReactNode } from "react";
import { PublicNavbar } from "@/components/public/navbar";

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-rose-500/30 selection:text-rose-200">
      <PublicNavbar />
      <div className="flex-1 flex flex-col min-w-0">{children}</div>
      <footer className="border-t border-slate-900 bg-slate-950/80 py-6 text-center text-xs text-slate-500 font-mono">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>DISASTRA &bull; AI-Powered Global Disaster Intelligence &amp; 3D Simulation Platform</p>
          <div className="flex items-center gap-4 text-[11px] text-slate-400">
            <span>Data: BMKG, USGS, NASA, GDACS</span>
            <span>&bull;</span>
            <span>Neon Lakebase Postgres</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
