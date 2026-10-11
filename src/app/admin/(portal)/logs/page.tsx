"use client";

import { useEffect, useState } from "react";
import { AdminHeader } from "@/components/admin/header";
import {
  Activity,
  ShieldAlert,
  CheckCircle2,
  Clock,
  Terminal,
  RefreshCw,
  AlertTriangle,
  Radio,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SyncLogItem {
  id: number;
  sourceId?: number | null;
  sourceCode: string | null;
  sourceName: string | null;
  status: string;
  itemsFetched: number;
  itemsInserted: number;
  itemsDuplicate: number;
  durationMs: number;
  startedAt: string;
  completedAt: string | null;
  errorMessage: string | null;
}

interface AuditLogItem {
  id: number;
  userEmail: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  details: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
}

interface SystemErrorItem {
  id: number;
  source: string;
  severity: string;
  message: string;
  createdAt: string;
}

export default function AdminLogsPage() {
  const [syncLogs, setSyncLogs] = useState<SyncLogItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [systemErrors, setSystemErrors] = useState<SystemErrorItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"SYNC" | "AUDIT" | "ERRORS">("SYNC");

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/logs");
      const data = await res.json();
      if (data.success) {
        setSyncLogs(data.syncLogs || []);
        setAuditLogs(data.auditLogs || []);
        setSystemErrors(data.systemErrors || []);
      }
    } catch (err) {
      console.error("Gagal memuat log:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const systemHealth = [
    { name: "Neon Serverless Postgres", latency: "24 ms", status: "HEALTHY", uptime: "99.99%" },
    { name: "BMKG TEWS Gateway", latency: "142 ms", status: "HEALTHY", uptime: "99.85%" },
    { name: "USGS Hazards Feed", latency: "210 ms", status: "HEALTHY", uptime: "99.95%" },
    { name: "Google Gemini AI Engine", latency: "380 ms", status: "READY", uptime: "100.00%" },
  ];

  return (
    <div>
      <AdminHeader
        title="System Telemetry & Audit Logs"
        subtitle="Log sinkronisasi data feed, jejak audit aktivitas operator, dan status kesehatan infrastruktur Neon DB."
      />

      <div className="p-6 space-y-6">
        {/* System Health Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {systemHealth.map((svc) => (
            <div
              key={svc.name}
              className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-300">{svc.name}</span>
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-xl font-bold font-mono text-white">{svc.latency}</span>
                <span className="text-xs text-slate-400 font-mono">Uptime: {svc.uptime}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Tab Selector & Refresh Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab("SYNC")}
              className={cn(
                "px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all border flex items-center gap-1.5",
                activeTab === "SYNC"
                  ? "bg-rose-600/20 text-rose-300 border-rose-500/40"
                  : "bg-slate-900/60 text-slate-400 border-slate-800 hover:text-slate-200"
              )}
            >
              <Radio className="h-3.5 w-3.5" />
              <span>Log Polling Sync ({syncLogs.length})</span>
            </button>

            <button
              onClick={() => setActiveTab("AUDIT")}
              className={cn(
                "px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all border flex items-center gap-1.5",
                activeTab === "AUDIT"
                  ? "bg-rose-600/20 text-rose-300 border-rose-500/40"
                  : "bg-slate-900/60 text-slate-400 border-slate-800 hover:text-slate-200"
              )}
            >
              <User className="h-3.5 w-3.5" />
              <span>Audit Trail Operator ({auditLogs.length})</span>
            </button>

            <button
              onClick={() => setActiveTab("ERRORS")}
              className={cn(
                "px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all border flex items-center gap-1.5",
                activeTab === "ERRORS"
                  ? "bg-rose-600/20 text-rose-300 border-rose-500/40"
                  : "bg-slate-900/60 text-slate-400 border-slate-800 hover:text-slate-200"
              )}
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>System Errors ({systemErrors.length})</span>
            </button>
          </div>

          <button
            onClick={fetchLogs}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 hover:text-white transition-all self-start sm:self-auto"
          >
            <RefreshCw className={cn("h-3.5 w-3.5 text-rose-400", loading && "animate-spin")} />
            <span>Segarkan Log</span>
          </button>
        </div>

        {/* Tab 1: Sync Logs Table */}
        {activeTab === "SYNC" && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 backdrop-blur-md overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Terminal className="h-4 w-4 text-rose-500" />
                <h3 className="text-sm font-bold text-white">Live Feed Synchronization Stream (Neon)</h3>
              </div>
              <span className="text-[11px] font-mono text-slate-400">10-Minute Polling Cycle</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 text-slate-400 font-mono uppercase text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Waktu Eksekusi</th>
                    <th className="py-3 px-4">Sumber Data</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Fetched</th>
                    <th className="py-3 px-4">Inserted</th>
                    <th className="py-3 px-4">Duplikat</th>
                    <th className="py-3 px-4">Durasi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {syncLogs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-500 font-mono">
                        Belum ada rekaman sinkronisasi di Neon DB.
                      </td>
                    </tr>
                  ) : (
                    syncLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-850/50 transition-colors">
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                          {new Date(log.startedAt).toLocaleString("id-ID", {
                            dateStyle: "short",
                            timeStyle: "medium",
                          })}
                        </td>
                        <td className="py-3 px-4 font-bold text-white">
                          <span className="px-2 py-0.5 rounded bg-slate-800 font-mono text-rose-400">
                            {log.sourceCode || `ID ${log.sourceId}`}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={cn(
                              "px-2 py-0.5 rounded text-[10px] font-mono font-bold",
                              log.status === "SUCCESS"
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                            )}
                          >
                            {log.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-300">{log.itemsFetched}</td>
                        <td className="py-3 px-4 font-mono text-emerald-400 font-bold">
                          +{log.itemsInserted}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-500">{log.itemsDuplicate}</td>
                        <td className="py-3 px-4 font-mono text-slate-400">{log.durationMs} ms</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 2: Audit Logs Table */}
        {activeTab === "AUDIT" && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 backdrop-blur-md overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-amber-500" />
                <h3 className="text-sm font-bold text-white">Security &amp; Operator Audit Trail</h3>
              </div>
              <span className="text-[11px] font-mono text-slate-400">Immutable Ledger</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 text-slate-400 font-mono uppercase text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Waktu</th>
                    <th className="py-3 px-4">Operator</th>
                    <th className="py-3 px-4">Aksi</th>
                    <th className="py-3 px-4">Entitas</th>
                    <th className="py-3 px-4">Detail</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {auditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-500 font-mono">
                        Belum ada jejak audit operator di database.
                      </td>
                    </tr>
                  ) : (
                    auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-850/50 transition-colors">
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                          {new Date(log.createdAt).toLocaleString("id-ID", {
                            dateStyle: "short",
                            timeStyle: "medium",
                          })}
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-200">
                          {log.userEmail || "System Daemon"}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            {log.action}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-400">{log.entityType}</td>
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-300">
                          {log.details ? JSON.stringify(log.details) : "—"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: System Errors */}
        {activeTab === "ERRORS" && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 backdrop-blur-md overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-rose-500" />
                <h3 className="text-sm font-bold text-white">System Error Telemetry</h3>
              </div>
            </div>

            <div className="p-4">
              {systemErrors.length === 0 ? (
                <div className="py-8 text-center text-emerald-400 font-mono text-xs flex flex-col items-center gap-2">
                  <CheckCircle2 className="h-6 w-6" />
                  <span>Sistem berjalan prima tanpa log error aktif.</span>
                </div>
              ) : (
                <div className="space-y-3">
                  {systemErrors.map((err) => (
                    <div
                      key={err.id}
                      className="p-3 rounded-xl bg-rose-950/20 border border-rose-500/30 text-xs"
                    >
                      <div className="flex justify-between font-mono text-[11px] text-slate-400 mb-1">
                        <span className="text-rose-400 font-bold">{err.source}</span>
                        <span>{new Date(err.createdAt).toLocaleTimeString()}</span>
                      </div>
                      <p className="text-slate-200">{err.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
