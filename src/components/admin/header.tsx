"use client";

import { Bell, RefreshCw, Search } from "lucide-react";
import { useState } from "react";

interface AdminHeaderProps {
  title?: string;
  subtitle?: string;
  userEmail?: string;
}

export function AdminHeader({
  title = "Dashboard",
  subtitle = "Global Disaster Intelligence Overview",
  userEmail = "admin@disastra.ai",
}: AdminHeaderProps) {
  const [isSyncing, setIsSyncing] = useState(false);

  const handleQuickSync = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch("/api/admin/sync", { method: "POST" });
      const data = await res.json();
      alert(`Sync triggered: ${data.message || "Done"}`);
    } catch {
      alert("Failed to trigger sync");
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <header className="h-16 border-b border-slate-800 bg-slate-950/70 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-30">
      <div>
        <h1 className="text-base font-bold text-white tracking-tight">{title}</h1>
        <p className="text-xs text-slate-400">{subtitle}</p>
      </div>

      <div className="flex items-center gap-3">
        {/* Search Bar */}
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search disaster, coordinate, ID..."
            className="w-64 pl-9 pr-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 placeholder:text-slate-400 focus:outline-none focus:border-rose-500/60 focus:ring-1 focus:ring-rose-500/40 transition-all"
          />
        </div>

        {/* Global Quick Sync Button */}
        <button
          onClick={handleQuickSync}
          disabled={isSyncing}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-750 text-xs font-medium text-slate-300 hover:text-white transition-all cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 text-rose-400 ${isSyncing ? "animate-spin" : ""}`} />
          <span>{isSyncing ? "Syncing..." : "Sync Feeds"}</span>
        </button>

        {/* Notifications */}
        <button
          type="button"
          className="relative p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-750 text-slate-400 hover:text-slate-200 transition-colors"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-rose-500" />
        </button>

        {/* Admin Profile */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
          <div className="h-7 w-7 rounded-full bg-gradient-to-tr from-rose-500 to-amber-500 flex items-center justify-center font-bold text-xs text-white">
            A
          </div>
          <div className="hidden sm:block text-left">
            <p className="text-xs font-semibold text-slate-200 leading-none">Admin</p>
            <p className="text-[10px] text-slate-400 font-mono mt-0.5">{userEmail}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
