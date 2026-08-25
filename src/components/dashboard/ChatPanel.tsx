"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Quote, Send, Sparkles, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { api } from "@/lib/client";
import type { ChatCitationDto, ChatMessageDto } from "@/lib/types";
import { cn } from "@/lib/utils";

const SUGGESTIONS = [
  "What are the most severe findings and why?",
  "Summarize the Benford test result.",
  "Which documents show reconciliation mismatches?",
  "What evidence supports the M-Score?",
];

export function ChatPanel({
  runId,
  initialHistory,
  onOpenCitation,
}: {
  runId: string;
  initialHistory: ChatMessageDto[];
  onOpenCitation: (c: ChatCitationDto) => void;
}) {
  const [messages, setMessages] = useState<ChatMessageDto[]>(initialHistory);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, busy]);

  const send = async (text: string) => {
    const q = text.trim();
    if (!q || busy) return;
    setMessages((m) => [...m, { role: "user", content: q, citations: [] }]);
    setInput("");
    setBusy(true);
    setError(null);
    try {
      const res = await api.runs.chat(runId, q);
      setMessages((m) => [...m, { role: "assistant", content: res.content, citations: res.citations }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chat failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex h-full min-h-[520px] flex-col">
      <div ref={scrollRef} className="material flex-1 space-y-4 overflow-y-auto rounded-2xl p-5">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-4 py-10 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/15 text-indigo-300">
              <Sparkles size={20} />
            </span>
            <div>
              <p className="text-[15px] font-semibold text-slate-200">Interrogate the evidence</p>
              <p className="mx-auto mt-1 max-w-md text-[13px] leading-relaxed text-slate-500">
                Answers are grounded strictly in this run&apos;s extracted passages and computed metrics. When evidence is
                missing, the assistant says so — it never speculates.
              </p>
            </div>
            <div className="flex max-w-lg flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="pressable rounded-full border border-white/12 px-3.5 py-1.5 text-[12px] text-slate-300 hover:border-indigo-400/40 hover:bg-indigo-500/8"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", bounce: 0, duration: 0.35 }}
            className={cn("flex gap-3", m.role === "user" ? "justify-end" : "justify-start")}
          >
            {m.role === "assistant" && (
              <span className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-500/15 text-indigo-300">
                <Sparkles size={13} />
              </span>
            )}
            <div className={cn("max-w-[78%] space-y-2", m.role === "user" && "order-first")}>
              <div
                className={cn(
                  "rounded-2xl px-4 py-3 text-[13.5px] leading-relaxed",
                  m.role === "user"
                    ? "bg-gradient-to-b from-indigo-500 to-indigo-600 text-white"
                    : "border border-white/8 bg-white/[0.04] text-slate-200"
                )}
              >
                <p className="whitespace-pre-wrap">{m.content}</p>
              </div>
              {m.citations.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {m.citations.map((c, ci) => (
                    <button
                      key={ci}
                      onClick={() => onOpenCitation(c)}
                      className="pressable flex items-center gap-1 rounded-full border border-white/12 bg-white/[0.04] px-2.5 py-1 text-[11px] text-slate-300 hover:border-indigo-400/50 hover:text-white"
                    >
                      <Quote size={10} />
                      <span className="max-w-[220px] truncate">{c.documentName}</span>
                      <span className="tnum text-slate-500">p.{c.pageNumber}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {m.role === "user" && (
              <span className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/8 text-slate-300">
                <User size={13} />
              </span>
            )}
          </motion.div>
        ))}

        {busy && (
          <div className="flex items-center gap-2 text-[13px] text-slate-400">
            <span className="h-2 w-2 animate-pulse-soft rounded-full bg-indigo-400" />
            Retrieving from evidence pack…
          </div>
        )}
        {error && <p className="text-[13px] text-rose-300">{error}</p>}
      </div>

      <form
        className="mt-3 flex items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <Textarea
          rows={1}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(input);
            }
          }}
          placeholder="Ask about this run… answers cite exact pages."
          className="min-h-11 flex-1"
        />
        <Button type="submit" disabled={busy || !input.trim()} aria-label="Send" size="md" className="h-11 w-11 p-0">
          <Send size={16} />
        </Button>
      </form>
    </div>
  );
}
