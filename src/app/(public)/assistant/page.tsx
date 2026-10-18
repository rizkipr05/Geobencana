"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Bot,
  Send,
  User,
  Sparkles,
  PhoneCall,
  Loader2,
  Trash2,
} from "lucide-react";
import { cn, cleanOutputText } from "@/lib/utils";

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

let messageCounter = 0;
function createMessageId(prefix: string) {
  messageCounter += 1;
  return `${prefix}-${messageCounter}-${Math.random().toString(36).slice(2, 7)}`;
}

function getFormattedTime() {
  const d = new Date();
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

export default function AssistantPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "initial-msg",
      role: "assistant",
      content:
        "Halo! Saya DISASTRA AI Assistant. Saya siap membantu Anda dengan informasi taktis mitigasi bencana, rute evakuasi darurat, checklist kesiapsiagaan, dan protokol keselamatan resmi BMKG & BNPB. Apa yang ingin Anda tanyakan?",
      timestamp: "Baru saja",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isAiLive, setIsAiLive] = useState<boolean | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  useEffect(() => {
    let isMounted = true;
    async function checkStatus() {
      try {
        const res = await fetch("/api/ai/assistant");
        const data = await res.json();
        if (isMounted && data.success) {
          setIsAiLive(Boolean(data.configured));
        }
      } catch {
        if (isMounted) setIsAiLive(false);
      }
    }
    checkStatus();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleSend = useCallback(
    async (textToSend?: string) => {
      const text = textToSend || input;
      if (!text.trim() || loading) return;

      const userMessage: Message = {
        id: createMessageId("user"),
        role: "user",
        content: text,
        timestamp: getFormattedTime(),
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
          if (data.source === "GOOGLE_GEMINI_LIVE") {
            setIsAiLive(true);
          }
          const assistantMessage: Message = {
            id: createMessageId("asst"),
            role: "assistant",
            content: data.reply,
            timestamp: getFormattedTime(),
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
            id: createMessageId("err"),
            role: "assistant",
            content: `⚠️ Terjadi kendala saat menghubungi AI Assistant (${errText}). Untuk kondisi darurat kritis, segera hubungi BNPB (117) atau Basarnas (115).`,
            timestamp: getFormattedTime(),
          },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [input, loading, messages]
  );

  return (
    <div className="w-full max-w-6xl xl:max-w-7xl mx-auto h-full flex flex-col p-3 sm:p-5 lg:p-6 bg-slate-950 text-slate-100">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3 border-b border-slate-800 pb-3 shrink-0">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <span className="p-1 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <Bot className="h-4 w-4" />
            </span>
            <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-rose-400">
              DISASTER MITIGATION CO-PILOT
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white">AI Disaster &amp; Evacuation Assistant</h1>
          <p className="text-xs text-slate-400 mt-0.5 hidden sm:block">
            Panduan cerdas tanggap darurat, analisis bahaya, dan rute evakuasi berbasis standar Sendai Framework.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isAiLive !== null && (
            <span
              className={cn(
                "px-2.5 py-1 rounded-full text-[11px] font-mono font-semibold flex items-center gap-1.5 border shadow-sm",
                isAiLive
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                  : "bg-amber-500/10 border-amber-500/30 text-amber-400"
              )}
            >
              <Sparkles className="h-3 w-3" />
              <span>{isAiLive ? "Gemini AI: Aktif (Live)" : "Mode Darurat (Offline)"}</span>
            </span>
          )}

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
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs text-slate-400 hover:text-slate-200 transition-all cursor-pointer"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Reset Chat</span>
          </button>
        </div>
      </div>

      {/* Notice if Gemini Key not yet configured */}
      {isAiLive === false && (
        <div className="mb-2.5 p-2.5 sm:p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300/90 flex items-start gap-2.5 shrink-0">
          <Sparkles className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <span className="font-bold text-amber-300 block">Google Gemini API Belum Dikonfigurasi</span>
            <span className="text-[11px] text-amber-200/80 leading-relaxed block mt-0.5">
              Assistant saat ini menggunakan pangkalan pengetahuan darurat offline. Tambahkan <code className="bg-amber-950/80 px-1 py-0.5 rounded text-amber-300 font-mono">GEMINI_API_KEY</code> di berkas <code className="bg-amber-950/80 px-1 py-0.5 rounded text-amber-300 font-mono">.env.local</code> untuk mengaktifkan kecerdasan penuh Google Gemini.
            </span>
          </div>
        </div>
      )}

      {/* Emergency Hotlines Strip */}
      <div className="mb-3 px-3 py-2 rounded-xl bg-slate-900/60 border border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs shrink-0">
        <span className="text-slate-400 font-mono text-[11px] flex items-center gap-1.5">
          <PhoneCall className="h-3.5 w-3.5 text-rose-500 animate-pulse" />
          <span>Hotline Darurat 24 Jam:</span>
        </span>
        <div className="flex flex-wrap items-center gap-2 font-mono text-[11px] sm:text-xs">
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
      <div className="flex-1 min-h-0 overflow-y-auto space-y-4 mb-3 pr-2 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
        {messages.map((m) => {
          const isUser = m.role === "user";
          return (
            <div
              key={m.id}
              className={cn(
                "flex gap-3 max-w-[95%] sm:max-w-[88%] md:max-w-[82%]",
                isUser ? "ml-auto flex-row-reverse" : "mr-auto"
              )}
            >
              <div
                className={cn(
                  "h-9 w-9 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold shadow-md",
                  isUser
                    ? "bg-slate-800 text-slate-200 border border-slate-700"
                    : "bg-rose-600 text-white shadow-rose-600/20"
                )}
              >
                {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
              </div>

              <div className="min-w-0 flex-1">
                <div
                  className={cn(
                    "p-4 sm:p-5 rounded-2xl text-xs sm:text-sm md:text-base leading-relaxed border shadow-md break-words",
                    isUser
                      ? "bg-slate-900 border-slate-800 text-slate-100 rounded-tr-none ml-auto w-fit"
                      : "bg-slate-900/90 border-slate-800/90 text-slate-200 rounded-tl-none whitespace-pre-wrap"
                  )}
                >
                  {isUser ? m.content : cleanOutputText(m.content)}
                </div>
                <div
                  className={cn(
                    "text-[10px] text-slate-500 mt-1.5 font-mono px-1",
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
          <div className="flex gap-3 max-w-[90%] sm:max-w-[80%] mr-auto items-center">
            <div className="h-9 w-9 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0">
              <Bot className="h-4 w-4 animate-spin" />
            </div>
            <div className="px-4 py-3 rounded-2xl bg-slate-900 border border-slate-800 text-xs sm:text-sm text-slate-300 flex items-center gap-2.5">
              <Loader2 className="h-4 w-4 animate-spin text-rose-500" />
              <span>AI sedang menganalisis mitigasi...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Prompt Chips */}
      <div className="mb-2.5 flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none shrink-0">
        <span className="text-[11px] font-mono text-slate-500 shrink-0 flex items-center gap-1 mr-1">
          <Sparkles className="h-3 w-3 text-rose-400" />
          <span>Saran:</span>
        </span>
        {SUGGESTIONS.map((sug, i) => (
          <button
            key={i}
            onClick={() => handleSend(sug)}
            className="text-[11px] sm:text-xs px-3 py-1.5 rounded-full bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 transition-all whitespace-nowrap shrink-0 cursor-pointer"
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
        className="flex items-center gap-2 bg-slate-900/95 border border-slate-800 p-2 sm:p-2.5 rounded-2xl focus-within:border-rose-500/50 shadow-2xl shrink-0"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Tanyakan protokol evakuasi, zona bahaya gempa, atau tas darurat..."
          disabled={loading}
          className="flex-1 bg-transparent px-3 sm:px-4 py-2 text-xs sm:text-sm md:text-base text-slate-100 placeholder:text-slate-500 focus:outline-none"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="p-2.5 sm:px-4 sm:py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-40 disabled:hover:bg-rose-600 text-white transition-all shadow-md shadow-rose-600/30 flex items-center justify-center gap-1.5 text-xs sm:text-sm font-semibold shrink-0 cursor-pointer"
        >
          <Send className="h-4 w-4" />
          <span className="hidden sm:inline">Kirim</span>
        </button>
      </form>
    </div>
  );
}
