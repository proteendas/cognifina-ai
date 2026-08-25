"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, CheckCheck } from "lucide-react";
import { api } from "@/lib/client";
import type { AuditEventDto } from "@/lib/types";
import { cn, timeAgo } from "@/lib/utils";

const LABELS: Record<string, string> = {
  "run.created": "Run started",
  "run.completed": "Run completed",
  "run.failed": "Run failed",
  "key.saved": "API key saved",
  "key.removed": "API key removed",
  "profile.renamed": "Profile updated",
  "password.changed": "Password changed",
  "preferences.updated": "Preferences updated",
};

/**
 * Notification bell fed by the account's audit trail (run lifecycle + security
 * events). Read state is local (localStorage) — the trail itself is server-side.
 */
export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [events, setEvents] = useState<AuditEventDto[] | null>(null);
  const [lastSeen, setLastSeen] = useState<string>(() => (typeof window !== "undefined" ? (localStorage.getItem("cognifina-notif-seen") ?? "") : ""));
  const rootRef = useRef<HTMLDivElement>(null);

  const load = () =>
    api.stats
      .get()
      .then((s) => setEvents(s.events.filter((e) => e.action.startsWith("run.") || e.action.startsWith("key.") || e.action.startsWith("password."))))
      .catch(() => setEvents([]));

  useEffect(() => {
    void load();
    const t = setInterval(() => void load(), 60_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const unread = (events ?? []).filter((e) => e.createdAt > lastSeen).length;

  const markAllSeen = () => {
    const latest = events?.[0]?.createdAt ?? new Date().toISOString();
    setLastSeen(latest);
    localStorage.setItem("cognifina-notif-seen", latest);
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={`Notifications${unread ? ` (${unread} unread)` : ""}`}
        className="pressable relative flex h-9 w-9 items-center justify-center rounded-lg text-ink-3 transition-colors hover:bg-paper-2 hover:text-ink"
      >
        <Bell size={17} />
        {unread > 0 && (
          <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[9.5px] font-bold leading-none text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.97 }}
            transition={{ type: "spring", bounce: 0, duration: 0.3 }}
            className="absolute bottom-0 left-0 z-50 w-80 origin-bottom-left overflow-hidden rounded-xl border border-line bg-surface shadow-pop md:left-0"
          >
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <p className="text-[13px] font-semibold text-ink">Notifications</p>
              {unread > 0 && (
                <button onClick={markAllSeen} className="pressable flex items-center gap-1 text-[11.5px] font-medium text-accent hover:underline">
                  <CheckCheck size={12} /> Mark all read
                </button>
              )}
            </div>
            <div className="max-h-80 overflow-y-auto">
              {events == null ? (
                <p className="px-4 py-8 text-center font-secondary text-[12.5px] text-ink-4">Loading…</p>
              ) : events.length === 0 ? (
                <p className="px-4 py-8 text-center font-secondary text-[12.5px] text-ink-4">
                  Run completions, failures and security events will appear here.
                </p>
              ) : (
                events.slice(0, 15).map((e) => {
                  const isUnread = e.createdAt > lastSeen;
                  const failed = e.action === "run.failed";
                  return (
                    <div key={e.id} className={cn("flex items-start gap-2.5 border-b border-line px-4 py-2.5 last:border-0", isUnread && "bg-accent-soft/40")}>
                      <span
                        className={cn(
                          "mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full",
                          failed ? "bg-danger" : e.action === "run.completed" ? "bg-success" : "bg-ink-4/50"
                        )}
                      />
                      <div className="min-w-0 flex-1 leading-snug">
                        <p className="truncate text-[12.5px] font-medium text-ink">{LABELS[e.action] ?? e.action}</p>
                        {e.detail && <p className="truncate font-secondary text-[11px] text-ink-4">{e.detail}</p>}
                      </div>
                      <time className="tnum shrink-0 pt-0.5 text-[10.5px] text-ink-4">{timeAgo(e.createdAt)}</time>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
