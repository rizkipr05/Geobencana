"use client";

import { usePathname } from "next/navigation";

export function PublicFooter() {
  const pathname = usePathname();

  // Do not render bottom footer on full-height interactive map view
  if (pathname === "/map") {
    return null;
  }

  return (
    <footer className="border-t border-slate-900 bg-slate-950/80 py-6 text-center text-xs text-slate-500 font-mono">
      <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        <p>DISASTRA &bull; AI-Powered Indonesia Disaster Intelligence &amp; 3D Simulation Platform</p>
        <div className="flex items-center gap-4 text-[11px] text-slate-400">
          <span>Data: BMKG, USGS (Indonesia), NASA EONET</span>
          <span>&bull;</span>
          <span>Neon Lakebase Postgres</span>
        </div>
      </div>
    </footer>
  );
}
