"use client";

import { useEffect, useState } from "react";
import { AdminHeader } from "@/components/admin/header";
import { Users, Plus, Shield, Trash2, Mail, Lock, X, RefreshCw, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface UserItem {
  id: number;
  name: string;
  email: string;
  role: "SUPER_ADMIN" | "ADMIN" | "OPERATOR" | "USER";
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

export default function AdminUsersPage() {
  const [userList, setUserList] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "OPERATOR",
  });

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/users");
      const data = await res.json();
      if (data.success && data.users) {
        setUserList(data.users);
      }
    } catch (err) {
      console.error("Gagal memuat pengguna:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "Gagal membuat pengguna");
      }

      setIsModalOpen(false);
      setForm({ name: "", email: "", password: "", role: "OPERATOR" });
      fetchUsers();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (id: number, currentStatus: boolean) => {
    try {
      await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, isActive: !currentStatus }),
      });
      fetchUsers();
    } catch (err) {
      console.error(err);
    }
  };

  const handleRoleChange = async (id: number, newRole: string) => {
    try {
      await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, role: newRole }),
      });
      fetchUsers();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Apakah Anda yakin ingin menghapus operator ini?")) return;
    try {
      const res = await fetch(`/api/admin/users?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!data.success) {
        alert(data.error);
      }
      fetchUsers();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div>
      <AdminHeader
        title="User & Access Management"
        subtitle="Kelola akun personil command center, hak akses peran sistem (RBAC), dan status kredensial."
      />

      <div className="p-6 space-y-6">
        {/* Action Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-slate-400">Total Personil:</span>
            <span className="px-2 py-0.5 rounded bg-slate-800 text-rose-400 font-mono text-xs font-bold">
              {userList.length} Akun Terdaftar
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchUsers}
              disabled={loading}
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-all"
            >
              <RefreshCw className={cn("h-4 w-4 text-rose-400", loading && "animate-spin")} />
            </button>
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs tracking-wider uppercase transition-all shadow-lg shadow-rose-600/25"
            >
              <Plus className="h-4 w-4" />
              <span>Tambah Operator</span>
            </button>
          </div>
        </div>

        {/* Users Table */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 backdrop-blur-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 font-mono uppercase text-[10px] border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Nama Lengkap</th>
                  <th className="py-3 px-4">Email Personil</th>
                  <th className="py-3 px-4">Peran Hak Akses</th>
                  <th className="py-3 px-4">Status Akun</th>
                  <th className="py-3 px-4">Terdaftar</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {userList.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-850/50 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-white flex items-center gap-2">
                      <div className="h-7 w-7 rounded-lg bg-slate-800 text-rose-400 flex items-center justify-center font-bold">
                        {user.name.charAt(0)}
                      </div>
                      <span>{user.name}</span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-300">{user.email}</td>
                    <td className="py-3.5 px-4">
                      <select
                        value={user.role}
                        onChange={(e) => handleRoleChange(user.id, e.target.value)}
                        disabled={user.email === "admin@disastra.ai"}
                        className="bg-slate-800 border border-slate-700 text-[11px] rounded px-2 py-1 text-slate-200 font-mono focus:outline-none"
                      >
                        <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                        <option value="ADMIN">ADMIN</option>
                        <option value="OPERATOR">OPERATOR</option>
                        <option value="USER">USER</option>
                      </select>
                    </td>
                    <td className="py-3.5 px-4">
                      <button
                        onClick={() => handleToggleStatus(user.id, user.isActive)}
                        disabled={user.email === "admin@disastra.ai"}
                        className={cn(
                          "px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-all",
                          user.isActive
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : "bg-slate-800 text-slate-500"
                        )}
                      >
                        {user.isActive ? "AKTIF" : "NONAKTIF"}
                      </button>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-400 text-[11px]">
                      {new Date(user.createdAt).toLocaleDateString("id-ID")}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {user.email !== "admin@disastra.ai" && (
                        <button
                          onClick={() => handleDelete(user.id)}
                          className="p-1.5 rounded-lg hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 transition-colors"
                          title="Hapus Akun"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal Tambah User */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-base font-bold text-white mb-1 flex items-center gap-2">
              <Shield className="h-5 w-5 text-rose-500" />
              <span>Tambah Operator Baru</span>
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Tambahkan personil untuk mengoperasikan portal mitigasi &amp; simulasi bencana.
            </p>

            {errorMsg && (
              <div className="mb-4 p-3 rounded-xl bg-rose-950/20 border border-rose-500/30 text-rose-400 text-xs">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="text-xs text-slate-300 font-medium block mb-1">Nama Lengkap</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Contoh: Rian Pratama"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 font-medium block mb-1">Alamat Email</label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="operator@disastra.ai"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 font-medium block mb-1">Kata Sandi Awal</label>
                <input
                  type="password"
                  required
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="Minimal 8 karakter"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 font-medium block mb-1">Peran (Role)</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-rose-500 font-mono"
                >
                  <option value="OPERATOR">OPERATOR (Read &amp; Trigger Feeds)</option>
                  <option value="ADMIN">ADMIN (Manajemen Konten &amp; Bencana)</option>
                  <option value="SUPER_ADMIN">SUPER_ADMIN (Akses Penuh)</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold uppercase transition-all shadow-md shadow-rose-600/30"
                >
                  {submitting ? "Menyimpan..." : "Simpan Pengguna"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
