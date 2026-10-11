"use client";

import { useState } from "react";
import { AdminHeader } from "@/components/admin/header";
import { Users, Plus, Shield, UserCheck, Trash2, Mail, Lock, X } from "lucide-react";

interface UserItem {
  id: number;
  name: string;
  email: string;
  role: "SUPER_ADMIN" | "ADMIN" | "OPERATOR" | "USER";
  isActive: boolean;
  lastLogin: string;
}

export default function AdminUsersPage() {
  const [userList, setUserList] = useState<UserItem[]>([
    {
      id: 1,
      name: "Super Administrator",
      email: "admin@disastra.ai",
      role: "SUPER_ADMIN",
      isActive: true,
      lastLogin: "Active now",
    },
    {
      id: 2,
      name: "Budi Santoso",
      email: "budi.ops@disastra.ai",
      role: "OPERATOR",
      isActive: true,
      lastLogin: "2 hours ago",
    },
    {
      id: 3,
      name: "Siti Rahmawati",
      email: "siti.admin@disastra.ai",
      role: "ADMIN",
      isActive: true,
      lastLogin: "Yesterday",
    },
    {
      id: 4,
      name: "Ahmad Fauzi",
      email: "fauzi.analyst@disastra.ai",
      role: "OPERATOR",
      isActive: false,
      lastLogin: "5 days ago",
    },
  ]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    role: "OPERATOR",
  });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const newUser: UserItem = {
      id: Date.now(),
      name: form.name,
      email: form.email,
      role: form.role as any,
      isActive: true,
      lastLogin: "Never",
    };
    setUserList([...userList, newUser]);
    setIsModalOpen(false);
    setForm({ name: "", email: "", role: "OPERATOR" });
  };

  const toggleStatus = (id: number) => {
    setUserList(
      userList.map((u) => (u.id === id ? { ...u, isActive: !u.isActive } : u))
    );
  };

  return (
    <div>
      <AdminHeader
        title="User & Access Control"
        subtitle="Manage operators, disaster analysts, and role-based permissions"
      />

      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Users className="h-4 w-4 text-rose-500" />
              Authorized System Operators
            </h2>
            <p className="text-xs text-slate-400">
              Control RBAC access for command center operators & verified responders
            </p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="py-2 px-4 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-lg shadow-rose-600/20 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Add Operator</span>
          </button>
        </div>

        <div className="rounded-xl bg-slate-900/70 border border-slate-800 shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 text-slate-400 uppercase font-mono text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Operator Name</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Last Active</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {userList.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-850/50 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-slate-100 flex items-center gap-2.5">
                      <div className="h-7 w-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-rose-400">
                        {user.name.charAt(0)}
                      </div>
                      <span>{user.name}</span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-400 text-[11px]">
                      {user.email}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider font-mono ${
                          user.role === "SUPER_ADMIN"
                            ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                            : user.role === "ADMIN"
                            ? "bg-sky-500/20 text-sky-400 border border-sky-500/30"
                            : "bg-slate-800 text-slate-300 border border-slate-700"
                        }`}
                      >
                        {user.role}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <button
                        onClick={() => toggleStatus(user.id)}
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold cursor-pointer transition-all ${
                          user.isActive
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : "bg-slate-800 text-slate-500 border border-slate-700"
                        }`}
                      >
                        {user.isActive ? "ACTIVE" : "SUSPENDED"}
                      </button>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-500 text-[11px]">
                      {user.lastLogin}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {user.role !== "SUPER_ADMIN" && (
                        <button
                          onClick={() => setUserList(userList.filter((u) => u.id !== user.id))}
                          className="p-1 rounded text-slate-500 hover:text-rose-400"
                          title="Revoke Access"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal: Add Operator */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl relative">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Shield className="h-4 w-4 text-rose-500" />
                  Grant New Operator Access
                </h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleAdd} className="space-y-3.5 text-xs">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Raditya Pratama"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-rose-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    placeholder="raditya@disastra.ai"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 font-mono focus:outline-none focus:border-rose-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Assigned Role</label>
                  <select
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none"
                  >
                    <option value="OPERATOR">Operator (Verify events & trigger sync)</option>
                    <option value="ADMIN">Admin (Full disaster & content control)</option>
                    <option value="SUPER_ADMIN">Super Admin (System configuration)</option>
                  </select>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold shadow-lg shadow-rose-600/25"
                  >
                    Create Operator
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
