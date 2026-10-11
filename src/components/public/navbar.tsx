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
  Lock,
  Radio,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/map", label: "Live Map", icon: Globe2 },
  { href: "/simulate", label: "3D What-If Simulator", icon: Cpu, badge: "3D" },
  { href: "/assistant", label: "AI Assistant", icon: Bot, badge: "AI" },
  { href: "/preparedness", label: "Kesiapsiagaan", icon: Backpack },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
];

export function PublicNavbar() {
  const pathname = usePathname();

  return (
    <nav className="h-16 border-b border-slate-800/80 bg-slate-950/85 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between sticky top-0 z-50">
      {/* Brand */}
      <div className="flex items-center gap-6">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-rose-600 via-orange-500 to-amber-400 p-0.5 flex items-center justify-center shadow-lg shadow-rose-500/20 group-hover:scale-105 transition-transform">
            <div className="h-full w-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <ShieldAlert className="h-5 w-5 text-rose-500" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold tracking-wider text-base text-white font-mono">
                DISASTRA
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20">
                AI
              </span>
            </div>
            <p className="text-[10px] text-slate-400 hidden sm:block">Disaster Intelligence &amp; Simulation</p>
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
                    ? "bg-slate-900 text-rose-400 border border-rose-500/30 font-semibold shadow-sm"
                    : "text-slate-400 hover:text-slate-100 hover:bg-slate-900/60"
                )}
              >
                <Icon className={cn("h-3.5 w-3.5", isActive ? "text-rose-400" : "text-slate-400")} />
                <span>{item.label}</span>
                {item.badge && (
                  <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-rose-500/20 text-rose-300 font-bold">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-3">
        {/* Live feed indicator */}
        <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-900/80 border border-slate-800 text-[11px] font-mono text-slate-300">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>BMKG &bull; USGS Live</span>
        </div>
      </div>
    </nav>
  );
}
