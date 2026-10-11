"use client";

import { useEffect, useState } from "react";
import { AdminHeader } from "@/components/admin/header";
import { BookOpen, Plus, FileText, CheckCircle2, Trash2, Edit3, X, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface ContentItem {
  id: number;
  title: string;
  slug: string;
  category: "GUIDE" | "ARTICLE" | "CHECKLIST" | "SOP";
  disasterCategoryCode: string | null;
  summary: string | null;
  bodyMarkdown: string;
  isPublished: boolean;
  updatedAt: string;
}

export default function AdminContentPage() {
  const [contents, setContents] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    title: "",
    category: "GUIDE",
    disasterCategoryCode: "EARTHQUAKE",
    summary: "",
    bodyMarkdown: "",
    isPublished: true,
  });

  const fetchContents = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/content");
      const data = await res.json();
      if (data.success && data.contents) {
        setContents(data.contents);
      }
    } catch (err) {
      console.error("Gagal memuat konten:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContents();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (data.success) {
        setIsModalOpen(false);
        setForm({
          title: "",
          category: "GUIDE",
          disasterCategoryCode: "EARTHQUAKE",
          summary: "",
          bodyMarkdown: "",
          isPublished: true,
        });
        fetchContents();
      } else {
        alert(data.error);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleTogglePublish = async (id: number, currentStatus: boolean) => {
    try {
      await fetch("/api/admin/content", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, isPublished: !currentStatus }),
      });
      fetchContents();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Apakah Anda yakin ingin menghapus materi SOP ini?")) return;
    try {
      await fetch(`/api/admin/content?id=${id}`, { method: "DELETE" });
      fetchContents();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div>
      <AdminHeader
        title="Educational & Safety SOP Manager"
        subtitle="Kelola artikel edukasi bencana, panduan bertahan hidup 72-jam, dan Prosedur Operasional Standar (SOP)."
      />

      <div className="p-6 space-y-6">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-slate-400">Total Materi:</span>
            <span className="px-2 py-0.5 rounded bg-slate-800 text-rose-400 font-mono text-xs font-bold">
              {contents.length} Panduan Terbit
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchContents}
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
              <span>Buat SOP / Panduan</span>
            </button>
          </div>
        </div>

        {/* Content Table */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 backdrop-blur-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 font-mono uppercase text-[10px] border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Judul Dokumen / SOP</th>
                  <th className="py-3 px-4">Kategori</th>
                  <th className="py-3 px-4">Jenis Bahaya</th>
                  <th className="py-3 px-4">Status Publikasi</th>
                  <th className="py-3 px-4">Terakhir Diperbarui</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {contents.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-850/50 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-white max-w-xs truncate">
                      {item.title}
                    </td>
                    <td className="py-3.5 px-4 font-mono">
                      <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300">
                        {item.category}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-rose-400">
                      {item.disasterCategoryCode || "ALL"}
                    </td>
                    <td className="py-3.5 px-4">
                      <button
                        onClick={() => handleTogglePublish(item.id, item.isPublished)}
                        className={cn(
                          "px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-all",
                          item.isPublished
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : "bg-slate-800 text-slate-500"
                        )}
                      >
                        {item.isPublished ? "PUBLISHED" : "DRAFT"}
                      </button>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-400 text-[11px]">
                      {new Date(item.updatedAt).toLocaleDateString("id-ID")}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-1.5 rounded-lg hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 transition-colors"
                        title="Hapus Konten"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal Tambah Konten */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl relative">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-base font-bold text-white mb-1 flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-rose-500" />
              <span>Buat SOP / Materi Mitigasi Baru</span>
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Materi akan langsung tersinkronisasi ke portal publik kesiapsiagaan warga.
            </p>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="text-xs text-slate-300 font-medium block mb-1">Judul Materi</label>
                <input
                  type="text"
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Contoh: Evakuasi Vertikal Tsunami"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-300 font-medium block mb-1">Kategori</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 font-mono"
                  >
                    <option value="SOP">SOP (Standar Operasional)</option>
                    <option value="GUIDE">GUIDE (Panduan Langkah)</option>
                    <option value="CHECKLIST">CHECKLIST (Tas Darurat)</option>
                    <option value="ARTICLE">ARTICLE (Edukasi Sains)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-slate-300 font-medium block mb-1">Jenis Bahaya</label>
                  <select
                    value={form.disasterCategoryCode}
                    onChange={(e) => setForm({ ...form, disasterCategoryCode: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 font-mono"
                  >
                    <option value="EARTHQUAKE">EARTHQUAKE (Gempa)</option>
                    <option value="TSUNAMI">TSUNAMI</option>
                    <option value="VOLCANO">VOLCANO (Gunung Api)</option>
                    <option value="FLOOD">FLOOD (Banjir)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-300 font-medium block mb-1">Ringkasan Singkat</label>
                <input
                  type="text"
                  value={form.summary}
                  onChange={(e) => setForm({ ...form, summary: e.target.value })}
                  placeholder="Ringkasan 1 kalimat"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 font-medium block mb-1">Isi Konten (Markdown)</label>
                <textarea
                  rows={4}
                  required
                  value={form.bodyMarkdown}
                  onChange={(e) => setForm({ ...form, bodyMarkdown: e.target.value })}
                  placeholder="Tulis instruksi langkah 1, 2, 3..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-100 font-mono placeholder:text-slate-500 focus:outline-none focus:border-rose-500"
                />
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
                  {submitting ? "Menyimpan..." : "Simpan Dokumen"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
