"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { PublicNavbar } from "./navbar";
import { PublicFooter } from "./footer";

export function PublicShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isMapPage = pathname === "/map";

  return (
    <div className="h-screen max-h-screen flex flex-col bg-slate-950 text-slate-100 font-sans selection:bg-rose-500/30 selection:text-rose-200 overflow-hidden">
      <PublicNavbar />
      <main
        className={`flex-1 min-w-0 flex flex-col h-[calc(100dvh-4rem)] ${
          isMapPage ? "overflow-hidden" : "overflow-y-auto"
        }`}
      >
        {children}
        {!isMapPage && <PublicFooter />}
      </main>
    </div>
  );
}
