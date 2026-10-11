"use client";

import { AdminHeader } from "@/components/admin/header";
import { Activity, ShieldAlert, CheckCircle2, Clock, Terminal } from "lucide-react";

export default function AdminLogsPage() {
  const auditLogs = [
    {
      id: "log-1",
      user: "admin@disastra.ai",
      action: "MANUAL_TRIGGER_SYNC",
      entity: "DATA_SOURCE",
      target: "BMKG",
      ip: "103.24.55.10",
      time: "2 minutes ago",
      status: "SUCCESS",
    },
    {
      id: "log-2",
      user: "admin@disastra.ai",
      action: "UPDATE_CONFIG",
      entity: "AI_CONFIG",
      target: "IMPACT_ANALYZER (Temperature -> 0.4)",
      ip: "103.24.55.10",
      time: "15 minutes ago",
      status: "SUCCESS",
    },
    {
      id: "log-3",
      user: "budi.ops@disastra.ai",
      action: "CREATE_INCIDENT",
      entity: "DISASTER",
      target: "Gempa M 6.2 Sumur Banten",
      ip: "182.1.204.88",
      time: "48 minutes ago",
      status: "SUCCESS",
    },
    {
      id: "log-4",
      user: "system_cron",
      action: "AUTO_POLL_FEED",
      entity: "DATA_SOURCE",
      target: "USGS (42 records fetched)",
      ip: "127.0.0.1",
      time: "1 hour ago",
      status: "SUCCESS",
    },
  ];

  const systemHealth = [
    { name: "Neon PostgreSQL", latency: "24 ms", status: "HEALTHY", uptime: "99.98%" },
    { name: "BMKG API Gateway", latency: "142 ms", status: "HEALTHY", uptime: "99.85%" },
    { name: "USGS Hazards Feed", latency: "210 ms", status: "HEALTHY", uptime: "99.99%" },
    { name: "Google Gemini 1.5", latency: "420 ms", status: "READY", uptime: "100.00%" },
  ];

  return (
    <div>
      <AdminHeader
        title="System Monitoring & Audit Trail"
        subtitle="Live telemetry, API latency graphs, and immutable compliance audit logs"
      />

      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        {/* System Health Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {systemHealth.map((item) => (
            <div
              key={item.name}
              className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 shadow-xl"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-300">{item.name}</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold uppercase">
                  {item.status}
                </span>
              </div>
              <div className="flex items-baseline justify-between mt-3 pt-2 border-t border-slate-850">
                <span className="text-[11px] text-slate-500 font-mono">Ping: {item.latency}</span>
                <span className="text-[11px] text-slate-400 font-mono">Uptime: {item.uptime}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Audit Trail Table */}
        <div className="rounded-xl bg-slate-900/70 border border-slate-800 shadow-xl overflow-hidden">
          <div className="p-5 border-b border-slate-800 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Terminal className="h-4 w-4 text-rose-500" />
                Administrative Activity Stream (Audit Trail)
              </h2>
              <p className="text-xs text-slate-400">
                Every mutation, synchronization, and config update is logged
              </p>
            </div>
            <span className="text-[10px] text-slate-500 font-mono">Real-time sync</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 text-slate-400 uppercase font-mono text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Operator / Principal</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Entity Type</th>
                  <th className="py-3 px-4">Details / Target</th>
                  <th className="py-3 px-4">IP Origin</th>
                  <th className="py-3 px-4 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-850/50 transition-colors font-mono">
                    <td className="py-3.5 px-4 text-slate-200 font-semibold">{log.user}</td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-rose-400 text-[10px] font-bold">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 text-[11px]">{log.entity}</td>
                    <td className="py-3.5 px-4 text-slate-300 font-sans text-xs">{log.target}</td>
                    <td className="py-3.5 px-4 text-slate-500 text-[11px]">{log.ip}</td>
                    <td className="py-3.5 px-4 text-right text-slate-400 text-[11px]">
                      {log.time}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
