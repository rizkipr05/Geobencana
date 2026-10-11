"use client";

import { useState } from "react";
import { AdminHeader } from "@/components/admin/header";
import { BookOpen, Plus, FileText, CheckCircle2, Trash2, Edit3, X } from "lucide-react";

interface ContentItem {
  id: number;
  title: string;
  category: "GUIDE" | "ARTICLE" | "CHECKLIST" | "SOP";
  disasterType: string;
  isPublished: boolean;
  updatedAt: string;
}

export default function AdminContentPage() {
  const [contents, setContents] = useState<ContentItem[]>([
    {
      id: 1,
      title: "Protokol Siaga Tsunami 20-20-20 Pesisir Pantai",
      category: "SOP",
      disasterType: "TSUNAMI",
      isPublished: true,
      updatedAt: "Today",
    },
    {
      id: 2,
      title: "Checklist Tas Siaga Bencana (72-Hour Survival Kit)",
      category: "CHECKLIST",
      disasterType: "ALL",
      isPublished: true,
      updatedAt: "2 days ago",
    },
    {
      id: 3,
      title: "Mitigasi Gempa di Gedung Bertingkat: Drop, Cover, Hold On",
      category: "GUIDE",
      disasterType: "EARTHQUAKE",
      isPublished: true,
      updatedAt: "5 days ago",
    },
    {
      id: 4,
      title: "Panduan Evakuasi Kawasan Rawan Bencana (KRB) Gunung Api",
      category: "GUIDE",
      disasterType: "VOLCANO",
      isPublished: false,
      updatedAt: "1 week ago",
    },
  ]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState<"GUIDE" | "ARTICLE" | "CHECKLIST" | "SOP">("GUIDE");
  const [newDisaster, setNewDisaster] = useState("EARTHQUAKE");

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    setContents([
      {
        id: Date.now(),
        title: newTitle,
        category: newCategory,
        disasterType: newDisaster,
        isPublished: true,
        updatedAt: "Just now",
      },
      ...contents,
    ]);
    setIsModalOpen(false);
    setNewTitle("");
  };

  const togglePublish = (id: number) => {
    setContents(
      contents.map((c) => (c.id === id ? { ...c, isPublished: !c.isPublished } : c))
    );
  };

  return (
    <div>
      <AdminHeader
        title="Educational & Safety Content Hub"
        subtitle="Manage disaster preparedness checklists, SOP documents, and safety guides"
      />

      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-rose-500" />
              Safety SOPs & Community Guides
            </h2>
            <p className="text-xs text-slate-400">
              Content served to mobile and public web users during emergency modes
            </p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="py-2 px-4 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-lg shadow-rose-600/20 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>New Guide / SOP</span>
          </button>
        </div>

        <div className="rounded-xl bg-slate-900/70 border border-slate-800 shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 text-slate-400 uppercase font-mono text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Title & Document</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Target Hazard</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Updated</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {contents.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-850/50 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-slate-100 flex items-center gap-2.5">
                      <FileText className="h-4 w-4 text-rose-400 flex-shrink-0" />
                      <span>{item.title}</span>
                    </td>
                    <td className="py-3.5 px-4 font-mono">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px]">
                        {item.category}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-400 text-[11px]">
                      {item.disasterType}
                    </td>
                    <td className="py-3.5 px-4">
                      <button
                        onClick={() => togglePublish(item.id)}
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold cursor-pointer transition-all ${
                          item.isPublished
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                        }`}
                      >
                        {item.isPublished ? "PUBLISHED" : "DRAFT"}
                      </button>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-500 text-[11px]">
                      {item.updatedAt}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => setContents(contents.filter((c) => c.id !== item.id))}
                        className="p-1 rounded text-slate-500 hover:text-rose-400"
                        title="Delete Content"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal: New Guide */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl relative">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-rose-500" />
                  Create Safety Article or SOP
                </h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleCreate} className="space-y-3.5 text-xs">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Document Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. SOP Evakuasi Jalur Hijau Sesar Lembang"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-rose-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Category</label>
                    <select
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none"
                    >
                      <option value="GUIDE">Safety Guide</option>
                      <option value="SOP">SOP Evacuation</option>
                      <option value="CHECKLIST">Emergency Checklist</option>
                      <option value="ARTICLE">Article</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Target Hazard</label>
                    <select
                      value={newDisaster}
                      onChange={(e) => setNewDisaster(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none"
                    >
                      <option value="EARTHQUAKE">Earthquake</option>
                      <option value="TSUNAMI">Tsunami</option>
                      <option value="VOLCANO">Volcano</option>
                      <option value="FLOOD">Flood</option>
                      <option value="ALL">All Hazards</option>
                    </select>
                  </div>
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
                    Save & Publish
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
