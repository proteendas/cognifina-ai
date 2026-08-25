"use client";

import { useCallback, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FileText, UploadCloud, X } from "lucide-react";
import { formatBytes } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export type StagedFile = { file: File; id: string };

export function FileDropzone({
  files,
  onChange,
  disabled,
}: {
  files: StagedFile[];
  onChange: (files: StagedFile[]) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const addFiles = useCallback(
    (list: FileList | null) => {
      if (!list || list.length === 0) return;
      const next = [...files];
      for (const f of Array.from(list)) {
        next.push({ file: f, id: `${f.name}-${f.size}-${Math.random().toString(36).slice(2, 8)}` });
      }
      onChange(next.slice(0, 12));
    },
    [files, onChange]
  );

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload documents"
        onClick={() => !disabled && inputRef.current?.click()}
        onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (!disabled) addFiles(e.dataTransfer.files);
        }}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors",
          dragging ? "border-accent bg-accent-soft" : "border-line-strong bg-surface hover:border-ink-4/50 hover:bg-paper-2",
          disabled && "pointer-events-none opacity-50"
        )}
      >
        <motion.div
          animate={dragging ? { scale: 1.12, y: -4 } : { scale: 1, y: 0 }}
          transition={{ type: "spring", bounce: 0.35, duration: 0.4 }}
          className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-accent-soft text-accent"
        >
          <UploadCloud size={22} />
        </motion.div>
        <p className="text-[14px] font-medium text-ink">Drop documents here</p>
        <p className="mt-1 font-secondary text-[12px] leading-relaxed text-ink-4">
          PDF · XLSX · CSV · DOCX · TXT — up to 12 files, 25&nbsp;MB each
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".pdf,.xlsx,.xls,.csv,.docx,.txt,.md"
          className="hidden"
          onChange={(e) => addFiles(e.target.files)}
        />
      </div>

      <AnimatePresence>
        {files.length > 0 && (
          <motion.ul
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-3 space-y-1.5"
          >
            {files.map((f) => (
              <motion.li
                key={f.id}
                layout
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8 }}
                transition={{ type: "spring", bounce: 0, duration: 0.35 }}
                className="flex items-center gap-3 rounded-lg border border-line bg-surface px-3.5 py-2.5 shadow-soft"
              >
                <FileText size={15} className="shrink-0 text-accent" />
                <span className="min-w-0 flex-1 truncate text-[13px] text-ink">{f.file.name}</span>
                <span className="tnum shrink-0 font-secondary text-[11px] text-ink-4">{formatBytes(f.file.size)}</span>
                <button
                  onClick={() => onChange(files.filter((x) => x.id !== f.id))}
                  aria-label={`Remove ${f.file.name}`}
                  className="pressable rounded-md p-1 text-ink-4 hover:bg-danger-soft hover:text-danger"
                >
                  <X size={13} />
                </button>
              </motion.li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

export function UploadingOverlay({ progress, label }: { progress: number; label: string }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-[13px]">
        <span className="font-medium text-ink">{label}</span>
        <span className="tnum text-ink-4">{progress}%</span>
      </div>
      <Progress value={progress} />
    </div>
  );
}
