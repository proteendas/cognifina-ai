"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Custom listbox dropdown — replaces the native <select> so styling stays
 * consistent across browsers. Supports click-outside, Escape, arrow keys,
 * Enter/Space to open & confirm.
 */
export function Select({
  options,
  value,
  onChange,
  id,
  placeholder = "Select…",
  className,
}: {
  options: string[];
  value: string;
  onChange: (value: string) => void;
  id?: string;
  placeholder?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const listboxId = useId().replace(/[^a-zA-Z0-9-]/g, "");

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  useEffect(() => {
    if (open) setActive(Math.max(0, options.indexOf(value)));
  }, [open, options, value]);

  const commit = (opt: string) => {
    onChange(opt);
    setOpen(false);
  };

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        id={id}
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        aria-haspopup="listbox"
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (!open && (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            setOpen(true);
          } else if (e.key === "Escape") {
            setOpen(false);
          } else if (open && e.key === "ArrowDown") {
            e.preventDefault();
            setActive((a) => Math.min(options.length - 1, a + 1));
          } else if (open && e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => Math.max(0, a - 1));
          } else if (open && e.key === "Enter") {
            e.preventDefault();
            commit(options[active]);
          }
        }}
        onBlur={(e) => {
          if (!rootRef.current?.contains(e.relatedTarget as Node)) setOpen(false);
        }}
        className={cn(
          "flex h-10 w-full items-center justify-between gap-2 rounded-lg border bg-surface px-3.5 text-left text-sm outline-none transition",
          value ? "text-ink" : "text-ink-4",
          open
            ? "border-accent/50 ring-2 ring-accent/15"
            : "border-line-strong shadow-[0_1px_2px_rgba(26,29,31,0.03)] hover:border-ink-4/50"
        )}
      >
        <span className="truncate">{value || placeholder}</span>
        <ChevronDown size={14} className={cn("shrink-0 text-ink-4 transition-transform duration-200", open && "rotate-180")} />
      </button>

      {open && (
        <ul
          id={listboxId}
          role="listbox"
          aria-labelledby={id}
          className="absolute z-30 mt-1.5 max-h-60 w-full overflow-y-auto rounded-lg border border-line bg-surface p-1 shadow-pop"
        >
          {options.map((opt, i) => (
            <li key={opt}>
              <button
                type="button"
                role="option"
                aria-selected={opt === value}
                onMouseEnter={() => setActive(i)}
                onClick={() => commit(opt)}
                className={cn(
                  "flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left font-sans text-[13.5px] transition-colors",
                  i === active ? "bg-paper-2 text-ink" : "text-ink-2",
                  opt === value && "font-medium"
                )}
              >
                <span className="truncate">{opt}</span>
                {opt === value && <Check size={13} className="shrink-0 text-accent" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
