"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useEffect } from "react";
import { cn } from "@/lib/utils";

/**
 * Right-side drawer (Apple-style sheet): enters/exits along the same path,
 * critically-damped spring, dimming scrim, focus on the floating layer.
 */
export function Sheet({
  open,
  onClose,
  title,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50">
          <motion.div
            className="absolute inset-0 bg-[#1a1d1f]/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            onClick={onClose}
          />
          <motion.div
            className={cn(
              "absolute inset-y-4 right-4 flex flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-pop",
              wide ? "w-[min(720px,calc(100vw-2rem))]" : "w-[min(480px,calc(100vw-2rem))]"
            )}
            initial={{ x: "110%", opacity: 0.6 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "110%", opacity: 0.6 }}
            transition={{ type: "spring", bounce: 0, duration: 0.45 }}
          >
            <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
              <h2 className="text-sm font-semibold tracking-tight text-ink">{title}</h2>
              <button
                onClick={onClose}
                aria-label="Close"
                className="pressable rounded-lg p-1.5 text-ink-4 hover:bg-paper-2 hover:text-ink"
              >
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export function Dialog({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            className="absolute inset-0 bg-[#1a1d1f]/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="w-full max-w-md rounded-2xl border border-line bg-surface p-6 shadow-pop"
            initial={{ scale: 0.94, y: 12, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.96, y: 8, opacity: 0 }}
            transition={{ type: "spring", bounce: 0, duration: 0.35 }}
            style={{ transformOrigin: "top center" }}
          >
            {title && <h2 className="mb-4 text-lg font-bold tracking-tight text-ink">{title}</h2>}
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
