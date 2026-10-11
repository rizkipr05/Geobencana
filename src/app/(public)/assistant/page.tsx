"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Bot,
  Send,
  User,
  ShieldAlert,
  Sparkles,
  PhoneCall,
  Flame,
  LifeBuoy,
  FileText,
  Loader2,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

const SUGGESTIONS = [
  "Apa yang harus dilakukan saat gempa di gedung tinggi?",
  "Bagaimana cara evakuasi tsunami jika listrik padam?",
  "Apa saja isi tas siaga bencana 72 jam?",
  "Pertolongan pertama pada korban tertimpa reruntuhan?",
  "Kapan waktu aman untuk kembali setelah peringatan tsunami?",
];

export default function AssistantPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "initial-msg",
      role: "assistant",
      content:
        "Halo! Saya **DISASTRA AI Assistant**. Saya siap membantu Anda dengan informasi taktis mitigasi bencana, rute evakuasi darurat, checklist kesiapsiagaan, dan protokol keselamatan resmi BMKG & BNPB. Apa yang ingin Anda tanyakan?",
      timestamp: "Baru saja",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async (textToSend?: string) => {
    const text = textToSend || input;
    if (!text.trim() || loading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMessage]);
    if (!textToSend) setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/ai/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          history: messages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      const data = await res.json();

      if (data.success && data.reply) {
        const assistantMessage: Message = {
          id: `asst-${Date.now()}`,
          role: "assistant",
          content: data.reply,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } else {
        throw new Error(data.error || "Gagal mendapatkan respons AI");
      }
    } catch (err: unknown) {
      const errText = err instanceof Error ? err.message : "Kesalahan sistem AI";
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: "assistant",
          content: `⚠️ Terjadi kendala saat menghubungi AI Assistant (${errText}). Untuk kondisi darurat kritis, segera hubungi **BNPB (117)** atau **Basarnas (115)**.`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-950 text-slate-100 flex flex-col p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <Bot className="h-4 w-4" />
            </span>
            <span className="text-xs font-mono font-semibold uppercase tracking-wider text-rose-400">
              DISASTER MITIGATION CO-PILOT
            </span>
          </div>
          <h1 className="text-2xl font-black text-white">AI Disaster &amp; Evacuation Assistant</h1>
          <p className="text-xs text-slate-400 mt-1">
            Panduan cerdas tanggap darurat, analisis bahaya, dan rute evakuasi berbasis standar Sendai Framework.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() =>
              setMessages([
                {
                  id: "initial-msg",
                  role: "assistant",
                  content: "Percakapan telah direset. Ada yang bisa saya bantu terkait situasi bencana?",
                  timestamp: "Baru saja",
                },
              ])
            }
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs text-slate-400 hover:text-slate-200 transition-all"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Reset Chat</span>
          </button>
        </div>
      </div>

      {/* Emergency Hotlines Strip */}
      <div className="mb-4 p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
        <span className="text-slate-400 font-mono text-[11px] flex items-center gap-1.5">
          <PhoneCall className="h-3.5 w-3.5 text-rose-500 animate-pulse" />
          <span>Hotline Darurat 24 Jam:</span>
        </span>
        <div className="flex flex-wrap items-center gap-3 font-mono text-xs">
          <span className="px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/20 text-rose-400 font-bold">
            BNPB: 117
          </span>
          <span className="px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400 font-bold">
            BASARNAS: 115
          </span>
          <span className="px-2 py-0.5 rounded bg-sky-500/10 border border-sky-500/20 text-sky-400 font-bold">
            Ambulans: 118 / 119
          </span>
          <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold">
            Polisi: 110
          </span>
        </div>
      </div>

      {/* Chat Messages Container */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-1 min-h-[380px] max-h-[520px]">
        {messages.map((m) => {
          const isUser = m.role === "user";
          return (
            <div
              key={m.id}
              className={cn("flex gap-3 max-w-[85%]", isUser ? "ml-auto flex-row-reverse" : "mr-auto")}
            >
              <div
                className={cn(
                  "h-8 w-8 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold shadow-md",
                  isUser
                    ? "bg-slate-800 text-slate-200 border border-slate-750"
                    : "bg-rose-600 text-white shadow-rose-600/20"
                )}
              >
                {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
              </div>

              <div>
                <div
                  className={cn(
                    "p-4 rounded-2xl text-xs sm:text-sm leading-relaxed border shadow-sm",
                    isUser
                      ? "bg-slate-900 border-slate-800 text-slate-100 rounded-tr-none"
                      : "bg-slate-900/90 border-slate-800/90 text-slate-200 rounded-tl-none whitespace-pre-wrap"
                  )}
                >
                  {m.content}
                </div>
                <div
                  className={cn(
                    "text-[10px] text-slate-500 mt-1 font-mono",
                    isUser ? "text-right" : "text-left"
                  )}
                >
                  {m.timestamp}
                </div>
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="flex gap-3 max-w-[80%] mr-auto items-center">
            <div className="h-8 w-8 rounded-xl bg-rose-600 text-white flex items-center justify-center">
              <Bot className="h-4 w-4 animate-spin" />
            </div>
            <div className="px-4 py-3 rounded-2xl bg-slate-900 border border-slate-800 text-xs text-slate-400 flex items-center gap-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-rose-500" />
              <span>AI sedang memproses analisis mitigasi...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Prompt Chips */}
      <div className="mb-3 flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-none">
        <span className="text-[11px] font-mono text-slate-500 shrink-0 flex items-center gap-1 mr-1">
          <Sparkles className="h-3 w-3 text-rose-400" />
          <span>Saran:</span>
        </span>
        {SUGGESTIONS.map((sug, i) => (
          <button
            key={i}
            onClick={() => handleSend(sug)}
            className="text-[11px] px-2.5 py-1 rounded-full bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 transition-all whitespace-nowrap shrink-0"
          >
            {sug}
          </button>
        ))}
      </div>

      {/* Input Box */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="flex items-center gap-2 bg-slate-900/90 border border-slate-800 p-2 rounded-2xl focus-within:border-rose-500/50 shadow-xl"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Tanyakan protokol evakuasi, zona bahaya gempa, atau tas darurat..."
          disabled={loading}
          className="flex-1 bg-transparent px-3 py-1.5 text-xs sm:text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="p-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-40 disabled:hover:bg-rose-600 text-white transition-all shadow-md shadow-rose-600/30"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
