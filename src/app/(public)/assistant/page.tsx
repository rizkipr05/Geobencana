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
import { useTheme } from "@/context/theme-context";

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
  const { isDark } = useTheme();
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
    document.title = "AI Disaster Assistant | DISASTRA AI";
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
    <div
      className={cn(
        "w-full max-w-6xl xl:max-w-7xl mx-auto h-full flex flex-col p-3 sm:p-5 lg:p-6 transition-colors duration-200",
        isDark ? "bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-900"
      )}
    >
      {/* Header */}
      <div
        className={cn(
          "flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3 border-b pb-3 shrink-0",
          isDark ? "border-slate-800" : "border-slate-200"
        )}
      >
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <span className="p-1 rounded bg-rose-500/10 text-rose-500 border border-rose-500/20">
              <Bot className="h-4 w-4" />
            </span>
            <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-rose-500">
              DISASTER MITIGATION CO-PILOT
            </span>
          </div>
          <h1 className={cn("text-xl sm:text-2xl font-black", isDark ? "text-white" : "text-slate-900")}>
            AI Disaster &amp; Evacuation Assistant
          </h1>
          <p className={cn("text-xs mt-0.5 hidden sm:block", isDark ? "text-slate-400" : "text-slate-600")}>
            Panduan cerdas tanggap darurat, analisis bahaya, dan rute evakuasi berbasis standar Sendai Framework.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isAiLive !== null && (
            <span
              className={cn(
                "px-2.5 py-1 rounded-full text-[11px] font-mono font-semibold flex items-center gap-1.5 border shadow-sm",
                isAiLive
                  ? isDark
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                    : "bg-emerald-50 border-emerald-300 text-emerald-700"
                  : isDark
                  ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                  : "bg-amber-50 border-amber-300 text-amber-700"
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
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs transition-all cursor-pointer",
              isDark
                ? "bg-slate-900 hover:bg-slate-850 border-slate-800 text-slate-400 hover:text-slate-200"
                : "bg-white hover:bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900 shadow-sm"
            )}
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Reset Chat</span>
          </button>
        </div>
      </div>

      {/* Notice if Gemini Key not yet configured */}
      {isAiLive === false && (
        <div className="mb-2.5 p-2.5 sm:p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-600 dark:text-amber-300/90 flex items-start gap-2.5 shrink-0">
          <Sparkles className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <span className="font-bold text-amber-600 dark:text-amber-300 block">Google Gemini API Belum Dikonfigurasi</span>
            <span className="text-[11px] text-amber-700 dark:text-amber-200/80 leading-relaxed block mt-0.5">
              Assistant saat ini menggunakan pangkalan pengetahuan darurat offline. Tambahkan <code className="bg-amber-100 dark:bg-amber-950/80 px-1 py-0.5 rounded text-amber-700 dark:text-amber-300 font-mono">GEMINI_API_KEY</code> di berkas <code className="bg-amber-100 dark:bg-amber-950/80 px-1 py-0.5 rounded text-amber-700 dark:text-amber-300 font-mono">.env.local</code> untuk mengaktifkan kecerdasan penuh Google Gemini.
            </span>
          </div>
        </div>
      )}

      {/* Emergency Hotlines Strip */}
      <div
        className={cn(
          "mb-3 px-3 py-2 rounded-xl border flex flex-wrap items-center justify-between gap-2 text-xs shrink-0",
          isDark ? "bg-slate-900/60 border-slate-800/80" : "bg-white border-slate-200 shadow-sm"
        )}
      >
        <span className={cn("font-mono text-[11px] flex items-center gap-1.5", isDark ? "text-slate-400" : "text-slate-600")}>
          <PhoneCall className="h-3.5 w-3.5 text-rose-500 animate-pulse" />
          <span>Hotline Darurat 24 Jam:</span>
        </span>
        <div className="flex flex-wrap items-center gap-2 font-mono text-[11px] sm:text-xs">
          <span className="px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/20 text-rose-500 font-bold">
            BNPB: 117
          </span>
          <span className="px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 font-bold">
            BASARNAS: 115
          </span>
          <span className="px-2 py-0.5 rounded bg-sky-500/10 border border-sky-500/20 text-sky-600 dark:text-sky-400 font-bold">
            Ambulans: 118 / 119
          </span>
          <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold">
            Polisi: 110
          </span>
        </div>
      </div>

      {/* Chat Messages Container */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-4 mb-3 pr-2 scrollbar-thin scrollbar-thumb-slate-400 dark:scrollbar-thumb-slate-800 scrollbar-track-transparent">
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
                    ? isDark
                      ? "bg-slate-800 text-slate-200 border border-slate-700"
                      : "bg-slate-200 text-slate-700 border border-slate-300"
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
                      ? isDark
                        ? "bg-slate-900 border-slate-800 text-slate-100 rounded-tr-none ml-auto w-fit"
                        : "bg-rose-600 border-rose-500 text-white rounded-tr-none ml-auto w-fit"
                      : isDark
                      ? "bg-slate-900/90 border-slate-800/90 text-slate-200 rounded-tl-none whitespace-pre-wrap"
                      : "bg-white border-slate-200 text-slate-800 rounded-tl-none whitespace-pre-wrap shadow-sm"
                  )}
                >
                  {isUser ? m.content : cleanOutputText(m.content)}
                </div>
                <div
                  className={cn(
                    "text-[10px] mt-1.5 font-mono px-1",
                    isDark ? "text-slate-500" : "text-slate-400",
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
            <div
              className={cn(
                "px-4 py-3 rounded-2xl border text-xs sm:text-sm flex items-center gap-2.5",
                isDark ? "bg-slate-900 border-slate-800 text-slate-300" : "bg-white border-slate-200 text-slate-700 shadow-sm"
              )}
            >
              <Loader2 className="h-4 w-4 animate-spin text-rose-500" />
              <span>AI sedang menganalisis mitigasi...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Prompt Chips */}
      <div className="mb-2.5 flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none shrink-0">
        <span className={cn("text-[11px] font-mono shrink-0 flex items-center gap-1 mr-1", isDark ? "text-slate-500" : "text-slate-400")}>
          <Sparkles className="h-3 w-3 text-rose-500" />
          <span>Saran:</span>
        </span>
        {SUGGESTIONS.map((sug, i) => (
          <button
            key={i}
            onClick={() => handleSend(sug)}
            className={cn(
              "text-[11px] sm:text-xs px-3 py-1.5 rounded-full border transition-all whitespace-nowrap shrink-0 cursor-pointer",
              isDark
                ? "bg-slate-900 hover:bg-slate-850 border-slate-800 text-slate-400 hover:text-slate-200"
                : "bg-white hover:bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900 shadow-sm"
            )}
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
        className={cn(
          "flex items-center gap-2 p-2 sm:p-2.5 rounded-2xl focus-within:border-rose-500/50 shadow-xl shrink-0 transition-all border",
          isDark ? "bg-slate-900/95 border-slate-800" : "bg-white border-slate-200"
        )}
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Tanyakan protokol evakuasi, zona bahaya gempa, atau tas darurat..."
          disabled={loading}
          className={cn(
            "flex-1 bg-transparent px-3 sm:px-4 py-2 text-xs sm:text-sm md:text-base focus:outline-none",
            isDark ? "text-slate-100 placeholder:text-slate-500" : "text-slate-900 placeholder:text-slate-400"
          )}
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
