"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Quote, Send, Sparkles, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { Markdown } from "@/components/ui/markdown";
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
      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto rounded-xl border border-line bg-surface p-5 shadow-soft">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-4 py-10 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent-soft text-accent">
              <Sparkles size={20} />
            </span>
            <div>
              <p className="text-[15px] font-semibold text-ink">Interrogate the evidence</p>
              <p className="mx-auto mt-1 max-w-md font-secondary text-[13px] leading-relaxed text-ink-3">
                Answers are grounded strictly in this run&apos;s extracted passages and computed metrics. When evidence is
                missing, the assistant says so — it never speculates.
              </p>
            </div>
            <div className="flex max-w-lg flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="pressable rounded-full border border-line-strong bg-surface px-3.5 py-1.5 font-secondary text-[12px] text-ink-2 transition-colors hover:border-accent/40 hover:bg-accent-soft hover:text-accent"
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
              <span className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
                <Sparkles size={13} />
              </span>
            )}
            <div className={cn("max-w-[78%] space-y-2", m.role === "user" && "order-first")}>
              <div
                className={cn(
                  "rounded-2xl px-4 py-3 text-[13.5px] leading-relaxed",
                  m.role === "user"
                    ? "bg-accent text-white shadow-soft"
                    : "border border-line bg-paper-2 text-ink-2"
                )}
              >
                {m.role === "assistant" ? (
                  <Markdown>{m.content}</Markdown>
                ) : (
                  <p className="whitespace-pre-wrap">{m.content}</p>
                )}
              </div>
              {m.citations.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {m.citations.map((c, ci) => (
                    <button
                      key={ci}
                      onClick={() => onOpenCitation(c)}
                      className="pressable flex items-center gap-1 rounded-full border border-line bg-paper-2 px-2.5 py-1 text-[11px] text-ink-3 transition-colors hover:border-accent/40 hover:text-accent"
                    >
                      <Quote size={10} />
                      <span className="max-w-[220px] truncate">{c.documentName}</span>
                      <span className="tnum text-ink-4">p.{c.pageNumber}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {m.role === "user" && (
              <span className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-line bg-paper-2 text-ink-3">
                <User size={13} />
              </span>
            )}
          </motion.div>
        ))}

        {busy && (
          <div className="flex items-center gap-2 font-secondary text-[13px] text-ink-4">
            <span className="h-2 w-2 animate-pulse-soft rounded-full bg-accent" />
            Retrieving from evidence pack…
          </div>
        )}
        {error && <p className="font-secondary text-[13px] text-danger">{error}</p>}
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
