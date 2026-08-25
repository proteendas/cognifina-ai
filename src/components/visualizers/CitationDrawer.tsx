"use client";

import { useEffect, useState } from "react";
import { FileText, Hash, Loader2, MapPin } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/client";

export type CitationTarget = {
  documentName: string;
  documentId?: string | null;
  pageNumber: number;
  rawExcerpt: string;
  bbox?: [number, number, number, number] | null;
  confidence?: number;
};

type Block = { id: string; seq: number; text: string; bbox: [number, number, number, number]; source: string };

/**
 * Citation drawer with page reconstruction:
 * re-renders the extracted text layer of the cited page and highlights the
 * exact bounding box of the evidence.
 */
export function CitationDrawer({
  citation,
  onClose,
}: {
  citation: CitationTarget | null;
  onClose: () => void;
}) {
  const [blocks, setBlocks] = useState<Block[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!citation?.documentId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    api.documents
      .pageBlocks(citation.documentId, citation.pageNumber)
      .then((res) => !cancelled && setBlocks(res.blocks))
      .catch((e: Error) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [citation?.documentId, citation?.pageNumber]);

  const hasGeometry =
    blocks != null &&
    blocks.some((b) => b.bbox[2] > b.bbox[0]) &&
    citation?.bbox != null &&
    citation.bbox[2] > citation.bbox[0];

  // Bounds for normalizing coordinates
  const bounds = hasGeometry
    ? blocks!.reduce(
        (acc, b) => ({
          minX: Math.min(acc.minX, b.bbox[0]),
          minY: Math.min(acc.minY, b.bbox[1]),
          maxX: Math.max(acc.maxX, b.bbox[2]),
          maxY: Math.max(acc.maxY, b.bbox[3]),
        }),
        { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity }
      )
    : null;
  const pad = 24;

  return (
    <Sheet open={citation != null} onClose={onClose} title="Evidence Citation" wide>
      {citation && (
        <div className="space-y-5">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge>
                <FileText size={11} /> {citation.documentName}
              </Badge>
              <Badge>Page {citation.pageNumber}</Badge>
              {typeof citation.confidence === "number" && (
                <Badge>{(citation.confidence * 100).toFixed(0)}% confidence</Badge>
              )}
            </div>
            <blockquote className="rounded-xl border-l-[3px] border-indigo-400/70 bg-white/[0.04] px-4 py-3 text-[13.5px] leading-relaxed text-slate-200">
              “{citation.rawExcerpt}”
            </blockquote>
          </div>

          <div>
            <h3 className="mb-2 flex items-center gap-1.5 text-[13px] font-semibold text-slate-300">
              <MapPin size={13} className="text-indigo-300" /> Page reconstruction
            </h3>
            {loading ? (
              <div className="flex h-48 items-center justify-center rounded-xl border border-white/8 text-slate-400">
                <Loader2 className="animate-spin" size={18} />
              </div>
            ) : error || !blocks || blocks.length === 0 ? (
              <div className="rounded-xl border border-dashed border-white/12 px-4 py-8 text-center text-[13px] text-slate-500">
                {error ?? "This document has no extractable text on the cited page (scanned image)."}
              </div>
            ) : bounds && hasGeometry ? (
              <div
                className="relative overflow-hidden rounded-xl border border-white/8 bg-ink-950/80"
                style={{
                  height: 380,
                }}
              >
                <div
                  className="absolute origin-top-left"
                  style={{ transform: `scale(${Math.min(640 / (bounds.maxX - bounds.minX + pad * 2), 380 / (bounds.maxY - bounds.minY + pad * 2))})` }}
                >
                  {blocks.map((b) => {
                    const x = b.bbox[0] - (bounds.minX - pad);
                    const y = b.bbox[1] - (bounds.minY - pad);
                    const w = b.bbox[2] - b.bbox[0];
                    const h = b.bbox[3] - b.bbox[1];
                    const isTarget =
                      !!citation.bbox &&
                      Math.abs(b.bbox[1] - citation.bbox[1]) < 6 &&
                      Math.abs(b.bbox[0] - citation.bbox[0]) < 30;
                    return (
                      <div
                        key={b.id}
                        className={`absolute whitespace-pre rounded ${isTarget ? "bg-indigo-500/25 ring-2 ring-indigo-400 animate-pulse-soft" : "text-slate-400"}`}
                        style={{ left: x, top: y, width: Math.max(w, 10), minHeight: h }}
                      >
                        <span className="text-[9px] leading-tight">{b.text}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="max-h-[380px] space-y-2 overflow-y-auto rounded-xl border border-white/8 p-4">
                {blocks.slice(0, 60).map((b) => (
                  <p key={b.id} className="text-[12.5px] leading-relaxed text-slate-400">
                    {b.text}
                  </p>
                ))}
              </div>
            )}
          </div>

          <p className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <Hash size={11} /> Coordinates are stored per extraction block — citations are reproducible across runs.
          </p>
        </div>
      )}
    </Sheet>
  );
}
