"use client";

import { useRun } from "@/components/dashboard/RunContext";
import { ChatPanel } from "@/components/dashboard/ChatPanel";

export default function RunChatPage() {
  const { data, openCitation } = useRun();
  if (!data) return null;
  return (
    <ChatPanel
      runId={data.run.id}
      initialHistory={data.chat}
      onOpenCitation={(c) =>
        openCitation({
          documentName: c.documentName,
          documentId: c.documentId,
          pageNumber: c.pageNumber,
          rawExcerpt: c.excerpt,
          bbox: (c.bbox as [number, number, number, number] | null) ?? null,
          confidence: undefined,
        })
      }
    />
  );
}
