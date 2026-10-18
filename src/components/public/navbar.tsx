"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ShieldAlert,
  Globe2,
  Cpu,
  Bot,
  Backpack,
  BarChart3,
  Sun,
  Moon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/context/theme-context";

const navItems = [
  { href: "/map", label: "Live Map", icon: Globe2 },
  { href: "/simulate", label: "3D What-If Simulator", icon: Cpu, badge: "3D" },
  { href: "/assistant", label: "AI Assistant", icon: Bot, badge: "AI" },
  { href: "/preparedness", label: "Kesiapsiagaan", icon: Backpack },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
];

export function PublicNavbar() {
  const pathname = usePathname();
  const { isDark, toggleTheme } = useTheme();

  return (
    <nav
      className={cn(
        "h-16 border-b px-4 sm:px-6 flex items-center justify-between sticky top-0 z-50 backdrop-blur-md transition-colors duration-200",
        isDark
          ? "border-slate-800/80 bg-slate-950/85 text-slate-100"
          : "border-slate-200 bg-white/95 text-slate-900 shadow-sm"
      )}
    >
      {/* Brand */}
      <div className="flex items-center gap-6">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-rose-600 via-orange-500 to-amber-400 p-0.5 flex items-center justify-center shadow-lg shadow-rose-500/20 group-hover:scale-105 transition-transform">
            <div
              className={cn(
                "h-full w-full rounded-[10px] flex items-center justify-center",
                isDark ? "bg-slate-950" : "bg-white"
              )}
            >
              <ShieldAlert className="h-5 w-5 text-rose-500" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span
                className={cn(
                  "font-extrabold tracking-wider text-base font-mono",
                  isDark ? "text-white" : "text-slate-900"
                )}
              >
                DISASTRA
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-rose-500/10 text-rose-500 border border-rose-500/20 font-bold">
                AI
              </span>
            </div>
            <p className={cn("text-[10px] hidden sm:block", isDark ? "text-slate-400" : "text-slate-500")}>
              Disaster Intelligence &amp; Simulation
            </p>
          </div>
        </Link>

        {/* Navigation Links */}
        <div className="hidden md:flex items-center gap-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                  isActive
                    ? isDark
                      ? "bg-slate-900 text-rose-400 border border-rose-500/30 font-semibold shadow-sm"
                      : "bg-rose-50 text-rose-600 border border-rose-200 font-semibold shadow-sm"
                    : isDark
                      ? "text-slate-400 hover:text-slate-100 hover:bg-slate-900/60"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                )}
              >
                <Icon
                  className={cn(
                    "h-3.5 w-3.5",
                    isActive
                      ? isDark
                        ? "text-rose-400"
                        : "text-rose-600"
                      : isDark
                        ? "text-slate-400"
                        : "text-slate-500"
                  )}
                />
                <span>{item.label}</span>
                {item.badge && (
                  <span
                    className={cn(
                      "text-[9px] font-mono px-1 py-0.2 rounded font-bold",
                      isDark ? "bg-rose-500/20 text-rose-300" : "bg-rose-100 text-rose-700"
                    )}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Live feed indicator */}
        <div
          className={cn(
            "hidden lg:flex items-center gap-2 px-2.5 py-1 rounded-full text-[11px] font-mono border",
            isDark
              ? "bg-slate-900/80 border-slate-800 text-slate-300"
              : "bg-slate-100 border-slate-200 text-slate-700"
          )}
        >
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>BMKG &bull; USGS Live</span>
        </div>

        {/* Theme Toggle Button (Dark & White) */}
        <button
          onClick={toggleTheme}
          type="button"
          aria-label={isDark ? "Ganti ke mode terang (White)" : "Ganti ke mode gelap (Dark)"}
          title={isDark ? "Ganti ke Mode Terang (White)" : "Ganti ke Mode Gelap (Dark)"}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-mono font-medium transition-all shadow-sm cursor-pointer",
            isDark
              ? "bg-slate-900 hover:bg-slate-800 border-slate-800 text-amber-300 hover:text-amber-200"
              : "bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700 hover:text-slate-900"
          )}
        >
          {isDark ? (
            <>
              <Moon className="h-3.5 w-3.5 text-amber-300" />
              <span className="text-[11px] font-semibold hidden sm:inline">Dark</span>
            </>
          ) : (
            <>
              <Sun className="h-3.5 w-3.5 text-amber-500" />
              <span className="text-[11px] font-semibold hidden sm:inline">White</span>
            </>
          )}
        </button>
      </div>
    </nav>
  );
}
