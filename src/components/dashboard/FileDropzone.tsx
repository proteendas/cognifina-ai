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
          "flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-10 text-center transition",
          dragging ? "border-indigo-400 bg-indigo-500/8" : "border-white/12 bg-white/[0.02] hover:border-white/25",
          disabled && "pointer-events-none opacity-50"
        )}
      >
        <motion.div
          animate={dragging ? { scale: 1.12, y: -4 } : { scale: 1, y: 0 }}
          transition={{ type: "spring", bounce: 0.35, duration: 0.4 }}
          className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/15 text-indigo-300"
        >
          <UploadCloud size={22} />
        </motion.div>
        <p className="text-[14px] font-medium text-slate-200">Drop documents here</p>
        <p className="mt-1 text-[12px] text-slate-500">
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
                className="material flex items-center gap-3 rounded-xl px-3.5 py-2.5"
              >
                <FileText size={15} className="shrink-0 text-indigo-300" />
                <span className="min-w-0 flex-1 truncate text-[13px] text-slate-200">{f.file.name}</span>
                <span className="tnum shrink-0 text-[11px] text-slate-500">{formatBytes(f.file.size)}</span>
                <button
                  onClick={() => onChange(files.filter((x) => x.id !== f.id))}
                  aria-label={`Remove ${f.file.name}`}
                  className="pressable rounded-md p-1 text-slate-500 hover:bg-white/8 hover:text-white"
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
        <span className="font-medium text-slate-200">{label}</span>
        <span className="tnum text-slate-400">{progress}%</span>
      </div>
      <Progress value={progress} />
    </div>
  );
}
