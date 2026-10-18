"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { PublicNavbar } from "./navbar";

import { useTheme } from "@/context/theme-context";
import { cn } from "@/lib/utils";

export function PublicShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isFixedLayout = pathname === "/map" || pathname === "/assistant";
  const { isDark } = useTheme();

  return (
    <div
      className={cn(
        "h-screen max-h-screen flex flex-col font-sans selection:bg-rose-500/30 selection:text-rose-200 overflow-hidden transition-colors duration-200",
        isDark ? "bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-900"
      )}
    >
      <PublicNavbar />
      <main
        className={`flex-1 min-w-0 flex flex-col h-[calc(100dvh-4rem)] ${
          isFixedLayout ? "overflow-hidden" : "overflow-y-auto"
        }`}
      >
        {children}
      </main>
    </div>
  );
}
