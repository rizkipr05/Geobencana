"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Radio,
  AlertTriangle,
  Cpu,
  BookOpen,
  Users,
  Activity,
  LogOut,
  ShieldAlert,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navigationItems = [
  {
    title: "Overview",
    href: "/admin/dashboard",
    icon: LayoutDashboard,
    badge: null,
  },
  {
    title: "Data Sources",
    href: "/admin/sources",
    icon: Radio,
    badge: "Live",
  },
  {
    title: "Disaster Records",
    href: "/admin/disasters",
    icon: AlertTriangle,
    badge: null,
  },
  {
    title: "AI & Simulation",
    href: "/admin/ai-simulation",
    icon: Cpu,
    badge: "AI",
  },
  {
    title: "Content & SOP",
    href: "/admin/content",
    icon: BookOpen,
    badge: null,
  },
  {
    title: "User Management",
    href: "/admin/users",
    icon: Users,
    badge: null,
  },
  {
    title: "System & Logs",
    href: "/admin/logs",
    icon: Activity,
    badge: null,
  },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 flex-shrink-0 bg-slate-950/90 border-r border-slate-800/80 backdrop-blur-md flex flex-col justify-between h-screen sticky top-0">
      <div>
        {/* Brand Header */}
        <div className="p-5 flex items-center gap-3 border-b border-slate-850">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-rose-600 via-orange-500 to-amber-400 p-0.5 flex items-center justify-center shadow-lg shadow-rose-500/20">
            <div className="h-full w-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <ShieldAlert className="h-5 w-5 text-rose-500" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold tracking-wider text-base text-white font-mono">
                DISASTRA
              </span>
              <span className="text-[10px] font-semibold tracking-wider uppercase px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20">
                ADMIN
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Intelligence Platform</p>
          </div>
        </div>

        {/* Navigation Section */}
        <div className="px-3 py-4">
          <p className="px-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Main Navigation
          </p>
          <nav className="space-y-1">
            {navigationItems.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/admin/dashboard" && pathname.startsWith(item.href));
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all group",
                    isActive
                      ? "bg-gradient-to-r from-rose-500/15 to-transparent text-rose-400 border-l-2 border-rose-500 font-semibold"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      className={cn(
                        "h-4 w-4 transition-colors",
                        isActive ? "text-rose-400" : "text-slate-400 group-hover:text-slate-300"
                      )}
                    />
                    <span>{item.title}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={cn(
                        "text-[9px] px-1.5 py-0.5 rounded font-mono font-bold uppercase",
                        item.badge === "Live"
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : "bg-sky-500/10 text-sky-400 border border-sky-500/20"
                      )}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Footer Info / Logout */}
      <div className="p-4 border-t border-slate-850 bg-slate-950/60">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shadow-sm shadow-emerald-500" />
            <span className="text-xs text-slate-400 font-mono">Neon DB: Connected</span>
          </div>
          <form action="/api/admin/auth/logout" method="POST">
            <button
              type="submit"
              title="Sign Out"
              className="p-1.5 rounded-md text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
